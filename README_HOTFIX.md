# Hotfix — dependency E404 & alias
Applied: 2025-09-09T05:49:18

1) **package.json**: use **@google/generative-ai** instead of google-generative-ai
2) **pages/api/ai-summary.js**: import from "@google/generative-ai"
3) **jsconfig.json**: add "@/..." path alias
4) **netlify.toml**: ensure Node 20 and plugin

## Deploy steps
- Replace/commit these files to GitHub repo root
- Remove `package-lock.json` (if exists in repo) to avoid old lock referencing `google-generative-ai`
- Netlify → *Clear cache and deploy site*
