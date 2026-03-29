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
