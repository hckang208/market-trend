# 구매시황 Dashboard — 9AM KST Static Snapshot (Minimal / No Tailwind)

- 완전 정적(정오 9시 KST 한 번만 갱신)
- 런타임 API 호출 없음(Netlify는 정적 JSON만 서빙)
- Tailwind / PostCSS 제거, CommonJS 구성(next.config.cjs)

## 사용법
1) 레포에 그대로 덮어쓰기 커밋
2) GitHub → Secrets → Actions
   - `FRED_API_KEY`, `GEMINI_API_KEY` 추가
3) Actions 스케줄(00:00 UTC = 09:00 KST) 자동 실행 → `/public/data/*.json` 커밋 → Netlify 자동 배포

## 로컬 테스트
```bash
npm i
FRED_API_KEY=... GEMINI_API_KEY=... npm run refresh
npm run dev
```

## 페이지
- `/` : 주요 지표 + 주요 리테일러 주가
- `/news` : 해외/국내 뉴스 목록
- `/ai` : AI 요약(해외/국내)

## 주의
- 기존 `pages/api/*` 서버리스 라우트는 제거됨(필요없음).
- `next.config.js` 대신 `next.config.cjs`만 유지.
