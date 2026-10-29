# Patternholic

Patternholic is a web app for the rhythm game osu! that helps users discover beatmaps and analyze rhythm patterns.

## What it does
- Search real osu! beatmaps via the official osu! API.
- View beatmap and difficulty metadata.
- Paste a `.osu` file to analyze its patterns.
- Detect jumps, streams, bursts, repetition, density, timing intensity, and irregularity.
- Calculate a transparent Pattern Abuse Score from 0 to 100.
- View rankings of analyzed beatmaps.
- Explain how each score was calculated.

## Tech stack
- Frontend: Vue 3, TypeScript, Vite
- Backend: Vercel serverless functions (TypeScript)
- Database: in-memory on Vercel (Cloudflare D1 available in the Cloudflare version)

## Notes
- The score is a heuristic, not an official osu! rating.
- Search requires osu! API credentials configured as environment variables.