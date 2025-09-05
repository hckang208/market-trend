
## Google Sheet 연결 (읽기 전용, 본인만 수정)

1) 구글 스프레드시트에서 시트(탭) 생성 후 **A1 행에 헤더**를 아래처럼 구성:
```
period,periodLabel,currency,revenue,materialSpend,styles,poCount,costSave,domestic,thirdCountry,local,notes
```
2) `파일 → 웹에 게시` → 대상: 해당 시트(탭)만, 형식: **CSV** → 링크 복사
3) 배포 환경 변수에 `PROCURE_SHEET_CSV_URL` 추가 (로컬은 `.env.local`):
```
PROCURE_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/.../pub?gid=0&single=true&output=csv"
```
4) 누구나 대시보드에서는 **읽기**만 가능. 편집(수정)은 **본인 계정**으로 Google Sheet에서 직접 하면 됨.
