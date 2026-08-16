import { isJiguorderPlayStoreUrl } from "./model.js";


const RANGE_LABELS = ["쌀·잡곡", "김치·반찬", "계란", "공산품", "야채", "수산·축산"];


const formatPrice = (value) => {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return "가격문의";
  }

  return price.toLocaleString("ko-KR");
};


const revealImageFallback = ({ currentTarget }) => {
  currentTarget.classList.add("mkt-media__image--failed");
};


const productValue = (product, ...keys) => {
  const key = keys.find((candidate) => product?.[candidate] !== undefined);
  return key ? product[key] : "";
};


function BrandLockup({ inverse = false }) {
  return (
    <div className={`mkt-brand${inverse ? " mkt-brand--inverse" : ""}`}>
      <span className="mkt-brand__mark" aria-hidden="true">
        <i />
        <b>J</b>
      </span>
      <span className="mkt-brand__copy">
        <strong>지구농산</strong>
        <small>FOODSERVICE PARTNER</small>
      </span>
    </div>
  );
}


function QrCode({ qrDataUrl, label }) {
  return (
    <div className="mkt-qr" aria-label={label}>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt={label} />
      ) : (
        <span className="mkt-qr__placeholder" aria-hidden="true">
          QR
        </span>
      )}
    </div>
  );
}


function ProductCard({ product, featured }) {
  const name = productValue(product, "flyerName", "name", "display_name") || "추천 상품";
  const spec = productValue(product, "flyerSpec", "spec");
  const origin = productValue(product, "originNote");
  const badge = productValue(product, "heroBadge", "badge") || "이번 주 추천";
  const basePrice = productValue(product, "basePrice", "sell");
  const flyerPrice = productValue(product, "flyerPrice") || basePrice;
  const imageUrl = productValue(product, "asset", "imageUrl", "image_url");
  const original = Number(basePrice);
  const special = Number(flyerPrice);
  const discountRate =
    Number.isFinite(original) && Number.isFinite(special) && original > special
      ? Math.round(((original - special) / original) * 100)
      : 0;

  return (
    <article
      className={`mkt-product${featured ? " mkt-product--featured" : ""}${
        product.placeholder ? " mkt-product--placeholder" : ""
      }`}
    >
      <div className="mkt-product__media">
        <span className="mkt-product__fallback" aria-hidden="true">
          신선<br />식자재
        </span>
        {imageUrl ? (
          <img
            className="mkt-product__image"
            src={imageUrl}
            alt={String(name)}
            onError={revealImageFallback}
          />
        ) : null}
        <span className="mkt-product__badge">{badge}</span>
        {discountRate > 0 ? <strong className="mkt-product__discount">-{discountRate}%</strong> : null}
      </div>
      <div className="mkt-product__copy">
        <p className="mkt-product__kicker">업장용 엄선 품목</p>
        <h2>{name}</h2>
        <p className="mkt-product__meta">{[origin, spec].filter(Boolean).join(" · ")}</p>
        {original > special ? (
          <p className="mkt-product__base-price">정상가 {formatPrice(original)}원</p>
        ) : (
          <span className="mkt-product__price-spacer" aria-hidden="true" />
        )}
        <p className="mkt-product__sale-price">
          <strong>{formatPrice(special)}</strong>
          {special > 0 ? <span>원</span> : null}
        </p>
      </div>
    </article>
  );
}


function RangeThumb({ thumb, index }) {
  const imageUrl = typeof thumb === "string" ? thumb : thumb?.asset || thumb?.imageUrl;
  const label = typeof thumb === "object" && thumb?.label ? thumb.label : RANGE_LABELS[index];

  return (
    <div className="mkt-range-thumb">
      <span className="mkt-range-thumb__media">
        <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
        {imageUrl ? (
          <img src={imageUrl} alt="" onError={revealImageFallback} />
        ) : null}
      </span>
      <strong>{label || "다양한 품목"}</strong>
    </div>
  );
}


function ContactBlock({ contact, inverse = false }) {
  return (
    <div className={`mkt-contact${inverse ? " mkt-contact--inverse" : ""}`}>
      <span>견적 · 주문 상담</span>
      <strong>{contact?.phone || "1566-1521"}</strong>
      <small>{contact?.hours || "평일 09:00-17:00"}</small>
      {contact?.coverage ? <small>{contact.coverage}</small> : null}
    </div>
  );
}


export function MarketingFlyerDocument({ template, qrDataUrl }) {
  if (!template) {
    return <p className="mkt-flyer-document__empty">전단 데이터를 불러오는 중입니다.</p>;
  }

  const {
    frontPage = {},
    backPage = {},
    contact = {},
    qrTargetUrl = "",
  } = template;
  const heroProducts = Array.isArray(frontPage.heroProducts)
    ? frontPage.heroProducts.slice(0, 4)
    : [];
  const heroProductSlots = Array.from({ length: 4 }, (_, index) =>
    heroProducts[index] || {
      code: `empty-product-${index + 1}`,
      name: "특가 상품을 선택하세요",
      spec: "편집 패널에서 상품 연결",
      badge: "상품 대기",
      flyerPrice: 0,
      placeholder: true,
    },
  );
  const rangeSummary = frontPage.rangeSummary || {};
  const rangeThumbs = Array.isArray(rangeSummary.thumbAssets)
    ? rangeSummary.thumbAssets.slice(0, 6)
    : [];
  const deliveryPolicies = Array.isArray(backPage.deliveryPolicies)
    ? backPage.deliveryPolicies.slice(0, 2)
    : [];
  const appGuideSteps = Array.isArray(backPage.appGuideSteps)
    ? backPage.appGuideSteps.slice(0, 4)
    : [];
  const totalCount =
    Number(rangeSummary.totalCount) ||
    Number(rangeSummary.goodsCount || 0) + Number(rangeSummary.vegetableCount || 0);
  const qrLabel = isJiguorderPlayStoreUrl(qrTargetUrl)
    ? "Google Play 올인원 발주 앱 설치 QR 코드"
    : "지구농산 발주 서비스 QR 코드";

  return (
    <div className="mkt-flyer-document">
      <section className="flyer-a4 mkt-page mkt-page--front" data-export-page="front" aria-label="홍보 전단 앞면">
        <header className="mkt-front-hero">
          <div className="mkt-front-hero__topline">
            <BrandLockup inverse />
            <span className="mkt-status-pill">{frontPage.statusPill || "사업자 전용 특가"}</span>
          </div>
          <div className="mkt-front-hero__copy">
            <p>오늘 필요한 식자재, 내일 매장 앞으로</p>
            <h1>{frontPage.headline || "매일 쓰는 식자재, 가격부터 다릅니다"}</h1>
          </div>
          <div className="mkt-front-hero__seal">
            <small>현재 취급</small>
            <strong>{totalCount ? totalCount.toLocaleString("ko-KR") : "900+"}</strong>
            <span>ITEMS</span>
          </div>
          <span className="mkt-front-hero__stamp" aria-hidden="true">WHOLESALE · FRESH · DIRECT</span>
        </header>

        <main className="mkt-front-content">
          <section className="mkt-product-grid" aria-label="이번 주 대표 특가">
            {heroProductSlots.map((product, index) => (
              <ProductCard
                key={product.code || `${productValue(product, "flyerName", "name")}-${index}`}
                product={product}
                featured={index < 2}
              />
            ))}
          </section>

          <section className="mkt-range-panel" aria-label="취급 품목 안내">
            <div className="mkt-range-panel__heading">
              <div>
                <span>ONE STOP FOOD SUPPLY</span>
                <h2>공산품부터 매일 경매 야채까지</h2>
              </div>
              <p>
                공산품 <strong>{Number(rangeSummary.goodsCount || 0).toLocaleString("ko-KR")}</strong>
                <i>+</i>
                야채 <strong>{Number(rangeSummary.vegetableCount || 0).toLocaleString("ko-KR")}</strong>
              </p>
            </div>
            <div className="mkt-range-panel__thumbs">
              {RANGE_LABELS.map((_, index) => (
                <RangeThumb key={RANGE_LABELS[index]} thumb={rangeThumbs[index]} index={index} />
              ))}
            </div>
            <div className="mkt-range-panel__line">
              <span>{rangeSummary.categoryLine || "쌀 · 김치 · 계란 · 고춧가루 · 공산품 · 야채 외 다양한 식자재"}</span>
              <strong>필요한 품목을 한 번에</strong>
            </div>
          </section>
        </main>

        <footer className="mkt-front-footer">
          <QrCode qrDataUrl={qrDataUrl} label={qrLabel} />
          <div className="mkt-front-footer__cta">
            <span>{frontPage.cta?.pill || "마감 전 주문하면 다음 날 배송"}</span>
            <h2>{frontPage.cta?.title || "QR 찍고 앱에서 간편 발주"}</h2>
            <p>{frontPage.cta?.body || "전체 품목과 실시간 공급가를 빠르게 확인하세요."}</p>
          </div>
          <ContactBlock contact={contact} inverse />
          <p className="mkt-front-footer__note">{frontPage.footerNote}</p>
        </footer>
      </section>

      <section className="flyer-a4 mkt-page mkt-page--back" data-export-page="back" aria-label="홍보 전단 뒷면">
        <header className="mkt-back-hero">
          <BrandLockup inverse />
          <div className="mkt-back-hero__copy">
            <span>DELIVERY &amp; ORDER GUIDE</span>
            <h1>{backPage.headline || "마감 전에 주문하고, 다음 날 받으세요"}</h1>
            <p>{backPage.subhead || "공산품과 야채를 앱에서 빠르고 간편하게 발주"}</p>
          </div>
          <div className="mkt-back-hero__seal" aria-label="다음 날 배송">
            <strong>NEXT</strong>
            <strong>DAY</strong>
            <small>월-목 발주 기준</small>
          </div>
        </header>

        <main className="mkt-back-content">
          <section className="mkt-deadlines" aria-labelledby="mkt-deadline-title">
            <div className="mkt-section-heading">
              <div>
                <span>01 · DELIVERY</span>
                <h2 id="mkt-deadline-title">품목별 주문 마감시간</h2>
              </div>
              <p>월요일-목요일 발주 기준</p>
            </div>
            <div className="mkt-deadlines__grid">
              {deliveryPolicies.map((policy, index) => (
                <article
                  className={`mkt-deadline-card ${index === 1 ? "mkt-deadline-card--green" : "mkt-deadline-card--orange"}`}
                  key={`${policy.type}-${policy.cutoffTime}`}
                >
                  <div className="mkt-deadline-card__top">
                    <h3>{policy.type}</h3>
                    <span>{policy.days || "MON-THU"}</span>
                  </div>
                  <p className="mkt-deadline-card__time">{policy.cutoffTime}</p>
                  <p className="mkt-deadline-card__description">{policy.description}</p>
                  <strong>{policy.result || "다음 날 배송"}</strong>
                </article>
              ))}
            </div>
            <div className="mkt-market-note">
              <span>야채 가격 안내</span>
              <p>{backPage.marketNote}</p>
            </div>
          </section>

          <section className="mkt-app-guide" aria-labelledby="mkt-app-guide-title">
            <div className="mkt-section-heading mkt-section-heading--guide">
              <div>
                <span>02 · SMART ORDER</span>
                <h2 id="mkt-app-guide-title">발주 앱, 4단계면 끝</h2>
              </div>
              <p>전화 없이 24시간 품목 확인 · 발주</p>
            </div>
            <div className="mkt-step-grid">
              {appGuideSteps.map((guide, index) => (
                <article className="mkt-step-card" key={guide.step || guide.title || index}>
                  <span className="mkt-step-card__number">{guide.step || String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{guide.title}</h3>
                    <p>{guide.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer className="mkt-back-footer">
          <div className="mkt-back-footer__qr-column">
            <QrCode qrDataUrl={qrDataUrl} label={qrLabel} />
            <span>카메라로 스캔</span>
          </div>
          <div className="mkt-back-footer__cta">
            <span>{backPage.cta?.eyebrow || "지금 바로 시작하세요"}</span>
            <h2>{backPage.cta?.title || "QR 찍고 발주 앱 설치"}</h2>
            <p>{backPage.cta?.body || "Google Play에서 올인원 발주를 만나보세요."}</p>
            <small>{backPage.cta?.platformLabel || "Google Play · 올인원 발주"}</small>
          </div>
          <ContactBlock contact={contact} inverse />
          <p className="mkt-back-footer__note">{backPage.footerNote}</p>
        </footer>
      </section>
    </div>
  );
}


export default MarketingFlyerDocument;
