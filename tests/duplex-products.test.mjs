import assert from 'node:assert/strict';
import test from 'node:test';
import {buildTemplateFromCatalog, validateTemplate, computeCatalogCategories} from '../src/features/marketing-flyer/model.js';
const catalog = Array.from({length:14},(_,i)=>({code:String(i),name:`상품 ${i}`,sell:1000+i,major_name:i%2?'공산품':'야채',minor_name:`분류${i}`}));
test('8개 상품 선택과 삭제·순서를 저장 후 그대로 복원한다',()=>{
 for(const count of [8]){
  const original=buildTemplateFromCatalog(catalog);
  original.frontPage.heroProducts=catalog.slice(2,count+2).reverse().map((p,i)=>({...p,rank:i+1,flyerPrice:p.sell}));
  const restored=buildTemplateFromCatalog(catalog,JSON.parse(JSON.stringify(original)));
  assert.equal(restored.frontPage.heroProducts.length,count);
  assert.deepEqual(restored.frontPage.heroProducts.map(p=>p.code),original.frontPage.heroProducts.map(p=>p.code));
  assert.deepEqual(validateTemplate(restored),[]);
 }
});
test('추천상품과 별개로 전체 카탈로그 분류를 표시하고 숨김·품절은 제외한다',()=>{
 const rows=[...catalog,{code:'hidden',major_name:'숨김분류',hidden:true},{code:'sold',major_name:'품절분류',sold_out:true}];
 const categories=computeCatalogCategories(rows);
 assert.equal(categories.length,2);
 assert.equal(categories.reduce((n,c)=>n+c.count,0),14);
 assert.equal(categories.flatMap(c=>c.children).length,14);
 assert.deepEqual(buildTemplateFromCatalog(rows).frontPage.rangeSummary.categories,categories);
});
