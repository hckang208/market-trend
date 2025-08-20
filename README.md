# Hansol Market Insight (GitHub + Vercel Pilot)

이 패키지는 GitHub + Vercel 기반의 **Pilot Run** 버전입니다.

---

## 📂 구성 파일
- `index.html` → 프론트엔드 (시황 공유 페이지)
- `stocks.csv` → 주가 데이터 (자동 업데이트)
- `kpi.csv` → 주요 지표 (자동 업데이트)
- `news.csv` → 뉴스 데이터 (자동 업데이트)
- `stock_crawler.py` → 주가 크롤러 (Yahoo Finance)
- `kpi_crawler.py` → 지표 크롤러 (FRED API)
- `news_crawler.py` → 뉴스 크롤러 (RSS + 키워드)
- `update_all.py` → 전체 실행 스크립트

---

## 🚀 GitHub + Vercel 배포 방법

### 1. GitHub Repo 생성
- GitHub에서 새 repo 생성 (예: hansol-market-insight)
- 로컬에서 아래 실행:
```bash
git init
git remote add origin https://github.com/username/hansol-market-insight.git
git add .
git commit -m "init pilot"
git push origin main
```

### 2. Vercel 연결
- [Vercel](https://vercel.com/) 접속 → 로그인
- New Project → GitHub Repo 연결
- 빌드 세팅: Framework: None (Static HTML), Root: `/`
- 배포 후 `https://hansol-market-insight.vercel.app` 형태의 URL 발급

### 3. 데이터 업데이트
- 매일 로컬에서 실행:
```bash
python update_all.py
git add .
git commit -m "update data"
git push
```
- GitHub → Vercel 자동 배포 → 웹사이트 즉시 최신화

---

## ⚠️ 주의사항
- Vercel Free 플랜으로 충분 (월 100GB 대역폭)
- GitHub Free 플랜으로도 무제한 사용 가능
- CSV는 반드시 repo 루트에 위치해야 index.html이 불러올 수 있음

---

## 🔄 자동화 (선택)
- GitHub Actions에 크론 잡 추가 시 완전 자동화 가능
- 예: `.github/workflows/update.yml`에 스케줄러 작성 가능 (IT팀과 협업시 권장)
