const R2_HOST = 'pub-b2fb7e97bfae4e7f96db58f188aa1ce7.r2.dev';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function exportImageCandidates(source, origin) {
  if (source.startsWith('data:image/')) return [source];
  const url = new URL(source, origin);
  if (!['https:', 'http:', 'blob:'].includes(url.protocol)) throw new Error('지원하지 않는 사진 주소입니다.');
  if (url.origin === new URL(origin).origin || url.protocol === 'blob:') return [url.href];
  if (url.protocol !== 'https:') throw new Error('외부 상품 사진은 HTTPS 주소가 필요합니다.');
  if (url.hostname === 'wsrv.nl') return [url.href];
  const proxy = new URL('https://wsrv.nl/');
  proxy.searchParams.set('url', url.href);
  proxy.searchParams.set('output', 'png');
  proxy.searchParams.set('w', '1200');
  proxy.searchParams.set('h', '1200');
  proxy.searchParams.set('fit', 'inside');
  // R2 원본에는 CORS 헤더가 없으므로 내보내기에서는 CORS 지원 사진 경로를 우선한다.
  return url.hostname === R2_HOST ? [proxy.href, url.href] : [url.href, proxy.href];
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('사진 데이터를 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
}

export async function loadExportImage(source, {
  origin = window.location.origin,
  fetchImage = fetch,
  readBlob = blobToDataUrl,
} = {}) {
  for (const candidate of exportImageCandidates(source, origin)) {
    if (candidate.startsWith('data:image/')) return candidate;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetchImage(candidate, {
        mode: 'cors', credentials: 'omit', signal: controller.signal,
      });
      if (!response.ok) throw new Error(`사진 서버 응답 ${response.status}`);
      if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('사진 파일이 너무 큽니다.');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) throw new Error('유효한 사진 파일이 아닙니다.');
      return await readBlob(blob);
    } catch {
      // 원본 서버 CORS 차단·일시적 프록시 장애는 다른 사진 경로로 재시도한다.
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('사진 서버에서 이미지를 불러오지 못했습니다.');
}

export async function prepareExportImages(images, options) {
  const unique = new Map();
  for (const image of images) if (image.src && !unique.has(image.src)) unique.set(image.src, image.name || '상품 사진');
  const sources = [...unique.keys()];
  const ready = new Map();
  const failed = [];
  let index = 0;
  // 대용량 사진을 한꺼번에 요청하지 않도록 동시 로딩 수를 제한한다.
  await Promise.all(Array.from({ length: Math.min(4, sources.length) }, async () => {
    while (index < sources.length) {
      const source = sources[index++];
      try { ready.set(source, await loadExportImage(source, options)); }
      catch { failed.push(unique.get(source)); }
    }
  }));
  if (failed.length) throw new Error(`다음 사진을 불러오지 못해 저장을 중단했습니다: ${failed.join(', ')}. 사진을 교체하거나 잠시 후 다시 저장해 주세요.`);
  return ready;
}
