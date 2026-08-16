async function waitForPageAssets(page) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const images = [...page.querySelectorAll("img")];
  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
    }),
  );
}

async function renderPage(page) {
  const { default: html2canvas } = await import("html2canvas");
  await waitForPageAssets(page);
  return html2canvas(page, {
    backgroundColor: "#fffaf2",
    scale: 3,
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 15000,
    width: 794,
    height: 1123,
    scrollX: 0,
    scrollY: 0,
    onclone: (_clonedDocument, clonedPage) => {
      // Mobile preview scales the live page. Export the unscaled A4 canvas instead.
      Object.assign(clonedPage.style, {
        width: "794px",
        height: "1123px",
        minHeight: "1123px",
        maxHeight: "1123px",
        margin: "0",
        transform: "none",
        transformOrigin: "top left",
        overflow: "hidden",
        boxShadow: "none",
      });
    },
  });
}

function getExportPages(root) {
  const pages = [...root.querySelectorAll("[data-export-page]")];
  if (pages.length !== 2) {
    throw new Error(`양면 전단은 정확히 2페이지여야 합니다. 현재 ${pages.length}페이지입니다.`);
  }
  return pages;
}

function safeFilename(value, extension) {
  const base = String(value || "지구농산_양면_홍보전단")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 80);
  return `${base}.${extension}`;
}

export async function exportDuplexPdf(root, filename) {
  const pages = getExportPages(root);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (const [index, page] of pages.entries()) {
    const canvas = await renderPage(page);
    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  }
  pdf.save(safeFilename(filename, "pdf"));
}

export async function exportDuplexPng(root, filename) {
  const pages = getExportPages(root);
  for (const [index, page] of pages.entries()) {
    const canvas = await renderPage(page);
    const anchor = document.createElement("a");
    anchor.download = safeFilename(`${filename || "지구농산_양면_홍보전단"}_${index + 1}면`, "png");
    anchor.href = canvas.toDataURL("image/png");
    anchor.click();
  }
}

export function downloadTemplateJson(template, filename = "promo-duplex-food-v1") {
  const payload = JSON.stringify(template, null, 2);
  const anchor = document.createElement("a");
  anchor.download = safeFilename(filename, "json");
  anchor.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
