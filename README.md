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
