# Integration Notes
- Generated: 2025-09-09T07:21:51
## What I did
- Added missing UI components under `components/` (only when they were absent).
- Rewrote `pages/index.js` to import components with **relative paths** (`../components/...`) to avoid alias issues.
- Components call existing API routes on the frontend and **gracefully degrade** when env keys are missing.
## Detected API routes
- `pages/api/ai-news-foreign.js`
- `pages/api/ai-news-korea.js`
- `pages/api/ai-summary.js`
- `pages/api/analysis.js`
- `pages/api/company-news-summary.js`
- `pages/api/daily-report.js`
- `pages/api/indicators.js`
- `pages/api/news-foreign.js`
- `pages/api/news-korea.js`
- `pages/api/news-kr-rss.js`
- `pages/api/news.js`
- `pages/api/ok.js`
- `pages/api/procure-sheet.js`
- `pages/api/retail-stocks.js`
- `pages/api/stocks.js`
## Files created
- `components/HeaderBar.js`
- `components/ProcurementDashboard.js`
- `components/MarketIndicators.js`
- `components/EquityMonitor.js`
- `components/NewsIntelligence.js`

If your repo already had more sophisticated components, check the `.backup` created at `pages/index.js.backup`.