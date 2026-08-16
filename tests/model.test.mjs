import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAY_STORE_URL,
  buildTemplateFromCatalog,
  computeCategoryStats,
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
  assert.equal(normalizeHttpsUrl("https://example.com/order"), "https://example.com/order");
  assert.equal(normalizeHttpsUrl("javascript:alert(1)"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("data:text/html,bad"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("http://example.com/order"), PLAY_STORE_URL);
  assert.equal(normalizeHttpsUrl("   "), PLAY_STORE_URL);
});

test("전단 QR은 지구오더 Google Play 주소로 고정한다", () => {
  assert.equal(normalizeQrTargetUrl(PLAY_STORE_URL), PLAY_STORE_URL);
  assert.equal(normalizeQrTargetUrl("https://example.com/phishing"), PLAY_STORE_URL);
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
  assert.equal(template.contact.phone, "1566-1521");
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
  assert.ok(errors.some((error) => error.includes("Google Play")));
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
