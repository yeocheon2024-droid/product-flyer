import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("전단 문서는 정확히 두 개의 A4 출력 페이지를 선언한다", async () => {
  const source = await readSource("src/features/marketing-flyer/MarketingFlyerDocument.jsx");
  assert.equal(source.match(/data-export-page/g)?.length, 2);
  assert.match(source, /frontPage/);
  assert.match(source, /backPage/);
});

test("모듈에는 HTML 직접 삽입과 Supabase 비밀값이 없다", async () => {
  const paths = [
    "src/features/marketing-flyer/MarketingFlyerWorkspace.jsx",
    "src/features/marketing-flyer/MarketingFlyerDocument.jsx",
    "src/features/marketing-flyer/MarketingFlyerEditor.jsx",
    "src/features/marketing-flyer/model.js",
  ];
  const source = (await Promise.all(paths.map(readSource))).join("\n");
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(source, /sb_publishable_|service_role|supabase\.co/i);
});

test("PDF 내보내기는 양면 페이지가 아니면 중단한다", async () => {
  const source = await readSource("src/features/marketing-flyer/exportFlyer.js");
  assert.match(source, /pages\.length !== 2/);
  assert.match(source, /querySelectorAll\("\[data-export-page\]"\)/);
  assert.match(source, /width: 794/);
  assert.match(source, /height: 1123/);
  assert.match(source, /transform: "none"/);
});

test("운영 페이지는 기존 상품 필드와 양면 작업공간을 연결한다", async () => {
  const pageSource = await readSource("src/app/promo/page.tsx");
  const modelSource = await readSource("src/features/marketing-flyer/model.js");
  assert.match(pageSource, /MarketingFlyerWorkspace/);
  assert.match(pageSource, /initialProducts/);
  assert.match(modelSource, /display_name/);
  assert.match(pageSource, /image_url/);
});

test("공개 상품 조회는 예약가격 반영 함수를 실행하지 않는다", async () => {
  const source = await readSource("src/lib/supabase.ts");
  const start = source.indexOf("export async function fetchProducts");
  const end = source.indexOf("export async function fetchCategoryOrder", start);
  const fetchBody = source.slice(start, end);
  assert.doesNotMatch(fetchBody, /await applyScheduledPrices\(\)/);
  assert.doesNotMatch(fetchBody, /\.select\(['\"]\*['\"]\)/);
  assert.doesNotMatch(fetchBody, /cost|vendor_code|vendor_name|registered_at/);
});

test("공개 전단은 공식 연락처와 Google Play QR을 임의 편집할 수 없다", async () => {
  const editor = await readSource("src/features/marketing-flyer/MarketingFlyerEditor.jsx");
  const model = await readSource("src/features/marketing-flyer/model.js");
  assert.match(editor, /문의 전화 \(고정\)/);
  assert.match(editor, /QR 연결 주소 \(Google Play 고정\)/);
  assert.match(model, /contact: \{ \.\.\.DEFAULT_CONTACT \}/);
});

test("브라우저 인쇄에서도 양면 전단 미리보기가 표시된다", async () => {
  const css = await readSource("src/features/marketing-flyer/marketing-flyer.css");
  assert.match(css, /\.mkt-preview \*/);
  assert.match(css, /visibility: visible !important/);
});
