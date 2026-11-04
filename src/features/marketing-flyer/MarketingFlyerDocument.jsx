import { OrderPhotoGuide } from './OrderPhotoGuide.jsx';
import { isJiguorderPlayStoreUrl } from './model.js';
import './fresh-flyer.css';
const money = n => Number(n) > 0 ? Number(n).toLocaleString('ko-KR') : '가격문의';
const fallback = e => { e.currentTarget.style.display = 'none'; };
function Brand() { return <div className="fresh-brand"><img src="/logo.png" alt="" /><div><b>지구농산</b><span>식자재 납품 전문</span></div></div>; }
function Footer({template, qrDataUrl, back}) { const cta = back ? template.backPage.cta : template.frontPage.cta; return <footer className="fresh-footer"><img src={qrDataUrl || undefined} alt="주문 안내 QR 코드" /><div><b>{cta.title}</b><p>{cta.body}</p>{back && <small>{template.backPage.cta?.platformLabel || (isJiguorderPlayStoreUrl(template.qrTargetUrl) ? "Google Play · 앱 설치" : "QR 연결 안내")}</small>}</div><address><small>견적 · 주문 상담</small><strong>{template.contact.phone}</strong><span>{template.contact.hours}<br />{template.contact.coverage}</span></address></footer>; }
export function MarketingFlyerDocument({template, qrDataUrl, orderQrDataUrl}) {
 if (!template) return null;
 const {frontPage:front, backPage:back} = template;
 const products=front.heroProducts, categories=front.rangeSummary.categories || [];
 return <div className="mkt-flyer-document fresh-document">
 <section className="flyer-a4 fresh-page reference-front" data-export-page="front" aria-label="홍보 전단 앞면">
 <header className="reference-hero" aria-label="필요한 식자재, 한 번에! 신선한 식자재를 합리적인 가격으로 빠르고 정확하게 공급합니다."><img src="/reference/fresh-supply.png" alt="지구농산 식자재 납품 전문 · 첨부 원본 디자인" /></header>
 <div className="fresh-heading"><h2>인기 식자재 BEST</h2><span>필요한 품목을 한 번에</span></div>
 <main className={`fresh-products fresh-products--${products.length}`}>{Array.from({length:8}, (_,i) => products[i] || {code:`empty-${i}`,name:"상품을 선택하세요",spec:"",flyerPrice:0}).map((p,i)=><article key={p.code}><span className="fresh-number">{String(i+1).padStart(2,'0')}</span><div className="fresh-photo"><span>상품 이미지</span><img src={p.imageUrl} alt={p.name} onError={fallback}/></div><h3>{p.name}</h3><p>{[p.spec,p.originNote].filter(Boolean).join(' · ')}</p><strong>{money(p.flyerPrice)}{p.flyerPrice>0 && <small>원</small>}</strong></article>)}</main>
 <footer className="reference-footer"><div><span aria-hidden="true">◷</span><p>{back.deliveryPolicies[0].days}<br/>{back.deliveryPolicies[0].cutoffTime} 마감 전 주문 · {back.deliveryPolicies[0].result}</p></div><address><span aria-hidden="true">☎</span><strong>{template.contact.phone}</strong></address></footer>
 </section>
 <section className="flyer-a4 fresh-page fresh-back" data-export-page="back" aria-label="홍보 전단 뒷면">
 <div className="fresh-top"><Brand/><small>취급품목 · 배송 · 주문 안내</small></div>
 <header className="fresh-back-title"><small>ONE STOP FOOD SUPPLY</small><h1>식자재 준비,<br/><em>지구농산 한 곳에서.</em></h1><p>전체 취급 카테고리를 확인하고, 필요한 상품은 QR로 찾아보세요.</p></header>
 <section><div className="fresh-heading"><h2>전체 취급 카테고리</h2><span>{front.rangeSummary.totalCount.toLocaleString('ko-KR')}개 품목</span></div><div className={`fresh-categories ${categories.length>8?'fresh-categories--many':''}`}>{categories.map((c,i)=><article key={c.name}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{c.name}</h3><p>{c.children.slice(0,6).join(' · ') || '다양한 규격의 업장용 식자재'}{c.children.length>6?' 외':''}</p></div><small>{c.count}품목</small></article>)}</div></section>
 <section className="fresh-delivery"><div className="fresh-heading"><h2>주문 마감 · 배송 안내</h2><span>품목별 기준 확인</span></div><div>{back.deliveryPolicies.map(p=><article key={p.type}><span>{p.type}</span><strong>{p.cutoffTime}</strong><p>{p.days} 마감 전 주문 · {p.result}</p></article>)}</div><div className="fresh-delivery-notices"><p><b>야채 경매가 안내</b> {back.marketNote}</p><p><b>배송 일정 안내</b> {back.footerNote}</p></div></section>
 <OrderPhotoGuide qrDataUrl={orderQrDataUrl} />
 <Footer template={template} qrDataUrl={qrDataUrl} back/><p className="fresh-note">상품 가격·재고 및 배송 가능 지역은 주문 전 확인해 주세요.</p>
 </section></div>;
}
export default MarketingFlyerDocument;

