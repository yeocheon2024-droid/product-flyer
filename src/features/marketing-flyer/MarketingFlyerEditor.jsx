import { normalizeHeroProducts } from "./model.js";


function Field({ label, children, wide = false }) {
  return (
    <label className={`mkt-field${wide ? " mkt-field--wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function MarketingFlyerEditor({ template, catalog, onChange, onRecalculate }) {
  const updateFront = (key, value) =>
    onChange({ ...template, frontPage: { ...template.frontPage, [key]: value } });

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
        <div className="mkt-fields">
          <Field label="문의 전화 (고정)"><input value={template.contact.phone} readOnly /></Field>
          <Field label="상담 시간 (고정)"><input value={template.contact.hours} readOnly /></Field>
          <Field label="배송 권역 (고정)"><input value={template.contact.coverage} readOnly /></Field>
          <Field label="QR 연결 주소 (Google Play 고정)" wide><input type="url" value={template.qrTargetUrl} readOnly /></Field>
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
              <select value={product.code} onChange={(event) => selectProduct(index, event.target.value)} aria-label={`${index + 1}번 상품 선택`}>
                {catalog.map((item) => (
                  <option key={item.code ?? item.id} value={item.code ?? item.id}>
                    {item.display_name || item.name} · {item.spec || "규격 미등록"}
                  </option>
                ))}
              </select>
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
