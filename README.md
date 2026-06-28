# BioCurrent

A hackathon MVP for a stylized Three.js health game about fighting cardiovascular disease. Pilot a tiny bio-explorer submarine through narrowed blood vessels, collect light crystals, clear fatty plaque blockages, and restore circulation.

## Run locally

Create a local environment file for the meal photo scanner:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set your API key:

```bash
VITE_MEAL_API_KEY=your-api-key-here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

Start the app:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The first screen asks for a meal photo or image URL, calls the image model, and uses the returned health score as the player's starting health.

## Build

```bash
npm run build
```

## Tech

- Vite
- Three.js
- Vanilla JavaScript

## Meal scanner API

The meal scanner uses an OpenAI-compatible chat completions endpoint from the browser demo code. The API key is read from `VITE_MEAL_API_KEY`.

Do not commit `.env.local` or real API keys. Share `.env.example` instead.

## Leaderboard

The leaderboard stores cumulative mission scores, veggie/junk-food pickup counts, and the player's meal photo in Supabase. Before using it, open the Supabase SQL Editor and run both migrations in order:

```text
supabase/migrations/202606280001_create_leaderboard_scores.sql
supabase/migrations/202606280002_add_leaderboard_meal_details.sql
```

The migrations create the `leaderboard_scores` table, ranking index, read/insert-only Row Level Security policies, and a public `meal-photos` Storage bucket. Browser clients may read and insert scores and upload meal images, but cannot update or delete them. Local uploads and compatible pasted image URLs are copied into Storage; the database stores only the resulting Storage public URL, not image bytes or third-party URLs. The publishable key is safe to expose to the browser when these policies are enabled; never use a Supabase secret or `service_role` key in this app.
