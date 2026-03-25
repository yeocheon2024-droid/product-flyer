'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchProducts, getImageUrl, formatPrice, getMajorCategories, getMinorCategories, Product } from '@/lib/supabase';

// ── Types ──
type Template = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'L' | 'COVER';
type Theme = 'green' | 'navy' | 'earth' | 'dark' | 'red' | 'purple' | 'teal';

// ── 품목 배열을 페이지별로 나누는 헬퍼 ──
function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: 'earth', color: '#78350f', label: '어스' },
  { id: 'green', color: '#2c5f2e', label: '그린' },
  { id: 'navy', color: '#1a3a5c', label: '네이비' },
  { id: 'dark', color: '#2d2d2d', label: '다크' },
  { id: 'red', color: '#b71c1c', label: '레드' },
  { id: 'purple', color: '#4a148c', label: '퍼플' },
  { id: 'teal', color: '#00695c', label: '틸그린' },
];


// ── Helpers ──
function getScaleVars(count: number, tmpl: Template): React.CSSProperties {
  if (tmpl === 'COVER') return {};
  const vars: Record<string, string> = {};
  if (tmpl === 'A') {
    if (count <= 4) { vars['--card-img-h'] = '280px'; vars['--card-name-fs'] = '14px'; vars['--card-price-fs'] = '26px'; vars['--card-gap'] = '12px'; }
    else if (count <= 8) { vars['--card-img-h'] = '200px'; vars['--card-name-fs'] = '12px'; vars['--card-price-fs'] = '22px'; vars['--card-gap'] = '10px'; }
    else { vars['--card-img-h'] = '160px'; vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '18px'; vars['--card-gap'] = '8px'; }
  } else if (tmpl === 'B') {
    if (count <= 8) { vars['--thumb-size'] = '60px'; vars['--card-name-fs'] = '13px'; vars['--card-price-fs'] = '18px'; vars['--card-gap'] = '6px'; }
    else if (count <= 15) { vars['--thumb-size'] = '44px'; vars['--card-name-fs'] = '12px'; vars['--card-price-fs'] = '16px'; vars['--card-gap'] = '4px'; vars['--card-pad'] = '5px 8px'; }
    else { vars['--thumb-size'] = '32px'; vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '14px'; vars['--card-gap'] = '3px'; vars['--card-pad'] = '4px 6px'; }
  } else if (tmpl === 'C') {
    if (count <= 6) { vars['--card-img-h'] = '220px'; vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '18px'; vars['--card-gap'] = '10px'; }
    else if (count <= 12) { vars['--card-img-h'] = '160px'; vars['--card-name-fs'] = '10px'; vars['--card-price-fs'] = '15px'; vars['--card-gap'] = '8px'; }
    else { vars['--card-img-h'] = '120px'; vars['--card-name-fs'] = '9px'; vars['--card-price-fs'] = '13px'; vars['--card-gap'] = '6px'; }
  } else if (tmpl === 'D') {
    if (count <= 6) { vars['--thumb-size'] = '120px'; vars['--card-name-fs'] = '14px'; vars['--card-price-fs'] = '22px'; vars['--card-gap'] = '10px'; }
    else if (count <= 10) { vars['--thumb-size'] = '90px'; vars['--card-name-fs'] = '12px'; vars['--card-price-fs'] = '18px'; vars['--card-gap'] = '8px'; }
    else { vars['--thumb-size'] = '70px'; vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '15px'; vars['--card-gap'] = '6px'; }
  } else if (tmpl === 'E') {
    if (count <= 20) { vars['--card-name-fs'] = '12px'; vars['--card-price-fs'] = '14px'; vars['--card-pad'] = '6px 3px'; }
    else if (count <= 40) { vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '13px'; vars['--card-pad'] = '4px 3px'; }
    else { vars['--card-name-fs'] = '10px'; vars['--card-price-fs'] = '12px'; vars['--card-pad'] = '3px 2px'; vars['--card-spec-fs'] = '9px'; }
  } else if (tmpl === 'F') {
    if (count <= 2) { vars['--card-img-h'] = '380px'; vars['--card-name-fs'] = '18px'; vars['--card-price-fs'] = '32px'; vars['--card-gap'] = '14px'; }
    else if (count <= 4) { vars['--card-img-h'] = '260px'; vars['--card-name-fs'] = '15px'; vars['--card-price-fs'] = '28px'; vars['--card-gap'] = '12px'; }
    else { vars['--card-img-h'] = '180px'; vars['--card-name-fs'] = '13px'; vars['--card-price-fs'] = '22px'; vars['--card-gap'] = '10px'; }
  } else if (tmpl === 'L') {
    if (count <= 10) { vars['--card-name-fs'] = '13px'; vars['--card-price-fs'] = '15px'; vars['--card-gap'] = '0px'; vars['--card-pad'] = '10px 14px'; }
    else if (count <= 20) { vars['--card-name-fs'] = '12px'; vars['--card-price-fs'] = '14px'; vars['--card-gap'] = '0px'; vars['--card-pad'] = '8px 14px'; }
    else { vars['--card-name-fs'] = '11px'; vars['--card-price-fs'] = '13px'; vars['--card-gap'] = '0px'; vars['--card-pad'] = '6px 14px'; }
  }
  return vars as React.CSSProperties;
}

function groupByCategory(products: Product[]): Record<string, Product[]> {
  const groups: Record<string, Product[]> = {};
  products.forEach(p => {
    const cat = p.major_name || '기타';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });
  return groups;
}

// ── Product Image Component ──
function ProductImg({ product, className, style }: { product: Product; className?: string; style?: React.CSSProperties }) {
  const [err, setErr] = useState(false);
  const url = getImageUrl(product);
  if (!url || err) return <div className={className} style={{ ...style, color: '#ccc', fontSize: '11px', fontWeight: 600, letterSpacing: '-0.3px' }}>No img</div>;
  return <img src={url} alt={product.name} crossOrigin="anonymous" onError={() => setErr(true)} className={className} style={style} />;
}

// ══════════════════════════════════════
// TEMPLATE RENDERERS
// ══════════════════════════════════════

function RenderTemplateA({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  return (
    <div className="grid-a" style={getScaleVars(products.length, 'A')}>
      {products.map((p, i) => (
        <div key={i} className="card-a">
          <ProductImg product={p} className="card-img" style={{ width: '100%', height: 'var(--card-img-h, 200px)', objectFit: 'contain', background: '#fff' }} />
          <div className="card-body">
            <div className="card-name">{p.name}</div>
            {p.spec && <div className="card-spec">{p.spec}</div>}
            {showPrice && <div className="card-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderTemplateB({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  return (
    <div className="grid-b" style={getScaleVars(products.length, 'B')}>
      {products.map((p, i) => (
        <div key={i} className="card-b">
          <div className="b-num">{i + 1}</div>
          <ProductImg product={p} className="b-img" style={{ width: 'var(--thumb-size, 60px)', height: 'var(--thumb-size, 60px)', borderRadius: '5px', objectFit: 'cover' }} />
          <div className="b-info">
            <div className="b-name">{p.name}</div>
            {p.spec && <div className="b-spec">{p.spec}</div>}
          </div>
          {showPrice && <div className="b-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
        </div>
      ))}
    </div>
  );
}

function RenderTemplateC({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  return (
    <div className="grid-c" style={getScaleVars(products.length, 'C')}>
      {products.map((p, i) => (
        <div key={i} className="card-c">
          <ProductImg product={p} className="c-img" style={{ width: '100%', height: 'var(--card-img-h, 180px)', objectFit: 'contain', background: '#fff' }} />
          <div className="c-body">
            <div className="c-name">{p.name}</div>
            {p.spec && <div className="c-spec">{p.spec}</div>}
            {showPrice && <div className="c-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderTemplateD({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  return (
    <div className="grid-d" style={getScaleVars(products.length, 'D')}>
      {products.map((p, i) => (
        <div key={i} className="card-d">
          <ProductImg product={p} className="d-img" style={{ width: 'var(--thumb-size, 100px)', height: 'calc(var(--thumb-size, 100px) * 1.3)', objectFit: 'contain', background: '#fff' }} />
          <div className="d-body">
            <div>
              <div className="d-name">{p.name}</div>
              {p.spec && <div className="d-spec">{p.spec}</div>}
            </div>
            {showPrice && <div className="d-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderTemplateE({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  const groups = groupByCategory(products);
  let num = 0;
  return (
    <div className="grid-e" style={getScaleVars(products.length, 'E')}>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} style={{ display: 'contents' }}>
          <div className="grid-e-cat-header">
            <span className="ech-name">{cat}</span>
            <span className="ech-count">{items.length}건</span>
          </div>
          {items.map((p) => {
            num++;
            return (
              <div key={p.code} className="card-e">
                <div className="e-num">{num}</div>
                <div className="e-info">
                  <div className="e-name">{p.name}</div>
                  {p.spec && <div className="e-spec">{p.spec}</div>}
                </div>
                <div className="e-dots" />
                {showPrice && <div className="e-price">{formatPrice(p.sell)}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function RenderTemplateF({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  return (
    <div className="grid-f" style={getScaleVars(products.length, 'F')}>
      {products.map((p, i) => (
        <div key={i} className="card-f">
          <ProductImg product={p} className="f-img" style={{ width: '45%', height: 'var(--card-img-h, 260px)', objectFit: 'contain', background: '#fff' }} />
          <div className="f-body">
            <div className="f-name">{p.name}</div>
            {p.spec && <div className="f-spec">{p.spec}</div>}
            {showPrice && <div className="f-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ TEMPLATE L: 테이블형 (Clean Table) ═══
function RenderTemplateL({ products, showPrice }: { products: Product[]; showPrice: boolean }) {
  const groups = groupByCategory(products);
  return (
    <div className="grid-l" style={getScaleVars(products.length, 'L')}>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="l-section">
          <div className="l-cat-header">{cat}</div>
          <div className="l-table">
            {/* Table header */}
            <div className="l-row l-row-head">
              <div className="l-cell l-cell-no">No.</div>
              <div className="l-cell l-cell-name">품목명</div>
              <div className="l-cell l-cell-spec">규격</div>
              {showPrice && <div className="l-cell l-cell-price">단가</div>}
            </div>
            {items.map((p, i) => (
              <div key={p.code} className={`l-row ${i % 2 === 0 ? 'l-row-even' : ''}`}>
                <div className="l-cell l-cell-no">{i + 1}</div>
                <div className="l-cell l-cell-name">{p.name}</div>
                <div className="l-cell l-cell-spec">{p.spec || '-'}</div>
                {showPrice && <div className="l-cell l-cell-price l-price-val">{formatPrice(p.sell)}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderCover({ products, showPrice, settings }: { products: Product[]; showPrice: boolean; settings: CoverSettings }) {
  const heroes = products.slice(0, 3);
  return (
    <div className="cover-body">
      <div className="cover-intro">
        <div className="cover-intro-badge">
          <div className="cib-label">주문 마감</div>
          <div className="cib-value">{settings.deadline}</div>
        </div>
        <div className="cover-intro-badge">
          <div className="cib-label">배송 안내</div>
          <div className="cib-value">{settings.delivery}</div>
        </div>
        <div className="cover-intro-badge">
          <div className="cib-label">최소 주문</div>
          <div className="cib-value">{settings.minOrder}</div>
        </div>
        <div className="cover-intro-badge">
          <div className="cib-label">결제 방식</div>
          <div className="cib-value">{settings.payment}</div>
        </div>
      </div>
      <div className="cover-pick-header">
        <div className="cph-line" />
        <div className="cph-title">{settings.ribbon}</div>
        <div className="cph-badge">BEST PICK</div>
        <div className="cph-line" />
      </div>
      <div className="cover-products">
        {heroes.map((p, i) => (
          <div key={i} className={`cover-card ${i === 0 ? 'cover-card-main' : ''}`}>
            <div className="cc-ribbon">{i === 0 ? settings.ribbon : '추천 상품'}</div>
            <ProductImg product={p} className="cc-img" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
            <div className="cc-body">
              <div className="cc-name">{p.name}</div>
              <div className="cc-spec">{p.spec}</div>
              {showPrice && <div className="cc-price">{formatPrice(p.sell).replace('원', '')}<span>원</span></div>}
            </div>
          </div>
        ))}
      </div>
      <div className="cover-info-section">
        <div className="cover-info-box full-width">
          <div className="cib-title">회사 소개</div>
          <div className="cib-content">{settings.description}</div>
        </div>
      </div>
    </div>
  );
}

interface CoverSettings {
  ribbon: string;
  deadline: string;
  delivery: string;
  minOrder: string;
  payment: string;
  description: string;
}

// ══════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════
export default function FlyerPage() {
  // ── Data State ──
  const [products, setProducts] = useState<Product[]>([]);
  const [noSellProducts, setNoSellProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [minorCategories, setMinorCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activeMinor, setActiveMinor] = useState('전체');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});
  const [showNoSell, setShowNoSell] = useState(false);

  // ── Flyer Settings ──
  const [template, setTemplate] = useState<Template>('A');
  const [theme, setTheme] = useState<Theme>('earth');
  const [companyName, setCompanyName] = useState('지구농산');
  const [subtitle, setSubtitle] = useState('거래처가 믿고 맡길 수 있는 식자재 유통 파트너');
  const [footerNote, setFooterNote] = useState('※ 가격은 부가세 별도입니다. 주문·문의는 담당자에게 연락해 주세요.');
  const CONTACTS = [
    { id: 0, label: '대표', number: '1566-1521' },
    { id: 1, label: '1번', number: '010-4478-5533' },
    { id: 2, label: '2번', number: '010-4460-5544' },
    { id: 3, label: '3번', number: '010-2681-4465' },
    { id: 4, label: '4번', number: '010-2699-4411' },
    { id: 5, label: '5번', number: '010-3064-4422' },
    { id: 6, label: '6번', number: '010-3370-1188' },
    { id: 7, label: '7번', number: '010-7359-5544' },
    { id: 8, label: '8번', number: '010-4407-5533' },
    { id: 9, label: '9번', number: '010-9836-5533' },
    { id: 10, label: '10번', number: '010-2657-9966' },
  ];
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set([0]));
  const [showContactPicker, setShowContactPicker] = useState(false);
  const contact = CONTACTS.filter(c => selectedContacts.has(c.id)).map(c => `Tel. ${c.number}`).join(' / ');
  const [flyerDate, setFlyerDate] = useState(new Date().toISOString().slice(0, 10));
  const [showPrice, setShowPrice] = useState(true);
  const [zoom, setZoom] = useState(0.7);
  const [generated, setGenerated] = useState(false);

  // ── Cover Settings ──
  const [coverSettings, setCoverSettings] = useState<CoverSettings>({
    ribbon: '이달의 특가',
    deadline: '매주 목요일 오후 6시',
    delivery: '주문 다음날 오전 배송',
    minOrder: '1box 이상',
    payment: '현금·카드·계좌이체',
    description: '신선한 국내산 농산물을 산지 직거래로 공급합니다.\n20년 경력의 믿을 수 있는 파트너가 되겠습니다.',
  });

  // ── Toast ──
  const [toast, setToast] = useState('');
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // ── Edit Modal ──
  const [editModal, setEditModal] = useState<{ code: string; original: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const flyerRef = useRef<HTMLDivElement>(null);

  // ── Load Products ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data.filter(p => p.sell > 0));
      setNoSellProducts(data.filter(p => !p.sell || p.sell <= 0));
      const sellData = data.filter(p => p.sell > 0);
      setCategories(getMajorCategories(sellData));
      setMinorCategories(getMinorCategories(sellData));
      setLoading(false);
    })();
  }, []);

  // ── Filtered Products ──
  // 현재 대분류에 해당하는 중분류 목록
  const filteredMinors = activeCategory === '전체'
    ? minorCategories
    : [...new Set(products.filter(p => p.major_name === activeCategory).map(p => p.minor_name).filter(Boolean))].sort();

  const filtered = products.filter(p => {
    const matchCat = activeCategory === '전체' || p.major_name === activeCategory;
    const matchMinor = activeMinor === '전체' || p.minor_name === activeMinor;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchCat && matchMinor && matchSearch;
  });

  // ── Selected Products (maintain order) ──
  const selectedProducts = products
    .filter(p => selected.has(p.code))
    .map(p => ({ ...p, name: nameOverrides[p.code] || p.name }));

  // ── Actions ──
  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }
  function selectAllFiltered() {
    setSelected(prev => {
      const next = new Set(prev);
      filtered.forEach(p => next.add(p.code));
      return next;
    });
  }
  function clearAll() { setSelected(new Set()); }

  function openEditModal(code: string, currentName: string) {
    setEditModal({ code, original: currentName });
    setEditValue(nameOverrides[code] || currentName);
  }
  function confirmEdit() {
    if (!editModal) return;
    setNameOverrides(prev => ({ ...prev, [editModal.code]: editValue }));
    setEditModal(null);
    showToast('품목명이 수정되었습니다');
  }

  // 템플릿별 페이지당 최대 품목 수 (A4 실측 기준)
  // 가용높이 ~976px = 1123 - header(70) - footer(45) - bodyPad(32)
  const TEMPLATE_MAX: Record<Template, number> = {
    A: 12,    // 2col × 6row, tall portrait cards
    B: 18,    // list rows
    C: 18,    // 3col × 6row, portrait cards
    D: 18,    // 2col × 9row, horizontal cards with portrait image
    E: 50,    // 2col compact table
    F: 3,     // 1col large showcase cards
    L: 25,    // table rows
    COVER: 12
  };

  function generateFlyer() {
    if (selected.size === 0) { showToast('품목을 선택해 주세요'); return; }
    const max = TEMPLATE_MAX[template] || 20;
    const totalPages = Math.ceil(selectedProducts.length / max);
    setGenerated(true);
    if (totalPages > 1) {
      showToast(`전단지 생성 완료! (${selectedProducts.length}개 품목 · ${totalPages}페이지)`);
    } else {
      showToast(`전단지 생성 완료! (${selectedProducts.length}개 품목)`);
    }
  }

  // ── Export (다중 페이지 지원) ──
  async function captureFlyer(pageEl: HTMLElement, scale: number) {
    const html2canvas = (await import('html2canvas')).default;
    // 캡처 전 zoom 리셋
    const container = flyerRef.current;
    const prevTransform = container ? container.style.transform : '';
    if (container) container.style.transform = 'scale(1)';

    const canvas = await html2canvas(pageEl, {
      scale: scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
      logging: false,
      imageTimeout: 15000,
      onclone: function(clonedDoc: Document) {
        // 클론된 문서에서 이미지 CORS 설정
        const imgs = clonedDoc.querySelectorAll('img');
        imgs.forEach(function(img) { img.crossOrigin = 'anonymous'; });
      }
    });

    if (container) container.style.transform = prevTransform;
    return canvas;
  }

  async function exportPDF() {
    const container = flyerRef.current;
    if (!container) return;
    showToast('PDF 생성 중...');
    const { jsPDF } = await import('jspdf');
    const pages = container.querySelectorAll('.flyer-a4');
    if (pages.length === 0) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await captureFlyer(pages[i] as HTMLElement, 3);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH);
    }
    pdf.save(`전단지_${flyerDate}.pdf`);
    showToast(`PDF 다운로드 완료! (${pages.length}페이지)`);
  }

  async function exportPNG() {
    const container = flyerRef.current;
    if (!container) return;
    showToast('PNG 생성 중...');
    const pages = container.querySelectorAll('.flyer-a4');
    if (pages.length === 0) return;

    for (let i = 0; i < pages.length; i++) {
      const canvas = await captureFlyer(pages[i] as HTMLElement, 3);
      const link = document.createElement('a');
      link.download = pages.length > 1 ? `전단지_${flyerDate}_${i + 1}.png` : `전단지_${flyerDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    showToast(`PNG 다운로드 완료! (${pages.length}장)`);
  }

  function doPrint() { window.print(); }

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <header style={{
        height: '52px', background: '#78350f', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: '12px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <img src="/logo.png" alt="지구농산" style={{ height: '28px', width: '28px' }} />
        <h1 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', fontFamily: "'EBSHunminjeongeum', 'Jua', sans-serif" }}>전단지 생성기</h1>
        <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.2)' }}>DB 연동</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 400 }}>v2.9</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn btn-print" onClick={doPrint}>인쇄</button>
          <button className="btn btn-white" onClick={exportPNG}>PNG</button>
          <button className="btn-orange btn" onClick={exportPDF}>PDF 저장</button>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ═══ LEFT PANEL ═══ */}
        <div style={{
          width: '340px', flexShrink: 0, background: 'var(--panel)',
          borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Stats */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
              품목 현황
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { num: products.length, label: '판매단가 설정', color: 'var(--accent)' },
                { num: selected.size, label: `선택됨 (권장 ${TEMPLATE_MAX[template]}개)`, color: selected.size > TEMPLATE_MAX[template] ? '#c0392b' : 'var(--accent2)' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: s.color }}>{s.num}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* 판매단가 미설정 알림 */}
            {noSellProducts.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div
                  onClick={() => setShowNoSell(!showNoSell)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', background: '#fff3e0', border: '1px solid #ffe0b2',
                    borderRadius: showNoSell ? '6px 6px 0 0' : '6px', cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e65100' }}>
                    판매단가 미설정 {noSellProducts.length}건
                  </span>
                  <span style={{ fontSize: '10px', color: '#bf360c' }}>{showNoSell ? '접기' : '펼치기'}</span>
                </div>
                {showNoSell && (
                  <div style={{
                    maxHeight: '160px', overflowY: 'auto',
                    border: '1px solid #ffe0b2', borderTop: 'none',
                    borderRadius: '0 0 6px 6px', background: '#fff8f0',
                  }}>
                    {noSellProducts.map(p => (
                      <div key={p.code} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 10px', borderBottom: '1px solid #fff3e0',
                        fontSize: '11px',
                      }}>
                        <span style={{ color: '#bf360c', fontWeight: 600, width: '70px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.code}</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>{p.name}</span>
                        <span style={{ color: '#999', flexShrink: 0, fontSize: '10px' }}>{p.spec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search & Filter */}
          <div style={{ borderBottom: '1px solid var(--border)', padding: '14px 16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
              검색 / 필터
            </h3>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="품목명 또는 코드 검색..."
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
                borderRadius: '6px', fontFamily: 'inherit', fontSize: '13px', background: 'var(--card-bg)',
                outline: 'none', marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
              <div className={`cat-tab ${activeCategory === '전체' ? 'active' : ''}`} onClick={() => { setActiveCategory('전체'); setActiveMinor('전체'); }}>전체</div>
              {categories.map(cat => (
                <div key={cat} className={`cat-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => { setActiveCategory(cat); setActiveMinor('전체'); }}>{cat}</div>
              ))}
            </div>
            {filteredMinors.length > 0 && (
              <div style={{ marginTop: '4px', padding: '6px 8px', background: '#f5f0e8', borderRadius: '6px', border: '1px solid #e8e0d0' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#999', marginBottom: '4px', letterSpacing: '0.3px' }}>중분류</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  <div
                    className={`cat-tab ${activeMinor === '전체' ? 'active' : ''}`}
                    style={{ fontSize: '10px', padding: '3px 8px' }}
                    onClick={() => setActiveMinor('전체')}
                  >전체</div>
                  {filteredMinors.map(minor => (
                    <div
                      key={minor}
                      className={`cat-tab ${activeMinor === minor ? 'active' : ''}`}
                      style={{ fontSize: '10px', padding: '3px 8px' }}
                      onClick={() => setActiveMinor(minor)}
                    >{minor}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>품목 목록</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer' }} onClick={selectAllFiltered}>전체 선택</a>
              <a style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', cursor: 'pointer' }} onClick={clearAll}>전체 해제</a>
            </div>
          </div>

          {/* Price Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 6px', background: '#f7f4ef', borderBottom: '1px solid var(--border)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>가격 표시</span>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>해제 = 품목표</span>
            </label>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>클릭시 품목명 수정</span>
          </div>

          {/* Product List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--muted)' }}>
                <div className="spinner" />
                <p style={{ fontSize: '13px' }}>품목 불러오는 중...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                <p style={{ fontSize: '13px' }}>검색 결과 없음</p>
              </div>
            ) : (
              filtered.map(p => {
                const isSelected = selected.has(p.code);
                const imgUrl = getImageUrl(p);
                return (
                  <div
                    key={p.code}
                    className={`product-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelect(p.code)}
                  >
                    <input type="checkbox" checked={isSelected} readOnly
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
                    {imgUrl ? (
                      <img src={imgUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', background: '#eee', flexShrink: 0, border: '1px solid var(--border)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#aaa', fontWeight: 600, flexShrink: 0, border: '1px solid var(--border)' }}>IMG</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
                        onClick={e => { e.stopPropagation(); openEditModal(p.code, p.name); }}
                        title="클릭하여 품목명 수정"
                      >
                        {nameOverrides[p.code] || p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{p.spec}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent2)', whiteSpace: 'nowrap' }}>
                      {formatPrice(p.sell)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══ MIDDLE PANEL ═══ */}
        <div style={{
          width: '200px', flexShrink: 0, background: '#f7f4ef',
          borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          overflowY: 'auto', padding: '14px 12px', gap: '16px',
        }}>
          {/* Selected Count */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>선택 현황</h3>
            <div style={{ background: 'var(--accent)', color: '#fff', borderRadius: '8px', padding: '10px', textAlign: 'center' }} className={`theme-${theme}`}>
              <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1 }}>{selected.size}</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '3px' }}>개 선택됨</div>
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '6px' }}>권장: 10 ~ 30개</div>
            </div>
            {selected.size > 0 && selected.size < 3 && template === 'COVER' && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', borderRadius: '6px', padding: '8px', fontSize: '11px', textAlign: 'center', marginTop: '6px' }}>
                표지는 최소 3개 품목을 선택해 주세요
              </div>
            )}
          </div>

          {/* Templates - Compact Grid */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>레이아웃</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {([
                { id: 'A' as Template, label: '세로카드2열' },
                { id: 'B' as Template, label: '리스트형' },
                { id: 'C' as Template, label: '세로카드3열' },
                { id: 'D' as Template, label: '가로배치형' },
                { id: 'E' as Template, label: '가격표' },
                { id: 'F' as Template, label: '대형쇼케이스' },
                { id: 'L' as Template, label: '테이블형' },
              ]).map(t => (
                <div
                  key={t.id}
                  onClick={() => { setTemplate(t.id); setGenerated(false); }}
                  style={{
                    padding: '7px 4px 5px',
                    borderRadius: '4px',
                    border: template === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: template === t.id ? '#fef3c7' : 'var(--panel)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, color: template === t.id ? 'var(--accent)' : '#555', letterSpacing: '-0.3px', lineHeight: 1 }}>{t.id}</div>
                  <div style={{ fontSize: '8px', fontWeight: 600, marginTop: '3px', color: template === t.id ? 'var(--accent)' : 'var(--muted)', lineHeight: 1.1 }}>{t.label}</div>
                </div>
              ))}
            </div>
            {/* COVER - full width */}
            <div
              onClick={() => { setTemplate('COVER'); setGenerated(false); }}
              style={{
                marginTop: '4px',
                padding: '7px',
                borderRadius: '4px',
                border: template === 'COVER' ? '2px solid var(--accent)' : '1px solid var(--accent2)',
                background: template === 'COVER' ? '#fef3c7' : 'var(--panel)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.12s',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: template === 'COVER' ? 'var(--accent)' : 'var(--accent2)' }}>표지 (미끼상품)</div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>설정</h3>

            <OptionInput label="회사명" value={companyName} onChange={setCompanyName} />
            <OptionInput label="부제목" value={subtitle} onChange={setSubtitle} />
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>하단 문구</label>
              <textarea
                value={footerNote} onChange={e => setFooterNote(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '5px', fontFamily: 'inherit', fontSize: '12px', background: 'var(--panel)', outline: 'none', height: '52px', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div
                onClick={() => setShowContactPicker(!showContactPicker)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', marginBottom: '5px' }}
              >
                <label style={{ fontSize: '11px', fontWeight: 700 }}>연락처 ({selectedContacts.size}명 선택)</label>
                <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>{showContactPicker ? '접기' : '펼치기'}</span>
              </div>
              {showContactPicker && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {CONTACTS.map(c => {
                    const isOn = selectedContacts.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedContacts(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) { next.delete(c.id); } else { next.add(c.id); }
                            return next;
                          });
                        }}
                        style={{
                          padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                          border: isOn ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isOn ? '#fef3c7' : 'var(--panel)',
                          color: isOn ? 'var(--accent)' : '#888',
                          transition: 'all 0.12s',
                        }}
                      >
                        <div>{c.label}</div>
                        <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '1px' }}>{c.number}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                {contact || '연락처를 선택하세요'}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>기준일</label>
              <input type="date" value={flyerDate} onChange={e => setFlyerDate(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '5px', fontFamily: 'inherit', fontSize: '12px', background: 'var(--panel)', outline: 'none' }} />
            </div>

            {/* Theme Colors */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>테마 컬러</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {THEMES.map(t => (
                  <div
                    key={t.id}
                    className={`swatch ${theme === t.id ? 'active' : ''}`}
                    style={{ background: t.color }}
                    title={t.label}
                    onClick={() => setTheme(t.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* COVER Settings */}
          {template === 'COVER' && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                표지 설정
              </h3>
              <OptionInput label="미끼상품 리본 문구" value={coverSettings.ribbon} onChange={v => setCoverSettings(s => ({ ...s, ribbon: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '3px' }}>주문 마감</label>
                  <input value={coverSettings.deadline} onChange={e => setCoverSettings(s => ({ ...s, deadline: e.target.value }))}
                    style={{ width: '100%', padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '3px' }}>배송 안내</label>
                  <input value={coverSettings.delivery} onChange={e => setCoverSettings(s => ({ ...s, delivery: e.target.value }))}
                    style={{ width: '100%', padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '3px' }}>최소 주문</label>
                  <input value={coverSettings.minOrder} onChange={e => setCoverSettings(s => ({ ...s, minOrder: e.target.value }))}
                    style={{ width: '100%', padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '3px' }}>결제 방식</label>
                  <input value={coverSettings.payment} onChange={e => setCoverSettings(s => ({ ...s, payment: e.target.value }))}
                    style={{ width: '100%', padding: '5px 6px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', outline: 'none' }} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '3px' }}>소개글</label>
                <textarea value={coverSettings.description} onChange={e => setCoverSettings(s => ({ ...s, description: e.target.value }))}
                  rows={3} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '12px', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            className="btn btn-orange"
            style={{ width: '100%', marginTop: 'auto', padding: '12px' }}
            onClick={generateFlyer}
          >
            전단지 생성
          </button>
        </div>

        {/* ═══ RIGHT PANEL: PREVIEW ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e8dcc8' }}>
          {/* Preview Header */}
          <div style={{
            background: 'var(--panel)', borderBottom: '1px solid var(--border)',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>미리보기</span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {generated
                ? `${selectedProducts.length}개 품목 · 템플릿 ${template}${Math.ceil(selectedProducts.length / (TEMPLATE_MAX[template] || 20)) > 1 ? ` · ${Math.ceil(selectedProducts.length / (TEMPLATE_MAX[template] || 20))}페이지` : ''}`
                : '품목을 선택하고 생성하세요'}
            </span>
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '5px', background: 'var(--card-bg)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                −
              </button>
              <span style={{ width: '40px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)', lineHeight: '28px' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '5px', background: 'var(--card-bg)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                +
              </button>
              <button onClick={() => setZoom(0.7)}
                style={{ width: '28px', height: '28px', border: '1px solid var(--border)', borderRadius: '5px', background: 'var(--card-bg)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="맞춤">
                ⊡
              </button>
            </div>
          </div>

          {/* Preview Area (다중 페이지) */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
            <div
              ref={flyerRef}
              id="printArea"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
              {(() => {
                // 페이지별 품목 분할
                const max = TEMPLATE_MAX[template] || 20;
                const pageChunks = template === 'COVER'
                  ? [selectedProducts]
                  : (selectedProducts.length > 0 ? chunkArray(selectedProducts, max) : [[]]);
                const totalPages = pageChunks.length;

                // 미생성 상태
                if (!generated || selectedProducts.length === 0) {
                  return (
                    <div className={`flyer-a4 theme-${theme}`}>
                      <div className="flyer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src="/logo.png" alt="" style={{ height: '32px', width: '32px' }} />
                          <div>
                            <div className="flyer-company">{companyName}</div>
                            <div className="flyer-subtitle">{subtitle}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="flyer-tagline">{template === 'COVER' ? '회사 소개' : (showPrice ? '납품 가격표' : '품목 안내')}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{flyerDate}</div>
                        </div>
                      </div>
                      <div className="flyer-body">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '600px', gap: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                          <p style={{ fontSize: '13px' }}>
                            {template === 'COVER' ? '미끼상품 3개 이상 선택 후' : '품목을 선택 후'}<br />
                            좌측 하단의 &quot;전단지 생성&quot; 버튼을 누르세요.
                          </p>
                        </div>
                      </div>
                      <div className="flyer-footer">
                        <div className="f-note">{footerNote}</div>
                        <div className="f-contact">{contact}</div>
                      </div>
                    </div>
                  );
                }

                // COVER 템플릿 (단일 페이지)
                if (template === 'COVER') {
                  return (
                    <div className={`flyer-a4 theme-${theme}`}>
                      <div className="flyer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src="/logo.png" alt="" style={{ height: '32px', width: '32px' }} />
                          <div>
                            <div className="flyer-company">{companyName}</div>
                            <div className="flyer-subtitle">{subtitle}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="flyer-tagline">회사 소개</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{flyerDate}</div>
                        </div>
                      </div>
                      <RenderCover products={selectedProducts} showPrice={showPrice} settings={coverSettings} />
                      <div className="flyer-footer">
                        <div className="f-note">{footerNote}</div>
                        <div className="f-contact">{contact}</div>
                      </div>
                    </div>
                  );
                }

                // 일반 템플릿 (다중 페이지 자동 분할)
                const RenderMap: Record<string, React.FC<{ products: Product[]; showPrice: boolean }>> = {
                  A: RenderTemplateA, B: RenderTemplateB, C: RenderTemplateC, D: RenderTemplateD,
                  E: RenderTemplateE, F: RenderTemplateF, L: RenderTemplateL,
                };
                const TemplateRenderer = RenderMap[template];

                return pageChunks.map((chunk, pageIdx) => (
                  <div
                    key={pageIdx}
                    className={`flyer-a4 theme-${theme}`}
                    style={{ marginBottom: pageIdx < totalPages - 1 ? '24px' : 0 }}
                  >
                    {/* Header */}
                    <div className="flyer-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.png" alt="" style={{ height: '32px', width: '32px' }} />
                        <div>
                          <div className="flyer-company">{companyName}</div>
                          <div className="flyer-subtitle">{subtitle}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="flyer-tagline">{showPrice ? '납품 가격표' : '품목 안내'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{flyerDate}</div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flyer-body">
                      {TemplateRenderer && <TemplateRenderer products={chunk} showPrice={showPrice} />}
                    </div>

                    {/* Footer */}
                    <div className="flyer-footer">
                      <div className="f-note">{footerNote}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {totalPages > 1 && (
                          <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>
                            {pageIdx + 1} / {totalPages}
                          </span>
                        )}
                        <div className="f-contact">{contact}</div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditModal(null)}
        >
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px 28px', width: '360px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>품목명 수정</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '14px' }}>원래 이름: {editModal.original}</div>
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditModal(null); }}
              autoFocus
              style={{ width: '100%', border: '2px solid var(--accent)', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={confirmEdit}
                style={{ flex: 1, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                확인
              </button>
              <button onClick={() => setEditModal(null)}
                style={{ flex: 1, background: '#f0ede8', color: 'var(--text)', border: 'none', borderRadius: '6px', padding: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

// ── Option Input Helper ──
function OptionInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '5px', fontFamily: 'inherit', fontSize: '12px', background: 'var(--panel)', outline: 'none' }}
      />
    </div>
  );
}
