# Hansol Textile · Market Insight Dashboard

실시간 주가, 경제지표, 뉴스, AI 시황분석 제공 대시보드.

## 🚀 배포
1. GitHub에 올리기
2. Vercel 연결
3. 환경변수 세팅 (OPENAI_API_KEY, FRED_API_KEY, KV는 `vercel kv connect`)
4. `vercel --prod`

## 📊 API
- `/api/stocks` → 리테일러 주가
- `/api/fred` → FRED 경제지표
- `/api/news` → 최신 뉴스
- `/api/analysis` → AI 시황분석
