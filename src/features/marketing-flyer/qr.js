import QRCode from "qrcode";

import { MAX_QR_URL_LENGTH, isValidQrTargetUrl, normalizeQrTargetUrl } from "./model.js";


export async function createQrDataUrl(targetUrl) {
  if (!isValidQrTargetUrl(targetUrl)) {
    throw new Error(`QR 연결 주소는 ${MAX_QR_URL_LENGTH}자 이하의 안전한 https:// 주소를 입력해 주세요.`);
  }
  return QRCode.toDataURL(normalizeQrTargetUrl(targetUrl), {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 420,
    color: { dark: "#111111", light: "#ffffff" },
  });
}
