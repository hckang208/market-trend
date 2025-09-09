pro-ui-pack-0909
================

목표
----
- **UI만** 개선합니다. 데이터/로직/라우팅은 건드리지 않습니다.
- 톤&매너: *S&P/Fortune 500* 임원진이 봐도 신뢰감 있는 대시보드.
- AI 통합은 *자연스러운 '섹션 레벨' UI*로 녹임 (🤖 AI 칩, 블록 스타일).

구성
----
- `pro-ui.css` : 테마/컴포넌트 스타일 (body.pro-ui 스코프)
- `pro-ui.js`  : DOM 비파괴적(class/attr 주입) UI 보조 스크립트
- 이 두 파일만 추가하세요. (삭제해도 원상복구)

적용 방법
--------
### Next.js
`pages/_app.tsx` 또는 루트 레이아웃에:
```tsx
import "@/styles/pro-ui.css";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script src="/pro-ui.js" strategy="afterInteractive" />
    </>
  );
}
```

- `public/pro-ui.js` 로 파일을 두고, `styles/pro-ui.css` 로 넣는 것을 권장합니다.

### 정적 HTML
각 페이지에 다음을 추가:
```html
<link rel="stylesheet" href="/pro-ui.css" />
...
<script defer src="/pro-ui.js"></script>
```

Notes
-----
- `.pro-ui` 클래스 스코프로만 동작하므로, 문제가 생기면 이 클래스만 제거하면 됩니다.
- *표시만* 바꿉니다. 차트/테이블/AI 요약 등 기능은 기존 코드를 그대로 사용합니다.
- "### STOCK-CARD" 같은 자리표시자는 **시각적으로만 숨김** 처리합니다.

권장 섹션 네이밍 (선택)
----------------------
다음과 같이 래핑하면 스타일 적용이 더 좋아집니다(선택 사항):
```html
<section class="card">
  <div class="card-head">
    <div class="card-title">주요 리테일러 주가</div>
    <div class="card-actions">
      <button class="btn btn-subtle">새로고침</button>
    </div>
  </div>
  <div class="chart-wrap" data-chart>
    <canvas id="retailersChart"></canvas>
  </div>
</section>
```