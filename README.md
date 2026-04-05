# Football Auction Draft

Application de draft fantasy football en mode enchères 1v1. Le dépôt est initialisé avec Next.js 15, Supabase, Tailwind CSS v4, shadcn/ui et un seed de 150 joueurs réels de la saison 2024/2025.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YoussefAz2/draft)

## Stack technique

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- Framer Motion
- Lucide React

## Guide de setup ultra-simple

1. Créer un projet Supabase : https://supabase.com/dashboard
2. Copier l'URL du projet et les clés depuis `Settings → API`
3. Créer un fichier `.env.local` à partir de `.env.local.example`
4. Installer et lancer le projet :

   ```bash
   npm install
   npm run dev
   ```

5. Aller dans `Supabase Dashboard → SQL Editor`
6. Ouvrir `src/lib/schema.sql`, copier tout son contenu, le coller dans l'éditeur SQL, puis cliquer sur `Run`
7. Visiter `http://localhost:3000/api/setup` pour seeder automatiquement les 150 joueurs

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Scripts utiles

```bash
npm run dev
npm run build
npm run lint
npm run seed:players
npm run setup:db
```

- `npm run seed:players` : insère les joueurs si la table `players` est vide
- `npm run setup:db` : vérifie que le schéma SQL a bien été appliqué, puis seed les joueurs si nécessaire

## Déploiement Vercel

1. Importer le dépôt dans Vercel
2. Ajouter les 3 variables d'environnement Supabase
3. Déployer
4. Après le premier déploiement :
   - exécuter `src/lib/schema.sql` dans le SQL Editor Supabase
   - visiter `/api/setup` une seule fois pour seed les joueurs

## Structure du projet

```text
/src
  /app
    layout.tsx
    page.tsx
    globals.css
    /auth
      /login/page.tsx
      /signup/page.tsx
    /dashboard/page.tsx
    /game
      /[id]/page.tsx
    /lobby/page.tsx
    /api
      /setup/route.ts
  /components
    /ui
    /game
    /layout
  /lib
    /supabase
      client.ts
      server.ts
      middleware.ts
      admin.ts
    /types
      database.ts
      game.ts
      player.ts
    /constants
      game.ts
    /utils
      scoring.ts
      helpers.ts
    schema.sql
  /data
    players.ts
  /scripts
    seed-players.ts
    setup-db.ts
```

## Base de données

Le schéma complet Supabase est stocké dans `src/lib/schema.sql`.

Il crée :

- `profiles`
- `players`
- `games`
- `game_players`
- `bids`
- la fonction `increment_profile_stats`
- le trigger `handle_new_user`
- les policies RLS

## Seed des joueurs

- Dataset statique : `src/data/players.ts`
- Total : **150 joueurs réels**
- Répartition : 15 gardiens, 40 défenseurs, 50 milieux, 45 attaquants
- Couverture : Premier League, Liga, Serie A, Bundesliga, Ligue 1, avec quelques stars hors top 5 pour compléter le pool

## UI disponible

shadcn/ui est configuré avec les composants suivants :

- Button
- Card
- Input
- Badge
- Dialog
- Dropdown Menu
- Avatar
- Skeleton
- Separator

## État du projet

Les pages applicatives sont volontairement en placeholder avec un thème dark minimal et le texte `Coming soon.` pour accélérer l'initialisation du produit.
