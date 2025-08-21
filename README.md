# Hansol Textile · Market Insight Dashboard

패션/리테일/섬유 산업 관련 실시간 주가, 경제지표, 뉴스와 AI 시황분석을 제공하는 대시보드.

## 🚀 배포 방법
1. GitHub에 이 레포 올리기
2. Vercel 프로젝트 연결
3. 환경변수 세팅 (OPENAI_API_KEY, FRED_API_KEY, KV 관련은 `vercel kv connect`)
4. `vercel --prod` 로 배포

## 📊 확인 경로
- `/` → 대시보드 화면
- `/api/stocks` → 리테일러 주가 JSON
- `/api/fred` → 경제지표 JSON
- `/api/analysis` → 오늘의 AI 요약
