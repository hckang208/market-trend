# Patch: Stock data not showing & AI heading text

1) **주가 데이터 표시 개선**
   - `/pages/api/stocks.js`를 RapidAPI Yahoo → Yahoo public → Stooq 순서로 폴백.
   - `RAPIDAPI_KEY`가 있으면 첫 단계에서 거의 항상 실시간 가격/전일종가/변동률을 얻습니다.
   - 응답 스키마를 프론트가 쓰는 `regularMarketPrice`, `regularMarketPreviousClose`, `changePercent`에 맞춰 반환.

2) **AI 요약/분석 제목 문제**
   - `/pages/api/ai-summary.js`를 수정해 더 이상 `"### STOCK-CARD"` 같은 헤더를 붙이지 않습니다.
   - 이제는 **글머리 기호(•)**만 반환합니다.

3) **프론트 정합성**
   - `components/EquityMonitor.js`가 API의 `changePercent`를 우선 사용, 없으면 `price vs previousClose`로 계산.
   - 더 이상 0으로 보이는 기본값을 강제하지 않고, 값이 없으면 `-`를 표시합니다.

> 적용: zip을 리포 루트에 덮어쓰기 → 커밋/푸시 → Netlify에서 Clear cache and deploy
> 환경: Netlify 환경변수에 `RAPIDAPI_KEY`가 있으면 정확도/안정성이 크게 올라갑니다.
