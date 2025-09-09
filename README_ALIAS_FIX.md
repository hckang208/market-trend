# Alias Fix Patch (v3)
Applied: 2025-09-09T05:42:38

- Added `jsconfig.json` with path alias:
  ```json
  {
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "*"
      ]
    }
  }
}
  ```
- This enables imports like `@/styles/globals.css` and `@/components/*` to resolve during Next.js build.
