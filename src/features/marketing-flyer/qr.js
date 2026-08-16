import QRCode from "qrcode";

import { normalizeQrTargetUrl } from "./model.js";


export async function createQrDataUrl(targetUrl) {
  return QRCode.toDataURL(normalizeQrTargetUrl(targetUrl), {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 420,
    color: { dark: "#111111", light: "#ffffff" },
  });
}
