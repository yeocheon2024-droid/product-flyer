import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://joqupkcczjebwnomnfbo.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SsIL-yhXCilGv7XZXo963Q_PYpeeG83';

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null as any;

export const STORAGE_URL = 'https://pub-b2fb7e97bfae4e7f96db58f188aa1ce7.r2.dev';

export interface Product {
  code: string;
  name: string;
  spec: string;
  unit: string;
  major_code: string;
  major_name: string;
  minor_code: string;
  minor_name: string;
  tax: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  cost: number;
  /** 현금할인가 (계좌이체 결제 시 받는 금액) */
  sell: number;
  registered_at: string;
  image_url?: string;
  display_name?: string;
  sold_out?: boolean;
  sort_order?: number;
}

export function getImageUrl(product: Product): string | null {
  if (product.image_url) {
    const url = product.image_url;
    // 이전 Supabase Storage URL → R2로 변환
    if (url.includes('supabase') && url.includes('product-images')) {
      const filename = url.split('/').pop()?.split('?')[0];
      return `${STORAGE_URL}/${filename}`;
    }
    if (url.startsWith('http') && !url.includes('supabase')) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
    }
    return url;
  }
  return `${STORAGE_URL}/${product.code}.png`;
}

// 예약 가격 자동 적용 — 적용일 도래한 pending 건을 products.sell에 반영
export async function applyScheduledPrices(): Promise<number> {
  if (!supabase) return 0;
  try {
    // KST(한국시간) 기준 오늘 날짜
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: pending, error } = await supabase
      .from('price_schedule')
      .select('*')
      .eq('status', 'pending')
      .lte('apply_date', today);
    if (error || !pending || pending.length === 0) return 0;

    let applied = 0;
    const nowIso = new Date().toISOString();
    for (const s of pending) {
      const { data: lockRows } = await supabase
        .from('price_schedule')
        .update({ status: 'applied', applied_at: nowIso })
        .eq('id', s.id)
        .eq('status', 'pending')
        .select();
      if (!lockRows || lockRows.length === 0) continue;

      const { error: upErr } = await supabase
        .from('products')
        .update({ sell: s.new_sell })
        .eq('code', s.product_code);
      if (upErr) {
        await supabase.from('price_schedule')
          .update({ status: 'pending', applied_at: null }).eq('id', s.id);
        continue;
      }
      applied++;
    }
    if (applied > 0) console.log(`[price_schedule] ${applied}건 자동 반영`);
    return applied;
  } catch (err) {
    console.error('applyScheduledPrices error:', err);
    return 0;
  }
}

export async function fetchProducts(): Promise<Product[]> {
  // Public catalog and flyer views are read-only. Scheduled prices are applied by admin/server jobs.
  // 가격과 예약가격 상태는 변경하지 않고 현재 상품 목록만 읽는다.
  // PostgREST 기본 최대 1,000행을 넘는 품목도 누락 없이 가져온다.
  const pageSize = 1000;
  const allProducts: Product[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select('code,name,display_name,spec,sell,image_url,major_name,minor_name,sold_out,sort_order,vendor_type')
      .or('hidden.is.null,hidden.eq.false')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .order('code', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
    const page = (data || []) as Product[];
    allProducts.push(...page);
    if (page.length < pageSize) break;
  }
  // 자체매입(지구로켓) 상품을 항상 첫 줄에 노출. 그 외 정렬은 supabase 결과 유지.
  return allProducts.sort((a, b) => {
    const aSelf = (a as Product & { vendor_type?: string }).vendor_type === 'self' ? 0 : 1;
    const bSelf = (b as Product & { vendor_type?: string }).vendor_type === 'self' ? 0 : 1;
    return aSelf - bSelf;
  });
}

// 중분류 순서 조회
export async function fetchCategoryOrder(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data } = await supabase.from('category_order').select('minor_name,sort_order');
  const map: Record<string, number> = {};
  (data || []).forEach((r: { minor_name: string; sort_order: number }) => {
    map[r.minor_name] = r.sort_order;
  });
  return map;
}

export async function fetchProductByCode(code: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
  return data;
}

export function getMajorCategories(products: Product[]): string[] {
  const categories = new Set(products.map(p => p.major_name).filter(Boolean));
  return Array.from(categories).sort();
}

export function getMinorCategories(products: Product[]): string[] {
  const categories = new Set(products.map(p => p.minor_name).filter(Boolean));
  return Array.from(categories).sort();
}

export function formatPrice(price: number): string {
  if (!price || price <= 0) return '-';
  return price.toLocaleString('ko-KR') + '원';
}
