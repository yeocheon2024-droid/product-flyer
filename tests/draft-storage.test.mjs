import assert from 'node:assert/strict';
import test from 'node:test';
import {readPromoDraft,savePromoDraft,PROMO_DRAFT_KEY} from '../src/features/marketing-flyer/draftStorage.js';
import {buildTemplateFromCatalog} from '../src/features/marketing-flyer/model.js';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}};
const catalog=Array.from({length:10},(_,i)=>({code:String(i),name:`상품 ${i}`,sell:1000+i}));

test('창을 닫고 새 작업공간에서 읽어도 마지막 품목·순서·가격·안내가 복원된다',()=>{
 const disk=storage();
 const edited=buildTemplateFromCatalog(catalog);
 edited.frontPage.heroProducts=edited.frontPage.heroProducts.reverse().map((product,index)=>({...product,rank:index+1}));
 edited.frontPage.heroProducts[0].flyerPrice=12345;
 edited.backPage.marketNote='저장한 야채 가격 안내';
 savePromoDraft(disk,edited);
 const reopened=buildTemplateFromCatalog(catalog,readPromoDraft(disk));
 assert.deepEqual(reopened.frontPage.heroProducts,edited.frontPage.heroProducts);
 assert.equal(reopened.backPage.marketNote,edited.backPage.marketNote);
 edited.frontPage.heroProducts.splice(2,1);
 savePromoDraft(disk,edited);
 assert.equal(readPromoDraft(disk).frontPage.heroProducts.length,7);
});
test('기존 버전이 실제 저장하던 최근 품목을 우선 복구하고 새 저장 위치로 이어간다',()=>{
 const disk=storage(),old=buildTemplateFromCatalog(catalog),recent=structuredClone(old);
 recent.contact.phone='02-123-4567';
 disk.setItem('jigu-promo-reference-eight-v3',JSON.stringify(old));
 disk.setItem('jigu-promo-duplex-v2',JSON.stringify(recent));
 assert.equal(readPromoDraft(disk).contact.phone,recent.contact.phone);
 savePromoDraft(disk,recent);
 assert.ok(disk.getItem(PROMO_DRAFT_KEY));
 assert.equal(readPromoDraft(disk).contact.phone,recent.contact.phone);
});
test('손상된 설정은 이전 정상 저장본에서 복구한다',()=>{
 const disk=storage(),draft=buildTemplateFromCatalog(catalog);
 disk.setItem(PROMO_DRAFT_KEY,'broken json');
 disk.setItem('jigu-promo-duplex-v2',JSON.stringify(draft));
 assert.deepEqual(readPromoDraft(disk),draft);
});
