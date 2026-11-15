insert into public.categories (name)
select distinct category from public.products
on conflict (name) do nothing;

alter table public.stock_movements
  add column if not exists product_category text not null default '';

update public.stock_movements movement
set product_category = product.category
from public.products product
where movement.product_id = product.id
  and movement.product_category = '';

create table if not exists public.category_brands (
  category_name text not null references public.categories (name) on update cascade on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (category_name, name)
);

insert into public.category_brands (category_name, name)
select distinct category, brand
from public.products
where brand <> ''
on conflict (category_name, name) do nothing;

alter table public.category_brands enable row level security;

drop policy if exists "Signed-in users read category brands" on public.category_brands;
create policy "Signed-in users read category brands"
on public.category_brands for select to authenticated using (true);

drop policy if exists "Administrators manage category brands" on public.category_brands;
create policy "Administrators manage category brands"
on public.category_brands for all to authenticated
using (public.is_administrator()) with check (public.is_administrator());
