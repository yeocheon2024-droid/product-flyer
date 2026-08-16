import assert from "node:assert/strict";
import test from "node:test";

import { PLAY_STORE_URL } from "../src/features/marketing-flyer/model.js";
import { createQrDataUrl } from "../src/features/marketing-flyer/qr.js";

test("Google Play 앱 주소로 인쇄 가능한 PNG QR을 로컬 생성한다", async () => {
  const dataUrl = await createQrDataUrl(PLAY_STORE_URL);
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.ok(dataUrl.length > 2_000);
});

test("위험한 QR 주소는 Google Play 기본 주소의 QR과 같아진다", async () => {
  const [unsafe, expected] = await Promise.all([
    createQrDataUrl("javascript:alert(1)"),
    createQrDataUrl(PLAY_STORE_URL),
  ]);
  assert.equal(unsafe, expected);
});
