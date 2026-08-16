import {
  MAX_QR_URL_LENGTH,
  PLAY_STORE_URL,
  defaultQrCopyForUrl,
  isJiguorderPlayStoreUrl,
  isValidQrTargetUrl,
  normalizeHeroProducts,
} from "./model.js";
import { ProductSearchPicker } from "./ProductSearchPicker.jsx";


function Field({ label, children, wide = false }) {
  return (
    <label className={`mkt-field${wide ? " mkt-field--wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function MarketingFlyerEditor({ template, catalog, onChange, onRecalculate }) {
  const updateContact = (key, value) =>
    onChange({ ...template, contact: { ...template.contact, [key]: value } });

  const updateQrTargetUrl = (value) => {
    const nextUsesPlayStore = isJiguorderPlayStoreUrl(value);
    const previousCopy = defaultQrCopyForUrl(nextUsesPlayStore ? "https://example.com" : PLAY_STORE_URL);
    const nextCopy = defaultQrCopyForUrl(value);
    const targetIsValid = isValidQrTargetUrl(value);
    const replaceDefault = (current, previous, next) => current === previous ? next : current;

    onChange({
      ...template,
      qrTargetUrl: value,
      frontPage: targetIsValid ? {
        ...template.frontPage,
        cta: {
          ...template.frontPage.cta,
          title: replaceDefault(template.frontPage.cta.title, previousCopy.frontTitle, nextCopy.frontTitle),
          body: replaceDefault(template.frontPage.cta.body, previousCopy.frontBody, nextCopy.frontBody),
        },
      } : template.frontPage,
      backPage: targetIsValid ? {
        ...template.backPage,
        cta: {
          ...template.backPage.cta,
          title: replaceDefault(template.backPage.cta.title, previousCopy.backTitle, nextCopy.backTitle),
          body: replaceDefault(template.backPage.cta.body, previousCopy.backBody, nextCopy.backBody),
          platformLabel: replaceDefault(
            template.backPage.cta.platformLabel,
            previousCopy.platformLabel,
            nextCopy.platformLabel,
          ),
        },
      } : template.backPage,
    });
  };

  const qrTargetIsValid = isValidQrTargetUrl(template.qrTargetUrl);

  const updateFront = (key, value) =>
    onChange({ ...template, frontPage: { ...template.frontPage, [key]: value } });

  const updateFrontCta = (key, value) =>
    updateFront("cta", { ...template.frontPage.cta, [key]: value });

  const updateRange = (key, value) =>
    updateFront("rangeSummary", {
      ...template.frontPage.rangeSummary,
      [key]: Number.isNaN(Number(value)) ? 0 : Math.max(0, Number(value)),
    });

  const updateProduct = (index, patch) => {
    const heroProducts = template.frontPage.heroProducts.map((product, productIndex) =>
      productIndex === index ? { ...product, ...patch } : product,
    );
    updateFront("heroProducts", heroProducts);
  };

  const selectProduct = (index, code) => {
    const selected = catalog.find((product) => String(product.code ?? product.id) === code);
    const normalized = normalizeHeroProducts(selected ? [selected] : [])[0];
    if (normalized) updateProduct(index, { ...normalized, rank: index + 1 });
  };

  const updateBack = (key, value) =>
    onChange({ ...template, backPage: { ...template.backPage, [key]: value } });

  const updateBackCta = (key, value) =>
    updateBack("cta", { ...template.backPage.cta, [key]: value });

  const updatePolicy = (index, key, value) => {
    const deliveryPolicies = template.backPage.deliveryPolicies.map((policy, policyIndex) =>
      policyIndex === index ? { ...policy, [key]: value } : policy,
    );
    updateBack("deliveryPolicies", deliveryPolicies);
  };

  return (
    <aside className="mkt-editor" aria-label="양면 홍보전단 편집">
      <div className="mkt-editor__intro">
        <span className="mkt-kicker">PROMO DUPLEX</span>
        <h1>양면 홍보전단</h1>
        <p>상품 가격은 전단 문서에만 저장되며 DB 판매단가는 바꾸지 않습니다.</p>
      </div>

      <details open>
        <summary>브랜드·QR</summary>
        <div className="mkt-fields mkt-brand-settings">
          <Field label="문의 전화">
            <input
              type="tel"
              required
              maxLength={30}
              value={template.contact.phone}
              onChange={(event) => updateContact("phone", event.target.value)}
            />
          </Field>
          <Field label="상담 시간">
            <input
              required
              maxLength={50}
              value={template.contact.hours}
              onChange={(event) => updateContact("hours", event.target.value)}
            />
          </Field>
          <Field label="배송 권역">
            <input
              maxLength={60}
              value={template.contact.coverage}
              onChange={(event) => updateContact("coverage", event.target.value)}
            />
          </Field>
          <Field label="QR 연결 주소" wide>
            <input
              className={qrTargetIsValid ? "" : "mkt-brand-settings__input--invalid"}
              type="url"
              inputMode="url"
              required
              maxLength={MAX_QR_URL_LENGTH}
              spellCheck={false}
              autoCapitalize="none"
              placeholder="https://example.com"
              value={template.qrTargetUrl}
              aria-invalid={!qrTargetIsValid}
              aria-describedby="mkt-qr-url-help"
              onChange={(event) => updateQrTargetUrl(event.target.value)}
            />
          </Field>
          <small
            className={`mkt-brand-settings__hint${qrTargetIsValid ? "" : " mkt-brand-settings__hint--error"}`}
            id="mkt-qr-url-help"
          >
            {qrTargetIsValid
              ? "https:// 주소를 변경하면 미리보기 QR도 바로 갱신됩니다."
              : `인증정보 없이 ${MAX_QR_URL_LENGTH}자 이하의 https:// 전체 주소를 입력해 주세요.`}
          </small>
          <Field label="앞면 QR 제목" wide>
            <input
              maxLength={70}
              value={template.frontPage.cta.title}
              onChange={(event) => updateFrontCta("title", event.target.value)}
            />
          </Field>
          <Field label="앞면 QR 설명" wide>
            <input
              maxLength={100}
              value={template.frontPage.cta.body}
              onChange={(event) => updateFrontCta("body", event.target.value)}
            />
          </Field>
          <Field label="뒷면 QR 제목" wide>
            <input
              maxLength={50}
              value={template.backPage.cta.title}
              onChange={(event) => updateBackCta("title", event.target.value)}
            />
          </Field>
          <Field label="뒷면 QR 설명" wide>
            <input
              maxLength={50}
              value={template.backPage.cta.body}
              onChange={(event) => updateBackCta("body", event.target.value)}
            />
          </Field>
          <Field label="뒷면 QR 하단 문구" wide>
            <input
              maxLength={50}
              value={template.backPage.cta.platformLabel}
              onChange={(event) => updateBackCta("platformLabel", event.target.value)}
            />
          </Field>
        </div>
      </details>

      <details open>
        <summary>1면 특가상품</summary>
        <div className="mkt-fields">
          <Field label="메인 문구" wide><input value={template.frontPage.headline} onChange={(event) => updateFront("headline", event.target.value)} /></Field>
          <Field label="상태 문구" wide><input value={template.frontPage.statusPill} onChange={(event) => updateFront("statusPill", event.target.value)} /></Field>
        </div>
        <div className="mkt-editor__products">
          {template.frontPage.heroProducts.map((product, index) => (
            <section className="mkt-editor-product" key={`${product.code}-${index}`}>
              <strong>{index + 1}번 특가</strong>
              <ProductSearchPicker
                catalog={catalog}
                value={product.code}
                selectedCodes={template.frontPage.heroProducts.map((item) => String(item.code))}
                slotNumber={index + 1}
                onSelect={(code) => selectProduct(index, code)}
              />
              <div className="mkt-fields">
                <Field label="전단 상품명"><input value={product.name} onChange={(event) => updateProduct(index, { name: event.target.value })} /></Field>
                <Field label="규격"><input value={product.spec} onChange={(event) => updateProduct(index, { spec: event.target.value })} /></Field>
                <Field label="정상가"><input type="number" min="1" step="100" value={product.basePrice} onChange={(event) => updateProduct(index, { basePrice: Number(event.target.value) })} /></Field>
                <Field label="행사가"><input type="number" min="1" step="100" value={product.flyerPrice} onChange={(event) => updateProduct(index, { flyerPrice: Number(event.target.value) })} /></Field>
                <Field label="원산지·비고"><input value={product.originNote} onChange={(event) => updateProduct(index, { originNote: event.target.value })} /></Field>
                <Field label="배지"><input value={product.badge} onChange={(event) => updateProduct(index, { badge: event.target.value })} /></Field>
              </div>
            </section>
          ))}
        </div>
      </details>

      <details>
        <summary>취급품목 숫자</summary>
        <div className="mkt-fields mkt-fields--counts">
          <Field label="공산품"><input type="number" min="0" value={template.frontPage.rangeSummary.goodsCount} onChange={(event) => updateRange("goodsCount", event.target.value)} /></Field>
          <Field label="야채"><input type="number" min="0" value={template.frontPage.rangeSummary.vegetableCount} onChange={(event) => updateRange("vegetableCount", event.target.value)} /></Field>
          <Field label="전체"><input type="number" min="0" value={template.frontPage.rangeSummary.totalCount} onChange={(event) => updateRange("totalCount", event.target.value)} /></Field>
        </div>
        <Field label="대표 카테고리 문구" wide>
          <input
            value={template.frontPage.rangeSummary.categoryLine}
            onChange={(event) => updateFront("rangeSummary", {
              ...template.frontPage.rangeSummary,
              categoryLine: event.target.value,
            })}
          />
        </Field>
        <button className="mkt-button mkt-button--secondary" type="button" onClick={onRecalculate}>현재 카탈로그에서 다시 계산</button>
      </details>

      <details>
        <summary>앞면 안내 문구</summary>
        <Field label="하단 주의사항" wide><textarea rows="4" value={template.frontPage.footerNote} onChange={(event) => updateFront("footerNote", event.target.value)} /></Field>
      </details>

      <details open>
        <summary>2면 배송 마감</summary>
        <Field label="2면 메인 문구" wide><input value={template.backPage.headline} onChange={(event) => updateBack("headline", event.target.value)} /></Field>
        <div className="mkt-fields">
          {template.backPage.deliveryPolicies.map((policy, index) => (
            <Field label={`${policy.type} 마감`} key={policy.type}>
              <input type="time" value={policy.cutoffTime} onChange={(event) => updatePolicy(index, "cutoffTime", event.target.value)} />
            </Field>
          ))}
          <Field label="야채 경매가 안내" wide><textarea rows="3" value={template.backPage.marketNote} onChange={(event) => updateBack("marketNote", event.target.value)} /></Field>
          <Field label="뒷면 하단 안내" wide><textarea rows="3" value={template.backPage.footerNote} onChange={(event) => updateBack("footerNote", event.target.value)} /></Field>
        </div>
      </details>
    </aside>
  );
}
