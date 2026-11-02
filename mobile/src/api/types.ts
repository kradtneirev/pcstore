export interface Category {
  id: string;
  name: string;
  fullName: string;
  icon: string;
  colors: [string, string];
  productCount?: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  rating: number;
  reviews: number;
  sold: number;
  warrantyMonths: number;
  description: string;
  specs: { label: string; value: string }[];
  createdAt: string;
  image: string | null; // null khi chưa có ảnh
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  colors: [string, string];
  icon: string;
  category: string | null;
}

export interface HomeData {
  banners: Banner[];
  categories: Category[];
  flashSale: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type PaymentMethod = 'cod' | 'bank' | 'momo' | 'zalopay' | 'card';

export interface QuoteItem {
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
  lineTotal: number;
  image?: string | null;
}

export interface Quote {
  items: QuoteItem[];
  problems: { productId: string; message: string }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  coupon: { code: string; description: string } | null;
  freeShippingFrom: number;
}

export type OrderStatus = 'pending_payment' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'expired' | 'cancelled';

export interface Order {
  id: string;
  items: QuoteItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  coupon: { code: string; description: string } | null;
  shipping: { name: string; phone: string; address: string; note: string };
  payment: {
    method: PaymentMethod;
    label: string;
    status: PaymentStatus;
    cardBrand?: string;
    cardLast4?: string;
    paidAt?: string;
    expiresAt?: string;
    transferContent?: string;
    receiver?: { bankName?: string; walletName?: string; accountNumber?: string; phone?: string; accountName: string };
  };
  status: OrderStatus;
  cancelReason?: string;
  timeline: { status: string; label: string; at: string }[];
  createdAt: string;
}

export interface Coupon {
  code: string;
  description: string;
  minSubtotal: number;
}
