import assert from "node:assert/strict";
import test from "node:test";

import { MAX_QR_URL_LENGTH, PLAY_STORE_URL } from "../src/features/marketing-flyer/model.js";
import { createQrDataUrl } from "../src/features/marketing-flyer/qr.js";

test("Google Play 앱 주소로 인쇄 가능한 PNG QR을 로컬 생성한다", async () => {
  const dataUrl = await createQrDataUrl(PLAY_STORE_URL);
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.ok(dataUrl.length > 2_000);
});

test("사용자가 입력한 HTTPS 주소로 인쇄 가능한 QR을 생성한다", async () => {
  const [custom, defaultQr] = await Promise.all([
    createQrDataUrl("https://order.example.com/promotion"),
    createQrDataUrl(PLAY_STORE_URL),
  ]);
  assert.match(custom, /^data:image\/png;base64,/);
  assert.notEqual(custom, defaultQr);
});

test("위험하거나 안전하지 않은 QR 주소는 생성하지 않는다", async () => {
  await assert.rejects(() => createQrDataUrl("javascript:alert(1)"), /https:\/\//);
  await assert.rejects(() => createQrDataUrl("http://example.com/order"), /https:\/\//);
  await assert.rejects(() => createQrDataUrl("https://user:password@example.com/order"), /https:\/\//);
  await assert.rejects(
    () => createQrDataUrl(`https://example.com/${"a".repeat(MAX_QR_URL_LENGTH)}`),
    /700자 이하/,
  );
});
