import { ORDER_SITE_URL } from './OrderPhotoGuide.jsx';
import { useEffect, useMemo, useRef, useState } from "react";

import { MarketingFlyerDocument } from "./MarketingFlyerDocument.jsx";
import { MarketingFlyerEditor } from "./MarketingFlyerEditor.jsx";
import { downloadTemplateJson, exportDuplexPdf, exportDuplexPng } from "./exportFlyer.js";
import { buildTemplateFromCatalog, computeCategoryStats, computeCatalogCategories, validateTemplate } from "./model.js";
import { createQrDataUrl } from "./qr.js";


/**
 * @param {{ initialProducts?: any[], initialOverrides?: Record<string, any> }} props
 */
export function MarketingFlyerWorkspace({ initialProducts = [], initialOverrides = {} }) {
  const catalog = useMemo(() => initialProducts.map((product) => ({ ...product })), [initialProducts]);
  const [template, setTemplate] = useState(() => buildTemplateFromCatalog(catalog, initialOverrides));
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [orderQrDataUrl, setOrderQrDataUrl] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [priceApproved, setPriceApproved] = useState(false);
  const documentRoot = useRef(null);
  const importInput = useRef(null);
  const errors = validateTemplate(template);

  const updateTemplate = (nextTemplate) => {
    setTemplate(nextTemplate);
    setPriceApproved(false);
  };

  useEffect(() => {
    let active = true;
    Promise.all([createQrDataUrl(template.qrTargetUrl), createQrDataUrl(ORDER_SITE_URL)])
      .then(([value, orderValue]) => { if (active) { setQrDataUrl(value); setOrderQrDataUrl(orderValue); } })
      .catch(() => active && setQrDataUrl(""));
    return () => {
      active = false;
    };
  }, [template.qrTargetUrl]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jigu-promo-reference-eight-v3');
      if (saved) setTemplate(buildTemplateFromCatalog(catalog, JSON.parse(saved)));
    } catch { setStatus('저장된 작업을 불러오지 못했습니다.'); }
    setDraftLoaded(true);
  }, [catalog]);
  useEffect(() => {
    if (!draftLoaded) return;
    try { localStorage.setItem('jigu-promo-duplex-v2', JSON.stringify(template)); }
    catch { setStatus('이 브라우저에 자동 저장하지 못했습니다. 설정 파일로 저장해 주세요.'); }
  }, [template, draftLoaded]);

  const runExport = async (kind) => {
    if (exporting || errors.length > 0 || !qrDataUrl || !priceApproved || !documentRoot.current) return;
    setExporting(true);
    setStatus(`상품 사진을 준비하고 ${kind.toUpperCase()} 파일을 만드는 중입니다…`);
    try {
      if (kind === "pdf") await exportDuplexPdf(documentRoot.current, "지구농산_양면_홍보전단");
      if (kind === "png") await exportDuplexPng(documentRoot.current, "지구농산_양면_홍보전단");
      setStatus("저장이 완료되었습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "내보내기에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const recalculate = () => {
    const rangeSummary = { ...template.frontPage.rangeSummary, ...computeCategoryStats(catalog), categories: computeCatalogCategories(catalog) };
    updateTemplate({ ...template, frontPage: { ...template.frontPage, rangeSummary } });
  };

  const importTemplateJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus("");
    try {
      if (file.size > 1024 * 1024) {
        throw new Error("설정 파일은 1MB 이하만 불러올 수 있습니다.");
      }
      const payload = JSON.parse(await file.text());
      if (payload?.schemaVersion !== 1 || payload?.templateId !== "promo_duplex_food_v1") {
        throw new Error("지원하지 않는 양면 전단 설정 파일입니다.");
      }
      const savedProducts = payload?.frontPage?.heroProducts;
      const savedCodes = Array.isArray(savedProducts)
        ? savedProducts.map((product) => String(product?.code || "").trim()).filter(Boolean)
        : [];
      if (![4, 8, 9, 10].includes(savedCodes.length) || new Set(savedCodes).size !== savedCodes.length) {
        throw new Error("설정 파일의 상품 코드 8개를 확인해 주세요.");
      }
      const catalogCodes = new Set(catalog.map((product) => String(product.code ?? product.id)));
      const missingCodes = savedCodes.filter((code) => !catalogCodes.has(code));
      if (missingCodes.length > 0) {
        throw new Error(`현재 상품 DB에서 찾을 수 없는 코드: ${missingCodes.join(", ")}`);
      }
      // 이전 4개 상품 설정은 기존 상품을 보존하고 8개로 확장한다.
      if (savedCodes.length === 4) {
        const extras = catalog.filter(p => !savedCodes.includes(String(p.code ?? p.id)) && !p.hidden && !p.sold_out && p.sell > 0).slice(0, 4);
        payload.frontPage.heroProducts = [...savedProducts, ...extras.map((p, i) => ({ code: p.code, rank: i+5 }))];
      }
      const restored = buildTemplateFromCatalog(catalog, payload);
      const restoredErrors = validateTemplate(restored);
      if (restoredErrors.length > 0) throw new Error(restoredErrors.join(" "));
      setTemplate(restored);
      setPriceApproved(false);
      setStatus("설정 파일을 불러왔습니다. 가격과 문구를 다시 확인해 주세요.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "설정 파일을 불러오지 못했습니다.");
    }
  };

  return (
    <div className="mkt-workspace">
      <MarketingFlyerEditor
        template={template}
        catalog={catalog}
        onChange={updateTemplate}
        onRecalculate={recalculate}
      />

      <main className="mkt-preview-shell">
        <div className="mkt-toolbar">
          <div>
            <strong>양면 미리보기</strong>
            <span>A4 양면 · 상품 8개 · 자동 저장</span>
          </div>
          <div className="mkt-toolbar__actions">
            <a className="mkt-button mkt-button--ghost" href="/">기존 전단</a>
            <button className="mkt-button mkt-button--ghost" type="button" onClick={() => importInput.current?.click()}>설정 불러오기</button>
            <button className="mkt-button mkt-button--ghost" type="button" onClick={() => downloadTemplateJson(template)}>설정 JSON</button>
            <button className="mkt-button mkt-button--secondary" type="button" disabled={exporting || errors.length > 0 || !qrDataUrl || !priceApproved} onClick={() => runExport("png")}>PNG 2장</button>
            <button className="mkt-button mkt-button--ghost" type="button" disabled={exporting || errors.length > 0 || !qrDataUrl || !priceApproved} onClick={() => window.print()}>양면 인쇄</button>
            <button className="mkt-button mkt-button--primary" type="button" disabled={exporting || errors.length > 0 || !qrDataUrl || !priceApproved} onClick={() => runExport("pdf")}>양면 PDF</button>
            <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importTemplateJson} />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mkt-alert" role="alert">
            {errors.map((error) => <span key={error}>{error}</span>)}
          </div>
        )}
        <label className="mkt-approval">
          <input
            type="checkbox"
            checked={priceApproved}
            onChange={(event) => setPriceApproved(event.target.checked)}
          />
          <span>가격·재고·행사기간·연락처·QR 주소를 최종 확인했습니다.</span>
        </label>
        {status && <div className="mkt-status" role="status">{status}</div>}

        <div className="mkt-preview" ref={documentRoot}>
          <MarketingFlyerDocument template={template} qrDataUrl={qrDataUrl} orderQrDataUrl={orderQrDataUrl} />
        </div>
      </main>
    </div>
  );
}
