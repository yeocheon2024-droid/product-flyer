# 전단지 생성기 — 전단지 에이전트

> **소속 부서**: 영업부 — 영업 전단지 제작
> **상위 문서**: ../CLAUDE.md (ERP 총괄)

## 역할
Supabase 품목 데이터로 인쇄용 전단지(PDF/PNG)를 생성하는 Next.js 사이트 관리.

## 기술 스택
- Next.js 14 + TypeScript + Tailwind CSS
- html2canvas (이미지 캡처), JSZip (다중 다운로드)
- Supabase JS v2

## 배포
- GitHub: `yeocheon2024-droid/product-flyer`
- URL: product-flyer.pages.dev
- 호스팅: Cloudflare Pages

## 주요 기능
- 7종 템플릿 (A~F, L) + 표지
- 7종 컬러 테마
- PDF/PNG 내보내기
- 품목 순서 커스터마이징 (▲▼ 버튼)
- **대분류 전단지 한번에 생성** (2026-10-02): 좌측 "대분류 전단지 한번에 생성" 드롭다운에서 대분류 하나(또는 전체 대분류)를 고르고
  [전체 생성] → 판매단가 있는 품목 전부를 **중분류 ERP 순서(category_order)** 로 담아 현재 레이아웃의 페이지당 최대 수로 자동 분할.
  전단지 머리 문구가 "쌀 가격표"처럼 대분류명으로 바뀌고, 가격표(E)·테이블형(L)은 대분류가 하나뿐이면 **중분류**로 섹션을 나눈다.
  20페이지 넘으면 확인창. 표지 레이아웃은 미지원. 손으로 품목을 더하거나 빼면 일반 전단지로 돌아간다(머리 문구 원복).
- **품목 고르기 (전체 화면)** (2026-10-02, `ProductPicker`): 좌측 340px 목록이 좁아 한눈에 안 보이던 문제.
  [🔍 크게 보고 고르기] (대분류 상자, 그 대분류 품목을 전부 선택한 채 열림) 또는 품목 목록의 [🔍 크게 보기] (현재 선택 그대로).
  거래처 앱 상품 보기처럼 **대분류 타일 → 중분류 칩 → 상품 카드 격자**(이미지·품목명·규격·가격, 150px 카드 자동 열수).
  카드 클릭 = 선택/해제(해제된 카드는 흐리게), 중분류별·보이는 것 전체 선택/해제, 검색, "선택한 것만" 필터, Esc 닫기.
  [전단지 생성]은 선택 품목을 **대분류 → 중분류 → 품목 순**으로 재정렬해 생성하고 머리 문구를 선택 기준으로 다시 정한다
  (한 대분류면 그 이름, 전 품목이면 '전 품목', 섞이면 기본 '납품 가격표'). 닫기만 하면 선택은 유지되고 좌측 목록에 그대로 반영.
- 헤더 QR코드 (제품소개 사이트 링크)
- 템플릿별 최대 품목: A=10, B=18, C=15, D=39, E=50, F=3, L=25
  - D(가로배치형)는 2026-10-02 18→39: 18개 이하는 예전 2열 그대로, 26개까지 2열 13행, 그 위는 3열 13행(`--d-cols`).
    본문 가용 높이 ≈ 951px 기준으로 단계별 썸네일 크기를 `getScaleVars` 에 계산해 두고, 헤드리스 Edge 스크린샷으로 확인함.

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

- **작업 자동 저장** (2026-10-02): 선택 품목·순서·이름/가격 수정·레이아웃·테마·설정이 localStorage `flyer-work-v1` 에
  바뀔 때마다 저장되고, 다음 접속 때 품목 DB 에 남아 있는 코드만 복원된다 (배포·새로고침에도 유지). 선택 현황의 [처음부터]로 삭제.
- **인쇄(window.print) 다중 페이지** (2026-10-02 수정): 예전 `body * visibility:hidden` + `#printArea position:fixed` 방식은
  fixed 가 뷰포트 한 장 크기로 잘려 **첫 장만 인쇄**됐다. 지금은 헤더·패널에 `.no-print`(display:none), 미리보기 조상에
  `.print-ancestor`(100vh·overflow:hidden·flex 해제)를 달아 `#printArea` 가 일반 흐름에서 `.flyer-a4` 마다 page-break 로 이어진다.
  새 래퍼를 추가하면 클래스를 같이 달 것.

- **PNG/PDF 캡처 글자 잘림 수정** (2026-10-16, v4.3): html2canvas 가 글자 기준선을 재는 숨은 `<img>` 가 Tailwind preflight
  `img{display:block}` 에 밀려 기준선이 커지고, 캡처된 글자가 전부 아래로 밀려 D(39개) 카드 바닥의 가격이 반쯤 잘렸다.
  globals.css 의 `body > div[style*="white-space: nowrap"] > img { display:inline }` 로 보정. 미리보기·window.print 는 원래 정상이었음.
  재현·검증은 scratchpad 의 h2c-harness(빌드된 CSS + html2canvas.min.js + 가짜 카드 39개 → 헤드리스 Edge 스크린샷)로.
  **반드시 빌드된 `out/_next/static/css/*.css` 를 링크해야 재현된다** (globals.css 원본은 `@tailwind base` 가 안 풀려 재현 안 됨).
- **가격 클릭 수정** (2026-10-16): 미리보기 전단지(모든 템플릿·표지)와 품목 고르기 카드의 가격을 누르면 전단지용 가격 수정 모달.
  가격 수정 모달이 떠 있는 동안 Esc 는 모달만 닫는다(`escLocked`). 미리보기 가격엔 `cursor:pointer`·title 만 붙어 캡처엔 영향 없음.
- **좌측 패널 스크롤** (2026-10-16): "전체" 대분류에서 중분류 칩이 길어지면 아래 품목 목록이 0px 로 눌려 안 보였다 →
  패널 자체를 `overflow-y:auto` 로 두고 품목 목록 `min-height:360px` 보장(패널을 내리면 목록이 보이고 목록 안에서 또 스크롤).

- **PNG/PDF 내보내기 속도 개선** (2026-10-17, v4.4): 병목은 이미지였다 — 페이지마다 모든 이미지를 wsrv.nl 에서 **원본 크기 PNG(품목당 ~450KB)** 로
  다시 받았다(39개×7장 ≈ 120MB). 지금은 표시 너비(`img.offsetWidth`×2.5, 300px 버킷)에 맞춘 **webp(~9KB)** 를 세션 캐시(`exportImageCache`)에
  한 번만 받고(동시 8개, 모든 페이지 선로딩), 캡처 배율 PDF 2.5 / PNG 2, jsPDF `compress`+`'FAST'`, PNG 는 `toBlob`+object URL.
  R2 공개 버킷은 CORS 헤더가 없어 프록시는 그대로 필요. 같은 출처(/logo.png)는 프록시 없이. 진행 상태는 헤더에 "PDF 생성 중… 2/7" 로 표시되고
  그동안 PNG/PDF 버튼이 잠긴다. 좌측 품목 목록 썸네일은 `loading="lazy"` (html2canvas 가 문서 전체를 복제해 로드 완료를 기다리므로).
  품질을 더 올리려면 `PDF_SCALE`/`PNG_SCALE` 만 바꾸면 된다.

## 규칙
1. QR코드 스캔 가능 여부 테스트 (PNG 다운로드 후 확인)
2. 인쇄 해상도 유지 (html2canvas scale 설정 주의)
3. 템플릿 추가 시 최대 품목 수 명시 필요
