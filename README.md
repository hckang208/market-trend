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


## One-click Hosting (Vercel 대안)
### Netlify
1) GitHub 레포 연결 → **Environment variables**에 다음 3개 추가
   - `RAPIDAPI_KEY`, `FRED_API_KEY`, `OPENAI_API_KEY`
2) 그대로 Deploy (플러그인 `@netlify/plugin-nextjs`가 SSR/API 자동 처리)
3) 헬스체크: `/api/ok`

### Render
1) 대시보드 → New → Web Service → GitHub 레포 선택
2) Build Command: `npm install && npm run build`
3) Start Command: `npm run start`
4) Node Version: `18`
5) Environment → `RAPIDAPI_KEY`, `FRED_API_KEY`, `OPENAI_API_KEY` 추가
6) 배포 후 헬스체크: `/api/ok`

> Cloudflare Pages/Workers도 가능하지만, `@cloudflare/next-on-pages` 어댑터 설정이 필요합니다.


## Netlify deployment notes
- Ensure `package.json` includes `@netlify/plugin-nextjs` in devDependencies (already added).
- Ensure `netlify.toml` is in repo root (already added).
- `.nvmrc` forces Node 18 (already added).
- In Netlify, set Environment Variables: RAPIDAPI_KEY, FRED_API_KEY, OPENAI_API_KEY.
- Then trigger "Clear cache and deploy site".
- Check build logs: should see "Detected Next.js" and "@netlify/plugin-nextjs".
- Test at /api/ok for API health.


### Overseas News Domain Whitelist
Set `.env.local` or deployment env:
```
FOREIGN_NEWS_DOMAINS=businessoffashion.com,just-style.com
```
