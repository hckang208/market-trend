# Fix: Use @google/generative-ai (scoped package)
Applied: 2025-09-09T05:39:19

- Replaced non-existent `google-generative-ai` with official scoped `@google/generative-ai`
- Updated `pages/api/ai-summary.js` import paths accordingly
- Keep Netlify Node 20.x setup

If Netlify cache persists old lockfiles, trigger **Clear cache and deploy site**.
