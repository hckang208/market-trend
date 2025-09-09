# Netlify Hotfix v3 — E404 google-generative-ai & Node 22 lock
Applied: 2025-09-09T06:18:55

## What this does
- Adds a **preinstall** fixer script to rewrite any `package.json` that references the wrong package name `google-generative-ai`.
- Ensures **`@google/generative-ai@^0.21.0`** is present and maps `google-generative-ai` → `npm:@google/generative-ai@^0.21.0`.
- Removes old lock files so npm can resolve fresh.
- Forces Node **20.15.1** with `.nvmrc` and `.node-version`.

## How to use
1) Add the script:
   - Put the `scripts/fix-generative-ai-alias.js` file into your repo.
2) Enable it as a **preinstall**:
   - Run locally OR edit `package.json`:
     ```bash
     npm pkg set scripts.preinstall="node scripts/fix-generative-ai-alias.js"
     ```
   - Commit the changed `package.json`.
3) Commit `.nvmrc` and `.node-version` too.
4) **Push** and then in Netlify click **Clear cache and deploy site**.

This guarantees that even if an old subfolder or lock file still mentions the wrong package, the preinstall hook will fix it before npm tries to resolve dependencies.
