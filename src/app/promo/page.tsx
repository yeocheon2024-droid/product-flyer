'use client';

import { useCallback, useEffect, useState } from 'react';
import { MarketingFlyerWorkspace } from '@/features/marketing-flyer/index.js';
import '@/features/marketing-flyer/marketing-flyer.css';
import { fetchProducts, getImageUrl, type Product } from '@/lib/supabase';

export default function PromoDuplexPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchProducts();
      const catalog = rows
        .filter((product) => Number(product.sell) > 0)
        .map((product) => ({
          ...product,
          image_url: getImageUrl(product) || product.image_url,
        }));
      if (catalog.length < 4) {
        throw new Error('행사가가 등록된 상품이 4개 미만이라 양면 전단을 만들 수 없습니다.');
      }
      setProducts(catalog);
    } catch (loadError) {
      setProducts([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : '상품 목록을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  if (loading) {
    return (
      <main className="promo-route-state" aria-live="polite">
        <div className="promo-route-state__spinner" />
        <strong>양면 전단용 상품을 불러오는 중입니다.</strong>
      </main>
    );
  }

  if (error) {
    return (
      <main className="promo-route-state" role="alert">
        <strong>{error}</strong>
        <div className="promo-route-state__actions">
          <a href="/">기존 전단으로 돌아가기</a>
          <button type="button" onClick={() => void loadProducts()}>다시 불러오기</button>
        </div>
      </main>
    );
  }

  // DB 상품을 모두 받은 뒤 마운트해야 기본 특가 슬롯 4개가 정확히 생성된다.
  return <MarketingFlyerWorkspace initialProducts={products} />;
}
