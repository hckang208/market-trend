# Market Trend — Next.js Pro Dashboard

## Scripts
- `npm run dev` — local dev
- `npm run build` — prod build
- `npm start` — run production

## Environment Variables (Vercel)
- `RAPIDAPI_KEY` — RapidAPI key for Yahoo Finance + Contextual Web Search
- `FRED_API_KEY` — FRED key for macro indicators
- `OPENAI_API_KEY` — optional, for /api/analysis summarization

## Endpoints
- `/api/stocks?symbol=WMT`
- `/api/news?q=Walmart`
- `/api/indicators`
- `/api/analysis` (POST: { items: [{title, url}, ...] })

## Notes
- News endpoint caches for 5 minutes in-memory per lambda.
- Retailer news is only fetched on hover to avoid 429 throttling.

## Environment (.env)
- Copy `.env.example` to `.env.local` for local dev, or set vars in Vercel:
  - `RAPIDAPI_KEY` — RapidAPI key for Yahoo Finance & Contextual Web Search
  - `FRED_API_KEY` — FRED macro indicators
  - `OPENAI_API_KEY` — OpenAI for AI insights (/api/analysis)
- After changing env vars on Vercel, **Redeploy** the project.

## Health Check
- `/api/ok` → should return `{ ok: true }` if API routes are active.

