export const ORDER_SITE_URL = 'https://jiguorder.com/home/';

const asset = name => `/marketing-flyer/assets/${name}.png`;
const steps = [
  { title: '접속 · 로그인', body: 'QR 또는 주소로 접속한 뒤 로그인하세요. 처음 이용하시면 회원가입을 진행해 주세요.' },
  { title: '상품 검색 · 담기', body: '카테고리 또는 상품명으로 찾고, 필요한 상품과 수량을 선택해 담으세요.' },
  { title: '가격 확인 · 주문하기', body: '장바구니에서 배송 날짜·수량·가격과 결제수단을 확인한 뒤 주문하기를 누르세요.' },
  { title: '접수 완료 · 배송일 확인', body: '“주문이 접수되었습니다” 문구를 확인하고, 배송 예정 날짜가 원하는 날짜인지 꼭 확인하세요.' },
];

function ExampleScreen({ step }) {
  return <div className="order-guide-screen" aria-label={`${steps[step].title} 화면 예시`}>
    <div className="order-guide-screen-top"><img src="/logo.png" alt="" /><b>지구상회</b><span>발주</span></div>
    <div className={`order-guide-screen-body order-guide-screen-body--${step}`}>
    {step === 0 && <><div className="order-guide-welcome">우리 가게 식자재<br /><b>한 번에 주문하세요</b></div><div className="order-guide-category-photos">{['rice_calrose','eggs_special','green_onion','kimchi_dongsung'].map((p,i)=><div key={p}><img src={asset(p)} alt={['쌀','계란','야채','김치'][i]}/><span>{['쌀','계란','야채','김치'][i]}</span></div>)}</div></>}
    {step === 1 && <><div className="order-guide-search">⌕ 상품명으로 찾아보세요</div><div className="order-guide-product-photo"><img src={asset('rice_calrose')} alt="쌀 상품 사진"/><div><b>쌀 · 20kg</b><small>규격 · 가격 확인</small></div></div><div className="order-guide-quantity">− <b>1</b> ＋</div></>}
    {step === 2 && <><strong className="order-guide-screen-heading">장바구니</strong><div className="order-guide-cart-date">배송 날짜 선택 · 확인</div>{['rice_calrose','eggs_special'].map((p,i)=><div className="order-guide-cart-item" key={p}><img src={asset(p)} alt={i?'계란 상품 사진':'쌀 상품 사진'}/><div><b>{i?'계란':'쌀'}</b><span>−　1　＋</span></div></div>)}</>}
    {step === 3 && <><div className="order-guide-confirm-icon">✓</div><strong className="order-guide-screen-heading">주문이 접수되었습니다</strong><div className="order-guide-receipt"><div><span>주문번호</span><b>접수번호 확인</b></div><div><span>주문일</span><b>주문 날짜</b></div><div className="order-guide-delivery-date"><span>배송 예정</span><b>날짜 꼭 확인!</b></div></div></>}
    </div>
    <div className="order-guide-example-button">{['빠른 발주 시작 →','상품 담기','가격 확인 · 주문하기','주문 내역 보기'][step]}</div>
    <div className="order-guide-example-label">주문 화면 예시</div>
  </div>;
}

export function OrderPhotoGuide({ qrDataUrl }) {
 return <section className="fresh-order order-photo-guide" aria-label="사진과 함께 보는 주문 안내">
   <div className="order-photo-guide-heading"><div><h2>사진으로 보는 간편 주문 안내</h2><a href={ORDER_SITE_URL} target="_blank" rel="noreferrer">jiguorder.com/home/ ↗</a></div><div className="order-guide-qr">{qrDataUrl && <img src={qrDataUrl} alt="지구상회 주문 사이트 접속 QR"/>}<span>웹 주문 바로가기</span></div></div>
   <div className="order-photo-guide-steps">{steps.map((step,i)=><article key={step.title}><ExampleScreen step={i}/><div className="order-guide-step-title"><span>{String(i+1).padStart(2,'0')}</span><h3>{step.title}</h3></div><p>{step.body}</p></article>)}</div>
   <p className="order-guide-footnote">실제 메뉴를 기준으로 구성한 화면 예시입니다. 로그인·상품·배송 조건에 따라 표시 내용이 달라질 수 있습니다.</p>
 </section>;
}
