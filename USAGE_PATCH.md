# Market Trend Dashboard - Patch Summary

## Updated
- `components/ProcurementTopBlock.jsx`
  - 수기 입력만으로도 분석(베타) 동작
  - 선택적으로 작년값 입력 가능 → 자동 YoY 포함
  - Export / Import 지원 (localStorage key: `procure.dashboard.v1`)
  - `/api/ai-summary` 호출 (없으면 기존 파일 유지)

- `pages/api/news-kr-rss.js`
  - HTTPS 강제, User-Agent 지정, 타임아웃/리트라이, 다중 피드 지원
  - 쿼리: `feeds`(콤마), `days`(기본 2), `limit`(기본 50)

## Quick check
- 로컬: `npm i && npm run dev`
- 헬스체크: `/api/ok` → `{ ok: true }`
- 한국섬유신문: `/api/news-kr-rss?feeds=https://www.ktnews.com/rss/allArticle.xml&days=2&limit=20`
