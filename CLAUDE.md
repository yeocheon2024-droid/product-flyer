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
- 헤더 QR코드 (제품소개 사이트 링크)
- 템플릿별 최대 품목: A=10, B=18, C=15, D=18, E=50, F=3, L=25

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 규칙
1. QR코드 스캔 가능 여부 테스트 (PNG 다운로드 후 확인)
2. 인쇄 해상도 유지 (html2canvas scale 설정 주의)
3. 템플릿 추가 시 최대 품목 수 명시 필요
