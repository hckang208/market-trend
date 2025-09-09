# Netlify 빌드 에러(Install dependencies) 대응 패치
적용일: 2025-09-09T05:34:39

## 무엇이 바뀌었나
- `netlify.toml`: Node 20 고정, npm 플래그(`--legacy-peer-deps --no-audit --no-fund`) 설정, Next.js 플러그인 선언
- `.nvmrc`: 로컬/빌드 환경 Node 버전을 20.15.1로 고정
- `.npmrc`: peer deps 충돌 무시 및 audit/fund 비활성화
- `package.json`: `engines.node=20.x` 지정

## Netlify 설정 팁
1) **Site settings → Build & deploy → Environment** 에서 다음 변수를 확인/추가  
   - `NODE_VERSION = 20.15.1`  
   - `NPM_FLAGS = --legacy-peer-deps --no-audit --no-fund`
2) **Build settings**  
   - Base directory: (비우기)  
   - Build command: `npm run build`  
   - Publish directory: `.next`
3) **Clear cache and deploy site** 버튼으로 재배포

이후에도 실패 시, 'Install dependencies' 섹션의 **전체 에러 로그**를 확인해 주세요.
