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

// ══════════════════════════════════════════════════════════════════
// 거래처 단가 연동 (2026-10-20, v4.5)
//   수발주 관리자(admin.jiguorder.com)와 같은 Supabase 프로젝트를 쓴다.
//   customers / customer_pricing 은 RLS 로 직원(owner·manager·sales_rep)만 읽을 수 있어
//   관리자 앱과 같은 계정으로 로그인한 뒤 읽는다 (영업사원은 담당 거래처만 보인다).
// ══════════════════════════════════════════════════════════════════

/** 관리자 앱의 가짜 이메일 도메인 — 로그인 ID → 이메일 변환 규칙이 order-admin/src/lib/auth.ts 와 같아야 한다 */
const FAKE_EMAIL_DOMAIN = 'jigufood.local';

export interface Customer {
  id: string;
  name: string;
  assigned_sales_rep_code: string | null;
  is_active: boolean | null;
}

export interface StaffUser {
  userId: string;
  role: string;
  /** 화면 표시용 (영업사원 코드 또는 이메일) */
  label: string;
}

/**
 * 직원 로그인 — 관리자 앱과 동일한 3가지 입력 형식
 *   1) jn3333_1 형식 로그인 ID → RPC 로 영업사원 코드 조회 → rep_<code>@도메인
 *   2) 사번(03) → rep_03@도메인
 *   3) 이메일 → 그대로 (대표/매니저)
 */
export async function loginStaff(
  idInput: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase 설정이 없습니다.' };
  const id = idInput.trim();
  const pw = password.trim();
  if (!id) return { ok: false, error: '아이디를 입력해 주세요.' };
  if (pw.length < 4) return { ok: false, error: '비밀번호는 4자 이상이어야 합니다.' };

  let email: string;
  if (id.includes('@')) {
    email = id;
  } else if (/^jn\d+_\d+$/i.test(id)) {
    const { data: code, error: rpcErr } = await supabase.rpc('sales_rep_code_by_login_id', { lid: id.toLowerCase() });
    if (rpcErr) {
      if (rpcErr.message?.includes('too_many_requests')) return { ok: false, error: '로그인 시도가 너무 많습니다. 10분 후 다시 시도해 주세요.' };
      return { ok: false, error: '로그인 처리 중 오류가 발생했습니다.' };
    }
    if (!code) return { ok: false, error: '아이디 또는 비밀번호가 맞지 않습니다.' };
    email = `rep_${code}@${FAKE_EMAIL_DOMAIN}`;
  } else {
    email = `rep_${id}@${FAKE_EMAIL_DOMAIN}`;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) {
    if (error.message.includes('Invalid login credentials')) return { ok: false, error: '아이디 또는 비밀번호가 맞지 않습니다.' };
    if (/rate limit/i.test(error.message)) return { ok: false, error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' };
    return { ok: false, error: error.message };
  }
  // 거래처 계정 등 직원이 아니면 바로 로그아웃
  const staff = await getStaff();
  if (!staff) {
    await supabase.auth.signOut();
    return { ok: false, error: '직원(관리자·영업사원) 계정만 쓸 수 있습니다.' };
  }
  return { ok: true };
}

/** 현재 세션의 직원 정보 — 세션이 없거나 거래처 계정이면 null */
export async function getStaff(): Promise<StaffUser | null> {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, ref_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = (profile as { role?: string; ref_id?: string | null } | null)?.role;
  if (!role || !['owner', 'manager', 'sales_rep'].includes(role)) return null;
  const refId = (profile as { ref_id?: string | null }).ref_id;
  const label = role === 'sales_rep' && refId ? `영업사원 ${refId}` : (user.email || role);
  return { userId: user.id, role, label };
}

export async function logoutStaff(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** 거래처 목록 (RLS: 영업사원은 담당 거래처만) — 1,000행 넘어도 누락 없이 */
export async function fetchCustomers(): Promise<Customer[]> {
  if (!supabase) return [];
  const pageSize = 1000;
  const all: Customer[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, assigned_sales_rep_code, is_active')
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('거래처 목록 로드 실패:', error);
      return all;
    }
    const page = (data || []) as Customer[];
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

/**
 * 거래처 한 곳의 단가 — 품목코드 → 단가(원). 같은 품목이 여러 행이면 valid_from 최신값.
 * (관리자 앱 src/lib/customerPricing.ts 와 같은 규칙)
 */
export async function fetchCustomerPriceMap(customerId: string): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('customer_pricing')
    .select('product_code, unit_price, valid_from')
    .eq('customer_id', customerId)
    .limit(100000);
  if (error) {
    console.error('거래처 단가 로드 실패:', error);
    return {};
  }
  const latestFrom: Record<string, string> = {};
  const out: Record<string, number> = {};
  for (const r of (data || []) as { product_code: string; unit_price: number; valid_from: string | null }[]) {
    const from = r.valid_from || '';
    if (latestFrom[r.product_code] === undefined || latestFrom[r.product_code] < from) {
      latestFrom[r.product_code] = from;
      out[r.product_code] = Number(r.unit_price);
    }
  }
  return out;
}
