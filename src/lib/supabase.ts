import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/product-images`;

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
}

export function getImageUrl(product: Product): string | null {
  if (product.image_url) return product.image_url;
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

export function formatPrice(price: number): string {
  if (!price || price <= 0) return '-';
  return price.toLocaleString('ko-KR') + '원';
}
