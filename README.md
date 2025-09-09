# Market Trend — Clean Starter (2025-09-09)

**핵심만 남긴 클린 버전**입니다. 불필요한 파일(예: `.next/`, `node_modules/`, 테스트 샘플, 임시 스크립트, 예전 API, IDE 설정 등)은 전부 제외했습니다.

## 구조
```
pages/
  _app.js
  index.js
  api/
    ai-summary.js     # GEMINI_API_KEY 없으면 폴백 요약
    news.js           # NEWSAPI 없으면 빈 리스트 반환
components/
  KPI.jsx
  AICard.jsx
  NewsHeader.jsx
  ProcurementForm.jsx
styles/
  globals.css         # Hansoll 톤(화이트/네이비) UI
tailwind.config.js
postcss.config.js
jsconfig.json         # '@/*' 별칭
netlify.toml          # Node 20 + Next plugin
package.json          # Next 14 + React 18 + Tailwind + @google/generative-ai + sanitize-html
```

## 설치 & 실행
```bash
npm install
npm run dev
```

## 배포(Netlify)
- Build command: `npm run build`
- Publish directory: `.next`
- **Environment**:
  - `NODE_VERSION=20.15.1`
  - `NPM_FLAGS=--legacy-peer-deps --no-audit --no-fund`
  - (옵션) `NEWSAPI=<키>`
  - (옵션) `GEMINI_API_KEY=<키>`

## 커스터마이즈
- KPI 데이터 연동은 `/pages/index.js`에서 API 호출 추가
- 뉴스/요약 키워드 튜닝은 `/pages/api/news.js`의 `q` 수정

---
_생성: 2025-09-09T06:03:59_
