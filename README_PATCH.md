
# Market Trend — 기업톤 UI & AI 요약 패치

적용일: 2025-09-09T05:29:33

## 변경 요약
- UI 톤을 Hansoll 스타일(화이트 배경, 네이비 포인트)로 리프레시
- `AI 요약` 버튼: 환경변수가 없어도 동작하도록 폴백 요약 추가
- 보안: 요약 HTML은 `sanitize-html`로 정제
- 폰트: SUIT Variable 링크를 `_app.js`에 추가

## 바뀐 파일
- `tailwind.config.js`
- `styles/globals.css`
- `pages/_app.js`
- `pages/api/ai-summary.js` (신규/교체)
- `components/NewsHeader.jsx` (교체/신규)
- `package.json` (의존성 추가: sanitize-html, google-generative-ai, clsx)

## 설치
```bash
npm install
# or
yarn
```

## 개발/실행
```bash
npm run dev
```

## 배포 주의
- Next.js API 라우트를 사용하므로 정적 export만으로는 `/api`가 동작하지 않습니다.
- Netlify: `@netlify/plugin-nextjs` 사용
- Vercel: 기본 설정으로 OK

## 옵션 환경변수
- `GEMINI_API_KEY`: 있으면 고도화된 요약 생성
- `GEMINI_MODEL`: 기본 `gemini-2.0-flash`
