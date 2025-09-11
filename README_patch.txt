# Daily News @ 09:00 KST (Static JSON) – Patch

이 패치는 매일 오전 9시(KST) 한 번만 뉴스 데이터를 정적으로 생성하고, 프론트는 해당 JSON만 읽도록 구성합니다.
API는 **폴백**으로만 사용합니다.

## 적용 파일
- scripts/fetch_news_daily.mjs  (빌드 전 뉴스 수집 → public/data/*.json 저장)
- netlify/functions/trigger_build.js  (Netlify 스케줄 함수: 빌드 훅 호출)
- netlify.toml  (스케줄 cron 추가, Next.js 플러그인/설정 포함)
- lib/newsClient.js  (정적 JSON 우선 + API 폴백 헬퍼)
- public/data/news_overseas.json, public/data/news_korea.json (초기 빈 파일)

## 1) package.json 수정
기존 scripts는 유지하고, build만 다음처럼 교체/병합합니다.
```json
{
  "scripts": {
    "prebuild:news": "node scripts/fetch_news_daily.mjs",
    "build": "npm run prebuild:news && next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```
> 이미 build 스크립트가 있으면 `npm run prebuild:news &&`만 **앞에 추가**하면 됩니다.

## 2) 프론트 페치 코드 변경(예시)
페이지 상단에 헬퍼 import 후, 기존 fetch 부분을 교체하세요.
```js
import { getOverseasNews, getKoreaNews } from "@/lib/newsClient";

// 해외
const o = await getOverseasNews();
const overseasItems = Array.isArray(o) ? o : (o.items || []);

// 국내
const k = await getKoreaNews();
const koreaItems = Array.isArray(k) ? k : (k.items || []);
```

## 3) Netlify 설정
1. **Site settings → Build & deploy → Build hooks → Add build hook** 생성 (예: `daily-9am-kst`).
2. 생성된 URL을 **Environment variables**에 저장: `NETLIFY_BUILD_HOOK_URL`.
3. `netlify.toml`은 이 패치의 파일을 사용하거나, 기존 파일에 아래 블록을 병합하세요.
```toml
[[scheduled.functions]]
  name = "trigger_build"
  cron = "0 0 * * *"   # 매일 UTC 00:00 = KST 09:00
```

## 동작 흐름
- 매일 09:00 KST: 스케줄 함수 → Build Hook 호출 → 빌드 시작
- 빌드: `prebuild:news`가 뉴스 수집 → `public/data/*.json` 작성
- 배포: 프론트는 `/data/*.json`만 읽음 → 외부 장애에도 UI 안정

작성: 2025-09-11T07:53:29.445656
