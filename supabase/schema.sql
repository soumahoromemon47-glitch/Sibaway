create extension if not exists pgcrypto;

create type public.app_role as enum ('Administrateur', 'Employé');
create type public.stock_movement_type as enum (
  'Réception',
  'Vente',
  'Perte',
  'Casse',
  'Retour',
  'Ajustement d’inventaire'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'Employé',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  sku text not null unique check (length(trim(sku)) between 1 and 40),
  category text not null,
  brand text not null default '',
  photo_url text,
  purchase_price bigint not null default 0 check (purchase_price >= 0),
  selling_price bigint not null default 0 check (selling_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  alert_threshold integer not null default 0 check (alert_threshold >= 0),
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_sku text not null,
  type public.stock_movement_type not null,
  quantity integer not null,
  occurred_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles (id),
  note text not null default '',
  supplier text,
  inventory_session_id uuid,
  created_at timestamptz not null default now(),
  constraint stock_movement_quantity_valid check (
    (type = 'Ajustement d’inventaire' and quantity <> 0)
    or (type <> 'Ajustement d’inventaire' and quantity > 0)
  )
);

create table public.inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status text not null default 'En cours' check (status in ('En cours', 'Validé')),
  created_by uuid not null default auth.uid() references public.profiles (id),
  started_at timestamptz not null default now(),
  validated_at timestamptz
);

create table public.inventory_lines (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.inventory_sessions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_sku text not null,
  expected_quantity integer not null check (expected_quantity >= 0),
  counted_quantity integer not null check (counted_quantity >= 0),
  unique (session_id, product_sku)
);

alter table public.stock_movements
  add constraint stock_movements_inventory_session_fk
  foreign key (inventory_session_id) references public.inventory_sessions (id) on delete set null;

create index products_category_idx on public.products (category);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', name || ' ' || sku || ' ' || brand));
create index products_low_stock_idx on public.products (quantity, alert_threshold);
create index stock_movements_product_date_idx on public.stock_movements (product_id, occurred_at desc);
create index stock_movements_type_date_idx on public.stock_movements (type, occurred_at desc);
create index inventory_sessions_started_at_idx on public.inventory_sessions (started_at desc);
create index inventory_lines_session_idx on public.inventory_lines (session_id);

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'Administrateur'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and (select auth.uid()) is not null
    and not public.is_administrator() then
    raise exception 'Seul un administrateur peut modifier les rôles.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update of role on public.profiles
for each row execute function public.prevent_profile_role_change();

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.prevent_direct_stock_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.quantity is distinct from old.quantity
    and current_setting('app.stock_update', true) is distinct from 'on' then
    raise exception 'Le stock doit être modifié par un mouvement.';
  end if;
  return new;
end;
$$;

create trigger products_stock_guard
before update of quantity on public.products
for each row execute function public.prevent_direct_stock_change();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stock_delta integer;
  updated_rows integer;
begin
  if new.product_id is null then
    raise exception 'Un produit doit être associé au mouvement.';
  end if;

  if new.type in ('Réception', 'Retour') then
    stock_delta := new.quantity;
  elsif new.type = 'Ajustement d’inventaire' then
    stock_delta := new.quantity;
  else
    stock_delta := -new.quantity;
  end if;

  perform set_config('app.stock_update', 'on', true);
  update public.products
  set quantity = quantity + stock_delta
  where id = new.product_id and quantity + stock_delta >= 0;
  get diagnostics updated_rows = row_count;
  perform set_config('app.stock_update', 'off', true);

  if updated_rows = 0 then
    if not exists (select 1 from public.products where id = new.product_id) then
      raise exception 'Produit introuvable.';
    end if;
    raise exception 'Stock insuffisant : le mouvement ferait passer le stock sous zéro.';
  end if;

  select name, sku into new.product_name, new.product_sku
  from public.products where id = new.product_id;
  return new;
end;
$$;

create trigger stock_movement_apply
before insert on public.stock_movements
for each row execute function public.apply_stock_movement();

create or replace function public.reverse_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stock_delta integer;
  updated_rows integer;
begin
  if old.product_id is null then
    return old;
  end if;

  if old.type in ('Réception', 'Retour') then
    stock_delta := -old.quantity;
  elsif old.type = 'Ajustement d’inventaire' then
    stock_delta := -old.quantity;
  else
    stock_delta := old.quantity;
  end if;

  perform set_config('app.stock_update', 'on', true);
  update public.products
  set quantity = quantity + stock_delta
  where id = old.product_id and quantity + stock_delta >= 0;
  get diagnostics updated_rows = row_count;
  perform set_config('app.stock_update', 'off', true);

  if updated_rows = 0 then
    raise exception 'Ce mouvement ne peut pas être supprimé : le stock deviendrait négatif.';
  end if;
  return old;
end;
$$;

create trigger stock_movement_reverse
after delete on public.stock_movements
for each row execute function public.reverse_stock_movement();

create or replace function public.prevent_validated_inventory_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'Validé' then
    raise exception 'Un inventaire validé ne peut plus être modifié.';
  end if;
  return new;
end;
$$;

create trigger inventory_session_lock
before update or delete on public.inventory_sessions
for each row execute function public.prevent_validated_inventory_edit();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.inventory_sessions enable row level security;
alter table public.inventory_lines enable row level security;

create policy "Profiles are visible to signed-in users"
on public.profiles for select to authenticated using (true);
create policy "Users update only their own profile name"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and not public.is_administrator())
with check (id = (select auth.uid()) and role = (
  select p.role from public.profiles p where p.id = (select auth.uid())
));
create policy "Administrators manage profiles"
on public.profiles for all to authenticated
using (public.is_administrator()) with check (public.is_administrator());

create policy "Signed-in users read categories"
on public.categories for select to authenticated using (true);
create policy "Administrators manage categories"
on public.categories for all to authenticated
using (public.is_administrator()) with check (public.is_administrator());

create policy "Signed-in users read products"
on public.products for select to authenticated using (true);
create policy "Staff create products"
on public.products for insert to authenticated with check (true);
create policy "Staff update products"
on public.products for update to authenticated using (true) with check (true);
create policy "Administrators delete products"
on public.products for delete to authenticated using (public.is_administrator());

create policy "Signed-in users read stock movements"
on public.stock_movements for select to authenticated using (true);
create policy "Staff record stock movements"
on public.stock_movements for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Administrators delete stock movements"
on public.stock_movements for delete to authenticated using (public.is_administrator());

create policy "Signed-in users read inventory sessions"
on public.inventory_sessions for select to authenticated using (true);
create policy "Staff create inventory sessions"
on public.inventory_sessions for insert to authenticated with check (created_by = (select auth.uid()));
create policy "Staff update inventory sessions"
on public.inventory_sessions for update to authenticated using (true) with check (true);
create policy "Administrators delete inventory sessions"
on public.inventory_sessions for delete to authenticated using (public.is_administrator());

create policy "Signed-in users read inventory lines"
on public.inventory_lines for select to authenticated using (true);
create policy "Staff manage inventory lines"
on public.inventory_lines for all to authenticated
using (
  exists (select 1 from public.inventory_sessions s where s.id = session_id and s.status = 'En cours')
)
with check (
  exists (select 1 from public.inventory_sessions s where s.id = session_id and s.status = 'En cours')
);

insert into public.categories (name) values
  ('Ordinateurs'), ('Écrans'), ('Composants'), ('Accessoires'), ('Imprimantes'), ('Consommables')
on conflict (name) do nothing;
