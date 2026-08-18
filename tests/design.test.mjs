import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../src/features/marketing-flyer/marketing-flyer.css", import.meta.url),
  "utf8",
);
const documentSource = readFileSync(
  new URL("../src/features/marketing-flyer/MarketingFlyerDocument.jsx", import.meta.url),
  "utf8",
);
const quietCss = css.slice(css.indexOf("/*\n * Quiet catalog layout"));

function rule(selector) {
  const start = quietCss.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} 규칙이 필요합니다.`);
  const end = quietCss.indexOf("\n}", start);
  assert.notEqual(end, -1, `${selector} 규칙이 닫혀야 합니다.`);
  return quietCss.slice(start, end + 2);
}

function heightMm(selector) {
  const match = rule(selector).match(/height:\s*(\d+(?:\.\d+)?)mm/);
  assert.ok(match, `${selector}의 인쇄 높이가 필요합니다.`);
  return Number(match[1]);
}

test("앞·뒷면 구역 높이는 각각 A4 297mm를 정확히 채운다", () => {
  assert.equal(
    heightMm(".mkt-front-hero") + heightMm(".mkt-front-content") + heightMm(".mkt-front-footer"),
    297,
  );
  assert.equal(
    heightMm(".mkt-back-hero") + heightMm(".mkt-back-content") + heightMm(".mkt-back-footer"),
    297,
  );
});

test("상품과 가격이 배경 장식보다 강한 단순 카탈로그 계층을 유지한다", () => {
  assert.match(rule(".mkt-front-hero"), /background:\s*white/);
  assert.match(rule(".mkt-front-content"), /grid-template-rows:\s*158mm 37mm/);
  assert.match(rule(".mkt-product__sale-price strong"), /font-size:\s*26pt/);
  assert.match(
    quietCss,
    /\.mkt-product,\s*\.mkt-product--featured\s*{[^}]*box-shadow:\s*none/s,
  );
  assert.match(rule(".mkt-range-panel"), /background:\s*var\(--mkt-green-deep\)/);
  assert.doesNotMatch(documentSource, /WHOLESALE\s*·\s*FRESH\s*·\s*DIRECT/);
});

test("인쇄용 QR은 축소된 안내 영역에서도 29mm를 유지한다", () => {
  assert.match(rule(".mkt-front-footer .mkt-qr"), /width:\s*29mm/);
  assert.match(rule(".mkt-front-footer .mkt-qr"), /height:\s*29mm/);
});
