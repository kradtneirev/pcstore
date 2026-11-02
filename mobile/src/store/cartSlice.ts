import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../api/types';

export const MAX_QTY_PER_ITEM = 10;

export interface CartItem {
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  quantity: number;
  selected: boolean; // được chọn để thanh toán
  image?: string | null;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

// Số lượng tối đa được mua của một sản phẩm
export const maxQuantity = (stock: number) => Math.max(0, Math.min(stock, MAX_QTY_PER_ITEM));

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<{ product: Product; quantity: number }>) {
      const { product, quantity } = action.payload;
      const limit = maxQuantity(product.stock);
      if (limit === 0 || quantity < 1) return;
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, limit);
        existing.price = product.price;
        existing.oldPrice = product.oldPrice;
        existing.stock = product.stock;
        existing.image = product.image;
        existing.selected = true;
      } else {
        state.items.unshift({
          productId: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          oldPrice: product.oldPrice,
          stock: product.stock,
          quantity: Math.min(quantity, limit),
          selected: true,
          image: product.image,
        });
      }
    },
    setQuantity(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.items.find((i) => i.productId === action.payload.productId);
      if (item) item.quantity = Math.max(1, Math.min(action.payload.quantity, maxQuantity(item.stock) || 1));
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },
    removeItems(state, action: PayloadAction<string[]>) {
      state.items = state.items.filter((i) => !action.payload.includes(i.productId));
    },
    toggleSelect(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.productId === action.payload);
      if (item) item.selected = !item.selected;
    },
    selectAll(state, action: PayloadAction<boolean>) {
      state.items.forEach((i) => {
        i.selected = action.payload;
      });
    },
    // Cập nhật giá/tồn kho mới nhất từ máy chủ
    syncProducts(state, action: PayloadAction<Pick<Product, 'id' | 'price' | 'oldPrice' | 'stock' | 'image'>[]>) {
      for (const p of action.payload) {
        const item = state.items.find((i) => i.productId === p.id);
        if (!item) continue;
        item.image = p.image;
        item.price = p.price;
        item.oldPrice = p.oldPrice;
        item.stock = p.stock;
        const limit = maxQuantity(p.stock);
        if (limit > 0 && item.quantity > limit) item.quantity = limit;
      }
    },
    clearCart(state) {
      state.items = [];
    },
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
    },
  },
});

export const {
  addToCart,
  setQuantity,
  removeFromCart,
  removeItems,
  toggleSelect,
  selectAll,
  syncProducts,
  clearCart,
  hydrateCart,
} = cartSlice.actions;

export default cartSlice.reducer;
