# UI Adjust Patch

요청하신 3가지 변경을 반영했습니다.

## 1) Dashboard 타이틀 교체 & 중복 문구 삭제
- **pages/index.js**의 Dashboard 섹션 타이틀을 아래처럼 바꾸세요.
  - `부자재구매현황 DASHBOARD (SAMPLE DATA)`
- **components/ProcurementDashboard.js** 내부의 중복 타이틀을 제거했습니다.

## 2) 시장지표 BLOCK
- **components/MarketIndicators.js** 상단의 `"주요 지표"` 문구를 제거했습니다.

## 3) 주요리테일러 주가 BLOCK
- **components/EquityMonitor.js** 상단의 `"일일 리테일러 주가 등락률 (전일 종가 대비)"` 문구를 제거했습니다.
- 각 카드에 **“AI분석”** 버튼을 추가했습니다. 클릭 시 `/api/ai-summary`로 심볼/가격/변동률을 보내 요약을 표기합니다.
- 주가/변동률 데이터가 없을 때 **0 대신 '-'**로 표시되며, 퍼센트 계산 로직을 보완했습니다.
  - `changePercent` 또는 `change` 필드가 있을 경우 반영
  - 둘 다 없으면 `price`와 `previousClose`로 계산

## 적용 방법
- 이 zip의 `components/` 파일들을 리포에 덮어쓰기
- `pages/index.js`에서 Dashboard 섹션 타이틀만 교체 (샘플은 `pages/index.example.js` 참고)
- 커밋/푸시 후 Netlify에서 Clear cache & deploy

필요하면, index.js 파일을 직접 열어 타이틀 라인만 바꿔드릴 수도 있어요.
