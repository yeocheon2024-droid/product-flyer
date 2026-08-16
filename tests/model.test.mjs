import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_QR_URL_LENGTH,
  PLAY_STORE_URL,
  buildTemplateFromCatalog,
  computeCategoryStats,
  defaultQrCopyForUrl,
  isJiguorderPlayStoreUrl,
  isValidHttpsUrl,
  isValidQrTargetUrl,
  normalizeHeroProducts,
  normalizeHttpsUrl,
  normalizeImageUrl,
  normalizeQrTargetUrl,
  normalizeText,
  validateTemplate,
} from "../src/features/marketing-flyer/model.js";

test("Google Play 앱 주소를 전단 QR 기본값으로 사용한다", () => {
  assert.equal(PLAY_STORE_URL, "https://play.google.com/store/apps/details?id=com.jiguorder.customer");
});

test("QR 주소는 HTTPS만 허용하고 위험한 스킴은 기본값으로 대체한다", () => {
  assert.equal(isValidHttpsUrl("https://example.com/order"), true);
  assert.equal(isValidHttpsUrl("https://user:password@example.com/order"), false);
  assert.equal(isValidHttpsUrl("http://example.com/order"), false);
  assert.equal(isValidHttpsUrl(`https://example.com/${"a".repeat(MAX_QR_URL_LENGTH)}`), true);
  assert.equal(isValidQrTargetUrl(`https://example.com/${"a".repeat(MAX_QR_URL_LENGTH)}`), false);
  assert.equal(normalizeHttpsUrl("https://example.com/order"), "https://example.com/order");
  assert.equal(normalizeHttpsUrl("javascript:alert(1)"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("data:text/html,bad"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("http://example.com/order"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("   "), PLAY_STORE_URL);
});

test("Google Play 판별은 실제 호스트와 지구오더 앱 ID를 모두 확인한다", () => {
  assert.equal(isJiguorderPlayStoreUrl(PLAY_STORE_URL), true);
  assert.equal(isJiguorderPlayStoreUrl("https://example.com/?next=play.google.com"), false);
  assert.equal(isJiguorderPlayStoreUrl("https://play.google.com/store/apps/details?id=other.app"), false);
});

test("전단 QR은 사용자가 입력한 안전한 HTTPS 주소를 유지한다", () => {
  assert.equal(normalizeQrTargetUrl(PLAY_STORE_URL), PLAY_STORE_URL);
  assert.equal(normalizeQrTargetUrl("https://example.com/promotion?from=flyer"), "https://example.com/promotion?from=flyer");
  assert.equal(normalizeQrTargetUrl("https://user:password@example.com/order"), PLAY_STORE_URL);
});

test("라이브 DB 상품 필드를 전단 특가 카드 네 개로 불변 변환한다", () => {
  const products = [
    { code: "RICE-1", display_name: "칼로스 쌀", spec: "20kg", major_name: "쌀", sell: 49000, image_url: "https://cdn.example.com/rice.png" },
    { code: "KIMCHI-1", name: "배추김치", spec: "10kg", major_name: "김치", sell: 14500 },
    { code: "EGG-1", name: "특란", spec: "30구", major_name: "계란", sell: 8000 },
    { code: "PEPPER-1", name: "고춧가루", spec: "4kg", major_name: "공산품", sell: 36000 },
    { code: "EXTRA-1", name: "다섯 번째 상품", spec: "1개", major_name: "공산품", sell: 1000 },
  ];
  const snapshot = structuredClone(products);
  const featured = normalizeHeroProducts(products, {
    "RICE-1": { flyerPrice: 45900, heroBadge: "대표 특가", heroRank: 1 },
  });

  assert.equal(featured.length, 4);
  assert.deepEqual(products, snapshot);
  assert.deepEqual(featured[0], {
    code: "RICE-1",
    name: "칼로스 쌀",
    spec: "20kg",
    category: "쌀",
    basePrice: 49000,
    flyerPrice: 45900,
    badge: "대표 특가",
    rank: 1,
    imageUrl: "https://cdn.example.com/rice.png",
    originNote: "",
  });
});

test("품절·숨김 상품과 0원 가격은 특가 카드에서 제외한다", () => {
  const featured = normalizeHeroProducts([
    { code: "A", name: "품절", sell: 1000, sold_out: true },
    { code: "B", name: "숨김", sell: 1000, hidden: true },
    { code: "C", name: "0원", sell: 0 },
    { code: "D", name: "정상", sell: 1000 },
  ]);
  assert.deepEqual(featured.map((product) => product.code), ["D"]);
});

test("공산품·야채·전체 품목 수를 현재 카탈로그에서 계산한다", () => {
  const stats = computeCategoryStats([
    { code: "1", major_name: "공산품" },
    { code: "2", major_name: "야채" },
    { code: "3", major_name: "농산물", minor_name: "엽채" },
    { code: "4", major_name: "공산품", sold_out: true },
    { code: "5", major_name: "공산품", hidden: true },
  ]);
  assert.deepEqual(stats, { goodsCount: 1, vegetableCount: 1, totalCount: 3 });
});

test("양면 템플릿 기본 계약에는 배송 마감과 앱 QR이 포함된다", () => {
  const template = buildTemplateFromCatalog([
    { code: "1", name: "쌀", spec: "20kg", major_name: "공산품", sell: 49000 },
  ]);
  assert.equal(template.qrTargetUrl, PLAY_STORE_URL);
  assert.equal(template.backPage.deliveryPolicies[0].cutoffTime, "16:00");
  assert.equal(template.backPage.deliveryPolicies[1].cutoffTime, "21:00");
  assert.match(template.backPage.marketNote, /당일 경매가/);
  assert.match(template.backPage.marketNote, /전날 가격/);
});

test("사용자 QR의 기본 안내 문구는 Google Play 전용 표현을 남기지 않는다", () => {
  const products = ["A", "B", "C", "D"].map((code, index) => ({
    code,
    name: `상품 ${code}`,
    sell: (index + 1) * 1000,
  }));
  const template = buildTemplateFromCatalog(products, { qrTargetUrl: "https://brand.example.com/event" });
  const copy = defaultQrCopyForUrl(template.qrTargetUrl);
  assert.equal(template.frontPage.cta.title, copy.frontTitle);
  assert.equal(template.backPage.cta.platformLabel, copy.platformLabel);
  assert.doesNotMatch(`${template.frontPage.cta.body} ${template.backPage.cta.body}`, /Google Play/);
});

test("문구와 이미지 경로를 출력 안전한 값으로 정규화한다", () => {
  assert.equal(normalizeText("  안녕\u0000   하세요  ", "대체", 20), "안녕 하세요");
  assert.equal(normalizeText("   ", "대체"), "대체");
  assert.equal(normalizeImageUrl("/marketing-flyer/assets/rice.png"), "/marketing-flyer/assets/rice.png");
  assert.equal(normalizeImageUrl("../assets/rice.png"), "../assets/rice.png");
  assert.equal(normalizeImageUrl("javascript:bad"), "/marketing-flyer/assets/product-fallback.svg");
});

test("배열형 특가 override와 편집 가능한 양면 문구를 반영한다", () => {
  const products = [
    { code: "A", name: "상품 A", spec: "1kg", major_name: "공산품", sell: 10000 },
    { code: "B", name: "상품 B", spec: "2kg", major_name: "야채", sell: 20000 },
    { code: "C", name: "상품 C", spec: "3kg", major_name: "공산품", sell: 30000 },
    { code: "D", name: "상품 D", spec: "4kg", major_name: "공산품", sell: 40000 },
  ];
  const template = buildTemplateFromCatalog(products, {
    qrTargetUrl: "http://unsafe.example.com",
    contact: { phone: "02-000-0000", hours: "24시간", coverage: "전국" },
    frontPage: {
      headline: "이번 주 업장 특가",
      heroProducts: [{ sourceCode: "B", flyerName: "편집 상품", flyerPrice: 15900, heroRank: 1 }],
      rangeSummary: { goodsCount: 999, vegetableCount: -1, totalCount: 1000, categoryLine: "식자재 전 품목" },
      cta: { title: "앱에서 바로 주문" },
    },
    backPage: {
      headline: "오늘 주문, 내일 도착",
      deliveryPolicies: [{ cutoffTime: "99:00" }, { cutoffTime: "20:30", result: "익일 배송" }],
      appGuideSteps: [{ title: "설치", body: "QR을 스캔합니다." }],
    },
  });

  assert.equal(template.qrTargetUrl, PLAY_STORE_URL);
  assert.deepEqual(template.contact, { phone: "02-000-0000", hours: "24시간", coverage: "전국" });
  assert.equal(template.frontPage.heroProducts[0].code, "B");
  assert.equal(template.frontPage.heroProducts[0].name, "편집 상품");
  assert.equal(template.frontPage.heroProducts[0].flyerPrice, 15900);
  assert.equal(template.frontPage.rangeSummary.goodsCount, 999);
  assert.equal(template.frontPage.rangeSummary.vegetableCount, 1);
  assert.equal(template.backPage.deliveryPolicies[0].cutoffTime, "16:00");
  assert.equal(template.backPage.deliveryPolicies[1].cutoffTime, "20:30");
  assert.equal(template.backPage.appGuideSteps[0].title, "설치");
});

test("완성 전단 검증은 상품 개수·중복·가격·QR 오류를 모두 알린다", () => {
  const products = ["A", "B", "C", "D"].map((code, index) => ({
    code,
    name: `상품 ${code}`,
    sell: (index + 1) * 1000,
  }));
  const valid = buildTemplateFromCatalog(products);
  assert.deepEqual(validateTemplate(valid), []);

  const duplicate = {
    ...valid,
    qrTargetUrl: "javascript:alert(1)",
    frontPage: {
      ...valid.frontPage,
      heroProducts: valid.frontPage.heroProducts.map((product, index) => ({
        ...product,
        code: index === 1 ? "A" : product.code,
        flyerPrice: index === 2 ? 0 : product.flyerPrice,
      })),
    },
  };
  const errors = validateTemplate(duplicate);
  assert.ok(errors.some((error) => error.includes("중복")));
  assert.ok(errors.some((error) => error.includes("https://")));
  assert.ok(errors.some((error) => error.includes("행사가")));
  const short = { ...valid, frontPage: { ...valid.frontPage, heroProducts: [] } };
  assert.ok(validateTemplate(short).some((error) => error.includes("정확히 4개")));
});

test("저장한 상품명·규격·배지·순서·전단가격을 JSON에서 복원한다", () => {
  const products = ["A", "B", "C", "D"].map((code, index) => ({ code, name: `상품 ${code}`, sell: (index + 1) * 1000 }));
  const first = buildTemplateFromCatalog(products);
  first.frontPage.heroProducts[0] = {
    ...first.frontPage.heroProducts[0],
    name: "수정 상품명",
    spec: "수정 규격",
    badge: "주말 특가",
    rank: 4,
    flyerPrice: 12345,
  };
  first.frontPage.heroProducts[3] = { ...first.frontPage.heroProducts[3], rank: 1 };
  const restored = buildTemplateFromCatalog(products, JSON.parse(JSON.stringify(first)));
  const restoredProduct = restored.frontPage.heroProducts.find((product) => product.code === "A");
  assert.deepEqual(
    Object.fromEntries(["name", "spec", "badge", "rank", "flyerPrice"].map((key) => [key, restoredProduct?.[key]])),
    { name: "수정 상품명", spec: "수정 규격", badge: "주말 특가", rank: 4, flyerPrice: 12345 },
  );
});

test("수정한 브랜드 연락처와 HTTPS QR 주소를 JSON에서 복원한다", () => {
  const products = ["A", "B", "C", "D"].map((code, index) => ({
    code,
    name: `상품 ${code}`,
    sell: (index + 1) * 1000,
  }));
  const saved = buildTemplateFromCatalog(products, {
    contact: { phone: "010-1234-5678", hours: "매일 08:00-20:00", coverage: "전국 택배" },
    qrTargetUrl: "https://order.example.com/jigu?campaign=summer",
    frontPage: { cta: { title: "QR로 행사 페이지 열기", body: "이번 달 혜택을 확인하세요." } },
    backPage: {
      cta: {
        title: "QR로 온라인 주문",
        body: "브랜드 주문 페이지로 연결됩니다.",
        platformLabel: "지구농산 온라인 주문",
      },
    },
  });
  const restored = buildTemplateFromCatalog(products, JSON.parse(JSON.stringify(saved)));

  assert.deepEqual(restored.contact, saved.contact);
  assert.equal(restored.qrTargetUrl, "https://order.example.com/jigu?campaign=summer");
  assert.deepEqual(restored.frontPage.cta, saved.frontPage.cta);
  assert.deepEqual(restored.backPage.cta, saved.backPage.cta);
  assert.deepEqual(validateTemplate(restored), []);
});

test("배송 권역을 비우는 설정도 JSON에서 그대로 유지한다", () => {
  const products = ["A", "B", "C", "D"].map((code, index) => ({
    code,
    name: `상품 ${code}`,
    sell: (index + 1) * 1000,
  }));
  const saved = buildTemplateFromCatalog(products, {
    contact: { phone: "1566-1521", hours: "평일 09:00-17:00", coverage: "" },
  });
  const restored = buildTemplateFromCatalog(products, JSON.parse(JSON.stringify(saved)));

  assert.equal(restored.contact.coverage, "");
});
