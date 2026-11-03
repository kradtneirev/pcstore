import type {
  CartItem,
  Category,
  Coupon,
  HomeData,
  Order,
  PaymentMethod,
  Product,
  ProductPage,
  Quote,
  User,
} from './types';

export class ApiError extends Error {
  status: number;
  problems?: { productId: string; message: string }[];
  constructor(status: number, message: string, problems?: ApiError['problems']) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

// Store Redux cung cấp địa chỉ máy chủ + token (xem store/index.ts)
let getBaseUrl: () => string = () => '';
let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApi(opts: { getBaseUrl: () => string; getToken: () => string | null; onUnauthorized: () => void }) {
  getBaseUrl = opts.getBaseUrl;
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

// Máy chủ miễn phí (Render) "ngủ" khi không dùng, lần gọi đầu có thể mất 30–50 giây
const TIMEOUT_MS = 60000;

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; baseUrl?: string } = {},
): Promise<T> {
  const base = (options.baseUrl ?? getBaseUrl()).replace(/\/+$/, '');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra Wi-Fi và địa chỉ máy chủ trong mục Cài đặt.');
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Phản hồi không phải JSON (thường do sai địa chỉ máy chủ)
  }
  if (!res.ok) {
    if (res.status === 401 && options.auth) onUnauthorized();
    throw new ApiError(res.status, data?.message ?? `Lỗi máy chủ (${res.status})`, data?.problems);
  }
  if (data === null) throw new ApiError(res.status, 'Máy chủ trả về dữ liệu không hợp lệ');
  return data as T;
}

export interface ProductQuery {
  ids?: string;
  q?: string;
  category?: string;
  brand?: string;
  sort?: string;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v === true ? '1' : String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CardInput {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export const api = {
  health: (baseUrl?: string) => request<{ ok: boolean }>('/health', { baseUrl }),
  home: () => request<HomeData>('/home'),
  brands: (category?: string) => request<string[]>(`/brands${toQuery({ category })}`),
  products: (q: ProductQuery) => request<ProductPage>(`/products${toQuery({ ...q })}`),
  product: (id: string) =>
    request<{ product: Product; category: Category; related: Product[] }>(`/products/${encodeURIComponent(id)}`),
  coupons: () => request<Coupon[]>('/coupons'),

  login: (identifier: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { identifier, password } }),
  register: (body: { name: string; email: string; phone: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body }),
  me: () => request<{ user: User }>('/auth/me', { auth: true }),
  updateMe: (body: Partial<Pick<User, 'name' | 'phone' | 'address'>>) =>
    request<{ user: User }>('/auth/me', { method: 'PUT', body, auth: true }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ token: string; user: User }>('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
      auth: true,
    }),

  getCart: () => request<{ items: CartItem[] }>('/cart', { auth: true }),
  saveCart: (items: { productId: string; quantity: number; selected: boolean }[]) =>
    request<{ items: CartItem[] }>('/cart', { method: 'PUT', body: { items }, auth: true }),

  quote: (items: CartLine[], couponCode?: string) =>
    request<Quote>('/orders/quote', { method: 'POST', body: { items, couponCode } }),
  createOrder: (body: {
    items: CartLine[];
    couponCode?: string;
    shipping: { name: string; phone: string; address: string; note: string };
    paymentMethod: PaymentMethod;
    card?: CardInput;
  }) => request<{ order: Order }>('/orders', { method: 'POST', body, auth: true }),
  orders: () => request<{ orders: Order[] }>('/orders', { auth: true }),
  order: (id: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, { auth: true }),
  payOrder: (id: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(id)}/pay`, { method: 'POST', auth: true }),
  cancelOrder: (id: string) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', auth: true }),
};

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : 'Đã có lỗi xảy ra';
}
