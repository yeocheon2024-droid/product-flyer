export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.jiguorder.customer";

const DEFAULT_CONTACT = Object.freeze({
  phone: "1566-1521",
  hours: "평일 09:00-17:00",
  coverage: "인천·서울·경기",
});

export const DEFAULT_DELIVERY_POLICIES = Object.freeze([
  Object.freeze({
    type: "공산품 발주",
    days: "월요일-목요일",
    cutoffTime: "16:00",
    description: "오후 4시 이전 발주",
    result: "다음날 배송",
  }),
  Object.freeze({
    type: "야채 발주",
    days: "월요일-목요일",
    cutoffTime: "21:00",
    description: "오후 9시 이전 발주",
    result: "다음날 배송",
  }),
]);

const DEFAULT_STEPS = Object.freeze([
  Object.freeze({ title: "QR 접속·앱 설치", body: "QR을 스캔해 Google Play에서 올인원 발주 앱을 설치합니다." }),
  Object.freeze({ title: "회원가입·로그인", body: "사업자등록번호를 입력하고 거래처 등록을 진행합니다." }),
  Object.freeze({ title: "상품·수량 선택", body: "원하는 품목을 검색하고 필요한 수량을 장바구니에 담습니다." }),
  Object.freeze({ title: "주문 확인·완료", body: "배송정보와 마감시간을 확인한 뒤 주문을 완료합니다." }),
]);

const DEFAULT_RANGE_THUMBS = Object.freeze([
  "/marketing-flyer/assets/sugar.png",
  "/marketing-flyer/assets/ketchup.png",
  "/marketing-flyer/assets/seaweed.png",
  "/marketing-flyer/assets/green_onion.png",
  "/marketing-flyer/assets/onion.png",
  "/marketing-flyer/assets/mushroom.png",
]);

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
export function normalizeText(value, fallback = "", maxLength = 180) {
  const normalized = String(value ?? "")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return normalized || fallback;
}

export function normalizeHttpsUrl(value, fallback = PLAY_STORE_URL) {
  try {
    const parsed = new URL(String(value ?? "").trim());
    return parsed.protocol === "https:" ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeQrTargetUrl(value) {
  const normalized = normalizeHttpsUrl(value, PLAY_STORE_URL);
  try {
    const parsed = new URL(normalized);
    if (
      parsed.hostname === "play.google.com" &&
      parsed.pathname === "/store/apps/details" &&
      parsed.searchParams.get("id") === "com.jiguorder.customer"
    ) {
      return PLAY_STORE_URL;
    }
  } catch {
    // The fixed Play Store URL below is always safe.
  }
  return PLAY_STORE_URL;
}

export function normalizeImageUrl(
  value,
  fallback = "/marketing-flyer/assets/product-fallback.svg",
) {
  const candidate = String(value ?? "").trim();
  if (/^\/(?!\/)/.test(candidate) || /^\.\.?\//.test(candidate)) {
    return candidate;
  }
  return normalizeHttpsUrl(candidate, fallback);
}

function normalizePrice(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function normalizeCount(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function isVisibleProduct(product) {
  return Boolean(product) && product.hidden !== true && product.sold_out !== true;
}

function toOverrideMap(overrides) {
  if (Array.isArray(overrides)) {
    return Object.fromEntries(
      overrides
        .filter(Boolean)
        .map((item) => [String(item.code ?? item.sourceCode ?? ""), item]),
    );
  }
  return overrides && typeof overrides === "object" ? overrides : {};
}

export function normalizeHeroProducts(products = [], overrides = {}) {
  const overrideMap = toOverrideMap(overrides);

  return products
    .filter(isVisibleProduct)
    .map((product, index) => {
      const code = normalizeText(product.code ?? product.id, `product-${index + 1}`, 80);
      const override = overrideMap[code] ?? {};
      const basePrice = normalizePrice(override.basePrice ?? product.basePrice ?? product.sell);
      const flyerPrice = normalizePrice(
        override.flyerPrice ?? product.flyerPrice ?? product.salePrice,
        basePrice,
      );

      return {
        code,
        name: normalizeText(
          override.flyerName ??
            override.name ??
            product.flyerName ??
            product.display_name ??
            product.name,
          "상품명 확인 필요",
          50,
        ),
        spec: normalizeText(
          override.flyerSpec ?? override.spec ?? product.flyerSpec ?? product.spec,
          "규격 확인",
          30,
        ),
        category: normalizeText(product.major_name ?? product.category, "기타", 30),
        basePrice,
        flyerPrice,
        badge: normalizeText(
          override.heroBadge ?? override.badge ?? product.heroBadge,
          "수량 한정 초특가",
          24,
        ),
        rank: normalizePrice(
          override.heroRank ?? override.rank ?? product.heroRank,
          index + 100,
        ),
        imageUrl: normalizeImageUrl(override.imageUrl ?? product.image_url ?? product.imageUrl),
        originNote: normalizeText(
          override.originNote ??
            override.origin_note ??
            product.originNote ??
            product.origin_note ??
            product.origin,
          "",
          30,
        ),
      };
    })
    .filter((product) => product.flyerPrice > 0)
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 4)
    .map((product, index) => ({ ...product, rank: index + 1 }));
}

export function computeCategoryStats(products = []) {
  const visible = products.filter(isVisibleProduct);
  const categoryOf = (product) => String(product.major_name ?? product.category ?? "").trim();

  return {
    goodsCount: visible.filter((product) => categoryOf(product) === "공산품").length,
    vegetableCount: visible.filter((product) => categoryOf(product) === "야채").length,
    totalCount: visible.length,
  };
}

function normalizeTime(value, fallback) {
  const candidate = normalizeText(value, fallback, 5);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
}

function normalizeDeliveryPolicies(policies) {
  return DEFAULT_DELIVERY_POLICIES.map((defaultPolicy, index) => {
    const source = Array.isArray(policies) ? policies[index] ?? {} : {};
    return {
      ...defaultPolicy,
      type: normalizeText(source.type, defaultPolicy.type, 30),
      days: normalizeText(source.days, defaultPolicy.days, 30),
      cutoffTime: normalizeTime(source.cutoffTime, defaultPolicy.cutoffTime),
      description: normalizeText(source.description, defaultPolicy.description, 50),
      result: normalizeText(source.result, defaultPolicy.result, 30),
    };
  });
}

function normalizeSteps(steps) {
  return DEFAULT_STEPS.map((defaultStep, index) => {
    const source = Array.isArray(steps) ? steps[index] ?? {} : {};
    return {
      title: normalizeText(source.title, defaultStep.title, 40),
      body: normalizeText(source.body, defaultStep.body, 130),
    };
  });
}

export function buildTemplateFromCatalog(products = [], overrides = {}) {
  const stats = computeCategoryStats(products);
  const frontOverrides = overrides.frontPage ?? {};
  const backOverrides = overrides.backPage ?? {};
  const rangeOverrides = frontOverrides.rangeSummary ?? {};
  const heroOverrides = frontOverrides.heroProducts ?? overrides.heroProducts ?? {};

  return {
    schemaVersion: 1,
    layoutId: "PROMO_DUPLEX",
    templateId: "promo_duplex_food_v1",
    templateName: "지구농산 식자재 홍보전단 양면",
    updatedAt: normalizeText(
      overrides.updatedAt,
      new Date().toISOString().slice(0, 10),
      10,
    ),
    qrTargetUrl: normalizeQrTargetUrl(overrides.qrTargetUrl),
    // Public flyer output always uses the verified company contact details.
    contact: { ...DEFAULT_CONTACT },
    frontPage: {
      headline: normalizeText(
        frontOverrides.headline,
        "매일 쓰는 식자재, 가격부터 확 낮췄습니다!",
        60,
      ),
      statusPill: normalizeText(frontOverrides.statusPill, "가격 검토용 초안", 24),
      heroProducts: normalizeHeroProducts(products, heroOverrides),
      rangeSummary: {
        goodsCount: normalizeCount(rangeOverrides.goodsCount, stats.goodsCount),
        vegetableCount: normalizeCount(rangeOverrides.vegetableCount, stats.vegetableCount),
        totalCount: normalizeCount(rangeOverrides.totalCount, stats.totalCount),
        categoryLine: normalizeText(
          rangeOverrides.categoryLine,
          "쌀·김치·계란·고춧가루·소스·냉동·면류·통조림·농산물",
          100,
        ),
        thumbAssets: (Array.isArray(rangeOverrides.thumbAssets)
          ? rangeOverrides.thumbAssets
          : DEFAULT_RANGE_THUMBS
        )
          .slice(0, 6)
          .map((asset) => normalizeImageUrl(asset)),
      },
      cta: {
        pill: normalizeText(
          frontOverrides.cta?.pill,
          "월-목 마감시간 내 주문 시 다음날 배송",
          60,
        ),
        title: normalizeText(
          frontOverrides.cta?.title,
          "QR 찍고 앱 설치 후 전체 품목 확인·간편 발주",
          70,
        ),
        body: normalizeText(
          frontOverrides.cta?.body,
          "QR은 안드로이드 Google Play 설치 화면으로 연결됩니다.",
          100,
        ),
      },
      footerNote: normalizeText(
        frontOverrides.footerNote,
        "가격 검토용 초안입니다. 배포 전 원가·재고·행사기간·한정수량을 최종 확정해 주세요.",
        220,
      ),
    },
    backPage: {
      headline: normalizeText(backOverrides.headline, "마감 전에 주문하고, 다음 날 받으세요", 60),
      subhead: normalizeText(
        backOverrides.subhead,
        "공산품과 야채를 앱에서 빠르고 간편하게 발주",
        80,
      ),
      deliveryPolicies: normalizeDeliveryPolicies(backOverrides.deliveryPolicies),
      marketNote: normalizeText(
        backOverrides.marketNote,
        "야채는 당일 경매가로 가격이 책정되어 전날 가격과 달라질 수 있습니다.",
        130,
      ),
      appGuideSteps: normalizeSteps(backOverrides.appGuideSteps),
      cta: {
        eyebrow: normalizeText(backOverrides.cta?.eyebrow, "지금 바로 시작하세요", 30),
        title: normalizeText(backOverrides.cta?.title, "QR 찍고 발주앱 설치", 50),
        body: normalizeText(backOverrides.cta?.body, "Google Play · 올인원 발주", 50),
      },
      footerNote: normalizeText(
        backOverrides.footerNote,
        "금·토·일 및 공휴일 발주·배송 일정은 담당자에게 문의해 주세요.",
        180,
      ),
    },
  };
}

export function validateTemplate(template) {
  const errors = [];
  if (template?.frontPage?.heroProducts?.length !== 4) {
    errors.push("특가상품을 정확히 4개 선택해 주세요.");
  }
  if (new Set(template?.frontPage?.heroProducts?.map((product) => product.code)).size !== 4) {
    errors.push("같은 상품을 중복 선택할 수 없습니다.");
  }
  if (template?.qrTargetUrl !== PLAY_STORE_URL) {
    errors.push("QR 링크는 지구오더 Google Play 앱 주소만 사용할 수 있습니다.");
  }
  template?.frontPage?.heroProducts?.forEach((product) => {
    if (!Number.isInteger(product.flyerPrice) || product.flyerPrice <= 0) {
      errors.push(`${product.name}: 행사가를 확인해 주세요.`);
    }
  });
  return errors;
}
