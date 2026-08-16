import { useEffect, useMemo, useRef, useState } from "react";

import { MarketingFlyerDocument } from "./MarketingFlyerDocument.jsx";
import { MarketingFlyerEditor } from "./MarketingFlyerEditor.jsx";
import { downloadTemplateJson, exportDuplexPdf, exportDuplexPng } from "./exportFlyer.js";
import { buildTemplateFromCatalog, computeCategoryStats, validateTemplate } from "./model.js";
import { createQrDataUrl } from "./qr.js";


/**
 * @param {{ initialProducts?: any[], initialOverrides?: Record<string, any> }} props
 */
export function MarketingFlyerWorkspace({ initialProducts = [], initialOverrides = {} }) {
  const catalog = useMemo(() => initialProducts.map((product) => ({ ...product })), [initialProducts]);
  const [template, setTemplate] = useState(() => buildTemplateFromCatalog(catalog, initialOverrides));
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [status, setStatus] = useState("");
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
    createQrDataUrl(template.qrTargetUrl)
      .then((value) => active && setQrDataUrl(value))
      .catch(() => active && setQrDataUrl(""));
    return () => {
      active = false;
    };
  }, [template.qrTargetUrl]);

  const runExport = async (kind) => {
    if (errors.length > 0 || !qrDataUrl || !priceApproved || !documentRoot.current) return;
    setStatus(`${kind.toUpperCase()} 파일을 만드는 중입니다…`);
    try {
      if (kind === "pdf") await exportDuplexPdf(documentRoot.current, "지구농산_양면_홍보전단");
      if (kind === "png") await exportDuplexPng(documentRoot.current, "지구농산_양면_홍보전단");
      setStatus("저장이 완료되었습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "내보내기에 실패했습니다.");
    }
  };

  const recalculate = () => {
    const rangeSummary = { ...template.frontPage.rangeSummary, ...computeCategoryStats(catalog) };
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
      if (savedCodes.length !== 4 || new Set(savedCodes).size !== 4) {
        throw new Error("설정 파일의 특가상품 코드 4개를 확인해 주세요.");
      }
      const catalogCodes = new Set(catalog.map((product) => String(product.code ?? product.id)));
      const missingCodes = savedCodes.filter((code) => !catalogCodes.has(code));
      if (missingCodes.length > 0) {
        throw new Error(`현재 상품 DB에서 찾을 수 없는 코드: ${missingCodes.join(", ")}`);
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
            <span>A4 세로 · 2페이지</span>
          </div>
          <div className="mkt-toolbar__actions">
            <a className="mkt-button mkt-button--ghost" href="/">기존 전단</a>
            <button className="mkt-button mkt-button--ghost" type="button" onClick={() => importInput.current?.click()}>설정 불러오기</button>
            <button className="mkt-button mkt-button--ghost" type="button" onClick={() => downloadTemplateJson(template)}>설정 JSON</button>
            <button className="mkt-button mkt-button--secondary" type="button" disabled={errors.length > 0 || !qrDataUrl || !priceApproved} onClick={() => runExport("png")}>PNG 2장</button>
            <button className="mkt-button mkt-button--primary" type="button" disabled={errors.length > 0 || !qrDataUrl || !priceApproved} onClick={() => runExport("pdf")}>양면 PDF</button>
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
          <MarketingFlyerDocument template={template} qrDataUrl={qrDataUrl} />
        </div>
      </main>
    </div>
  );
}
