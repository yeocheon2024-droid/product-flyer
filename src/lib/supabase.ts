import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://joqupkcczjebwnomnfbo.supabase.co';
const supabaseKey = 'sb_publishable_SsIL-yhXCilGv7XZXo963Q_PYpeeG83';

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
  sell: number;
  registered_at: string;
  image_url?: string;
  display_name?: string;
  sold_out?: boolean;
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

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
  return data || [];
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
