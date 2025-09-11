# 구매시황 Dashboard — 매일 오전 9시(KST) 정적 갱신 버전

## 구조
- `/public/data/*.json` : 매일 1회(09:00 KST) 생성되는 정적 데이터
- `/scripts/daily_refresh.mjs` : 데이터 수집 + AI 요약(해외/국내 각 1회)
- `.github/workflows/daily-refresh.yml` : GitHub Actions로 00:00 UTC에 스크립트 실행 → 변경사항 커밋 → Netlify 자동배포
- 프론트는 **항상 `/data/*.json`** 을 읽어옵니다 (실패/레이트리밋 X).

## 빠른 시작
```bash
npm i
npm run dev
```

## 수동 갱신(로컬)
```bash
FRED_API_KEY=... GEMINI_API_KEY=... npm run refresh
```

## CI(권장)
1. GitHub → Settings → Secrets and variables → Actions
   - `FRED_API_KEY` 추가
   - `GEMINI_API_KEY` 추가(요약 비용 최소: 해외/국내 각 1회)
2. Actions 스케줄은 UTC 기준 `0 0 * * *` → 한국 시간 **오전 9시**와 동일
3. 이 워크플로가 `public/data` 변경을 커밋하면 Netlify가 자동 재배포합니다.

## 페이지
- `/` : 주요지표 + 주요 리테일러 주가
- `/news` : 해외/국내 뉴스 목록
- `/ai` : AI 요약(해외/국내)

## 메모
- Yahoo/FRED/RSS에서 일시적으로 실패할 수 있어도, 이전 데이터가 유지됩니다.
- `public/data/*.json`은 언제나 우선 사용되므로, 500/HTML 파싱 오류가 사라집니다.
