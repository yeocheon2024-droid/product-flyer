import assert from 'node:assert/strict';
import test from 'node:test';
import { exportImageCandidates, loadExportImage, prepareExportImages } from '../src/features/marketing-flyer/exportImages.js';

const origin = 'https://product-flyer.pages.dev';
const readBlob = async blob => `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
const imageResponse = () => new Response(new Uint8Array([137,80,78,71]), { headers: {'content-type':'image/png'} });

test('CORS가 없는 R2 사진은 저장용 CORS 경로를 먼저 사용한다', async () => {
  const source = 'https://pub-b2fb7e97bfae4e7f96db58f188aa1ce7.r2.dev/101040105.png';
  const calls = [];
  const data = await loadExportImage(source, { origin, readBlob, fetchImage: async (url, options) => {
    calls.push(url);
    assert.equal(options.mode, 'cors');
    assert.equal(options.credentials, 'omit');
    if (new URL(url).hostname !== 'wsrv.nl') throw new TypeError('CORS blocked');
    assert.equal(new URL(url).searchParams.get('url'), source);
    return imageResponse();
  }});
  assert.equal(calls.length, 1);
  assert.match(data, /^data:image\/png;base64,/);
});

test('외부 원본의 CORS 실패는 프록시에서 재시도한다', async () => {
  const calls = [];
  const result = await loadExportImage('https://cdn.example.com/product.png', { origin, readBlob, fetchImage: async url => {
    calls.push(url);
    if (calls.length === 1) throw new TypeError('Failed to fetch');
    return imageResponse();
  }});
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1]).hostname, 'wsrv.nl');
  assert.match(result, /^data:image/);
});

test('같은 사진은 한 번만 준비하고 기존 data URL은 재요청하지 않는다', async () => {
  let requests = 0;
  const sources = [{src:'/logo.png',name:'로고'},{src:'/logo.png',name:'로고'},{src:'data:image/png;base64,iVBORw==',name:'QR'}];
  const result = await prepareExportImages(sources, { origin, readBlob, fetchImage: async () => { requests++; return imageResponse(); } });
  assert.equal(requests, 1);
  assert.equal(result.size, 2);
});

test('사진 실패·HTML 오류 응답을 빈 사진으로 저장하지 않고 상품명으로 알린다', async () => {
  await assert.rejects(prepareExportImages([{src:'https://cdn.example.com/missing.png',name:'쌀 20kg'}], {
    origin, readBlob, fetchImage: async () => new Response('<html>error</html>', {headers:{'content-type':'text/html'}}),
  }), /쌀 20kg/);
  assert.throws(() => exportImageCandidates('javascript:alert(1)', origin));
});
