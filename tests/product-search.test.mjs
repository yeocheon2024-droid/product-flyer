import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_SEARCH_RESULT_LIMIT,
  searchCatalogProducts,
} from "../src/features/marketing-flyer/productSearch.js";

const catalog = [
  { code: "RICE-001", name: "일반쌀", display_name: "칼로스 쌀", spec: "20kg", major_name: "쌀", minor_name: "수입쌀" },
  { code: "KIMCHI-010", name: "종가집 배추김치", spec: "10kg", major_name: "김치/반찬", minor_name: "포기김치" },
  { code: "OIL-100", name: "업소용 식용유", spec: "18L", major_name: "기름/오일", minor_name: "식용유" },
];

test("상품명·표시명·규격·코드·대분류·소분류로 검색한다", () => {
  for (const query of ["일반쌀", "칼로스", "20kg", "rice-001", "쌀", "수입쌀"]) {
    assert.equal(searchCatalogProducts(catalog, query).items[0]?.code, "RICE-001", query);
  }
  assert.equal(searchCatalogProducts(catalog, "칼로스20kg").items[0]?.code, "RICE-001");
  assert.equal(searchCatalogProducts(catalog, "김치 반찬").items[0]?.code, "KIMCHI-010");
  assert.equal(searchCatalogProducts(catalog, "18l 식용유").items[0]?.code, "OIL-100");
});

test("정확한 코드와 상품명을 먼저 보여준다", () => {
  const products = [
    { code: "ABC-1", name: "ABC 소스" },
    { code: "OTHER", name: "ABC-1" },
  ];
  assert.equal(searchCatalogProducts(products, "ABC-1").items[0]?.code, "ABC-1");
});

test("빈 검색 결과도 기본 30개만 렌더링하고 전체 개수를 제공한다", () => {
  const products = Array.from({ length: 1005 }, (_, index) => ({
    code: String(index),
    name: `상품 ${index}`,
  }));
  const snapshot = structuredClone(products);
  const result = searchCatalogProducts(products, "");
  assert.equal(result.items.length, PRODUCT_SEARCH_RESULT_LIMIT);
  assert.equal(result.total, 1005);
  assert.deepEqual(products, snapshot);
});
