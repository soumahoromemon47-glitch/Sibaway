# Sibaway — gestion de stock

Application de gestion de stock pour une boutique de matériel informatique. Interface en français, responsive et installable, avec mode local hors ligne et synchronisation Supabase facultative.

## Fonctionnalités

- Tableau de bord, suivi de la valeur du stock, alertes et graphique des sorties sur 30 jours.
- Catalogue avec recherche, filtres, catégories, seuils et gestion des produits.
- Entrées, ventes, pertes, casse, retours et ajustements d’inventaire. Le stock ne peut pas devenir négatif.
- Sessions d’inventaire et rapprochement des écarts.
- Rapports par période, répartition par catégorie, marge estimée, export CSV (Excel) et impression PDF.
- Thème sombre par défaut, bascule clair/sombre et navigation mobile.
- Cache IndexedDB, file d’attente hors ligne et synchronisation automatique avec Supabase au retour du réseau.
- PWA installable. Le mode démonstration local est prêt à l’emploi.

## Installation et démarrage

Prérequis : Node.js 20 ou plus récent et npm.

```bash
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite. Sans variables Supabase, choisir **Entrer dans la démo** sur l’écran de connexion. Les données de démonstration sont enregistrées dans IndexedDB sur cet appareil.

Commandes de vérification et de production :

```bash
npm run typecheck
npm run build
npm run preview
```

## Configuration Supabase

1. Créer un projet Supabase.
2. Dans le SQL Editor, exécuter [`supabase/schema.sql`](./supabase/schema.sql), puis [`supabase/seed.sql`](./supabase/seed.sql) pour charger les 20 produits de démonstration.
3. Créer les comptes e-mail/mot de passe dans **Authentication → Users**. La création d’un compte crée automatiquement son profil, avec le rôle `Employé` par défaut.
4. Promouvoir l’administrateur initial depuis le SQL Editor (remplacer l’adresse) :

   ```sql
   update public.profiles
   set role = 'Administrateur'
   where id = (select id from auth.users where email = 'admin@votre-boutique.ci');
   ```

5. Copier `.env.example` vers `.env` et renseigner l’URL du projet et la clé publique **anon** :

   ```env
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon
   ```

6. Redémarrer le serveur de développement. Les opérations du personnel sont protégées par les politiques RLS. Les mouvements déclenchent la mise à jour atomique du stock côté PostgreSQL.

Ne jamais placer la clé `service_role` dans l’application cliente. Les rôles se gèrent côté administrateur dans `public.profiles`.

## Hors ligne et données locales

Les données ouvertes et les modifications locales sont stockées dans IndexedDB (Dexie). Lorsque Supabase est configuré, les changements sont ajoutés à une file locale puis envoyés dès que la connexion revient. La pastille d’état dans l’en-tête indique l’état du réseau et de synchronisation.

Les données hors ligne sont propres au navigateur et à l’appareil. Pour travailler hors ligne, ouvrir d’abord l’application en ligne afin que l’espace et ses produits soient mis en cache. En mode démonstration sans configuration Supabase, les produits et mouvements sont locaux.

## Déploiement

### Vercel

- Importer le dépôt, sélectionner Vite et conserver `npm run build` comme commande de build.
- Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` aux variables d’environnement.
- Déployer. La configuration Vite PWA génère le manifeste et le service worker de production.

### Netlify

- Commande de build : `npm run build`.
- Dossier publié : `dist`.
- Définir les mêmes variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Ajouter une règle SPA de réécriture `/* /index.html 200` si des routes sont ajoutées.

## Structure

```text
src/
  components/    composants partagés, connexion, navigation et modale
  context/       état du stock, persistance locale et synchronisation
  lib/           formats, données de démonstration, Dexie et Supabase
  pages/         tableau de bord, produits, mouvements, inventaire, alertes, rapports
  styles.css
supabase/
  schema.sql     tables, index, triggers et politiques RLS
  seed.sql       20 produits de démonstration
```

Les montants sont exprimés en FCFA, sans décimales ; les dates affichées utilisent le fuseau `Africa/Abidjan`.
