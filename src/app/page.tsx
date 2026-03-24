'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchProducts, getImageUrl, formatPrice, getMajorCategories, Product } from '@/lib/supabase';

type Layout = 'a4-portrait' | 'a5-landscape';

export default function FlyerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [companyName, setCompanyName] = useState('여천 식자재');
  const [flyerDate, setFlyerDate] = useState(new Date().toISOString().slice(0, 10));
  const [contact, setContact] = useState('');
  const [layout, setLayout] = useState<Layout>('a4-portrait');
  const [showPreview, setShowPreview] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const data = await fetchProducts();
    setProducts(data.filter(p => p.sell > 0));
    setCategories(getMajorCategories(data));
    setLoading(false);
  }

  function toggleSelect(code: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(p => p.code)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const filtered = products.filter(p => {
    const matchCategory = activeCategory === '전체' || p.major_name === activeCategory;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const selectedProducts = products.filter(p => selected.has(p.code));

  const gridConfig = {
    'a4-portrait': { cols: 3, rows: 4, maxPerPage: 12, width: '210mm', height: '297mm' },
    'a5-landscape': { cols: 3, rows: 2, maxPerPage: 6, width: '210mm', height: '148mm' },
  };

  const config = gridConfig[layout];

  const pages: Product[][] = [];
  for (let i = 0; i < selectedProducts.length; i += config.maxPerPage) {
    pages.push(selectedProducts.slice(i, i + config.maxPerPage));
  }

  async function downloadPDF() {
    if (!previewRef.current || pages.length === 0) return;

    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const isLandscape = layout === 'a5-landscape';
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: isLandscape ? 'a5' : 'a4',
    });

    const pageElements = previewRef.current.querySelectorAll('.flyer-page');

    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pageElements[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
    }

    pdf.save(`전단지_${flyerDate}.pdf`);
  }

  return (
    <div>
      {/* 설정 */}
      <div className="bg-white rounded-xl border border-brand-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">전단지 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">회사명</label>
            <input
              type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">날짜</label>
            <input
              type="date" value={flyerDate} onChange={e => setFlyerDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">연락처</label>
            <input
              type="text" value={contact} onChange={e => setContact(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">레이아웃</label>
            <select
              value={layout} onChange={e => setLayout(e.target.value as Layout)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="a4-portrait">A4 세로 (3x4 = 12개)</option>
              <option value="a5-landscape">A5 가로 (3x2 = 6개)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 품목 선택 */}
      <div className="bg-white rounded-xl border border-brand-100 p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-600">
            품목 선택 <span className="text-brand-500">({selected.size}개 선택됨)</span>
          </h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-brand-100 text-brand-600 rounded-lg hover:bg-brand-200">
              전체 선택
            </button>
            <button onClick={deselectAll} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">
              전체 해제
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <select
            value={activeCategory} onChange={e => setActiveCategory(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="전체">전체</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">로딩 중...</div>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg">
            {filtered.map(p => (
              <label
                key={p.code}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-brand-50 border-b border-gray-50
                  ${selected.has(p.code) ? 'bg-brand-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.code)}
                  onChange={() => toggleSelect(p.code)}
                  className="w-4 h-4 rounded text-brand-400 focus:ring-brand-300"
                />
                <span className="text-xs text-gray-400 w-24 shrink-0">{p.code}</span>
                <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{p.spec}</span>
                <span className="text-sm font-medium text-brand-500 shrink-0 w-20 text-right">
                  {formatPrice(p.sell)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      {selected.size > 0 && (
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setShowPreview(true)}
            className="px-6 py-3 bg-brand-400 hover:bg-brand-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            미리보기 ({selected.size}개, {pages.length}페이지)
          </button>
          <button
            onClick={downloadPDF}
            className="px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-medium text-sm transition-colors"
          >
            PDF 다운로드
          </button>
        </div>
      )}

      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto p-4" onClick={() => setShowPreview(false)}>
          <div className="max-w-4xl mx-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">미리보기 ({pages.length}페이지)</h3>
              <div className="flex gap-2">
                <button onClick={downloadPDF} className="px-4 py-2 bg-brand-400 text-white rounded-lg text-sm hover:bg-brand-500">
                  PDF 다운로드
                </button>
                <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500">
                  닫기
                </button>
              </div>
            </div>
            <div ref={previewRef} className="space-y-6">
              {pages.map((pageProducts, pageIdx) => (
                <FlyerPageView
                  key={pageIdx}
                  products={pageProducts}
                  layout={layout}
                  config={config}
                  companyName={companyName}
                  flyerDate={flyerDate}
                  contact={contact}
                  pageNum={pageIdx + 1}
                  totalPages={pages.length}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 숨겨진 PDF 렌더 영역 */}
      {!showPreview && selected.size > 0 && (
        <div ref={previewRef} className="fixed left-[-9999px] top-0">
          {pages.map((pageProducts, pageIdx) => (
            <FlyerPageView
              key={pageIdx}
              products={pageProducts}
              layout={layout}
              config={config}
              companyName={companyName}
              flyerDate={flyerDate}
              contact={contact}
              pageNum={pageIdx + 1}
              totalPages={pages.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlyerPageView({
  products, layout, config, companyName, flyerDate, contact, pageNum, totalPages,
}: {
  products: Product[];
  layout: Layout;
  config: { cols: number; rows: number; width: string; height: string };
  companyName: string;
  flyerDate: string;
  contact: string;
  pageNum: number;
  totalPages: number;
}) {
  return (
    <div
      className="flyer-page bg-white mx-auto shadow-lg"
      style={{
        width: config.width,
        height: config.height,
        padding: '8mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #C8956C', paddingBottom: '4mm', marginBottom: '4mm',
      }}>
        <div>
          <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#34261A' }}>{companyName}</div>
          {contact && <div style={{ fontSize: '9pt', color: '#8B6543', marginTop: '1mm' }}>{contact}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10pt', color: '#6E4F34' }}>{flyerDate}</div>
          <div style={{ fontSize: '8pt', color: '#999' }}>품목 안내</div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`,
        gap: '3mm',
      }}>
        {products.map(product => (
          <FlyerCard key={product.code} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ textAlign: 'center', fontSize: '8pt', color: '#999', marginTop: '2mm' }}>
          {pageNum} / {totalPages}
        </div>
      )}
    </div>
  );
}

function FlyerCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getImageUrl(product);

  return (
    <div style={{
      border: '1px solid #E8E0D8',
      borderRadius: '3mm',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        background: '#FDF8F4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: '24pt', color: '#E8D5C4' }}>📦</span>
        )}
      </div>
      <div style={{ padding: '2mm 3mm', borderTop: '1px solid #F0E8E0' }}>
        <div style={{
          fontSize: '8pt', fontWeight: 600, color: '#34261A',
          lineHeight: 1.3, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {product.name}
        </div>
        {product.spec && (
          <div style={{ fontSize: '7pt', color: '#999', marginTop: '0.5mm' }}>{product.spec}</div>
        )}
        <div style={{
          fontSize: '11pt', fontWeight: 'bold', color: '#C8956C', marginTop: '1mm',
        }}>
          {formatPrice(product.sell)}
        </div>
      </div>
    </div>
  );
}
