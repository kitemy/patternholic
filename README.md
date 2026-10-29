# Patternholic

Patternholic is a web app for the rhythm game osu! that helps users discover beatmaps and analyze rhythm patterns.

## What it does
- Search real osu! beatmaps via the official osu! API.
- View beatmap and difficulty metadata.
- Upload a `.osu` difficulty, paste its contents, or import an `.osz` set (up to 100 MB).
- Browse per-difficulty analysis, extracted artwork/audio, and a seekable object preview.
- Compare saved pattern profiles in the experimental Recommendations workshop.
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
- The analyzer currently uses `src/lib/analysis.ts` (Patternholic's existing heuristic). Kitemy's script is not included in this repository and has not been integrated. Results are explicitly labeled with the current engine.
- `.osz` imports run locally, include all contained difficulties, and analyze supported osu!standard maps in workers. Other rulesets and invalid files show individual statuses. Extracted media URLs are released when the set is replaced or the page is closed.
- Recommendations compare analyses saved in this browser, not the entire osu! library. Imported audio and artwork are kept only for the current session.
- Search includes explicit maps and displays the explicit marker supplied by osu!.
- Search requires osu! API credentials configured as environment variables.
