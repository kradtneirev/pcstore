import { configureStore, createSelector } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureApi } from '../api/client';
import cartReducer, { hydrateCart } from './cartSlice';
import authReducer, { hydrateAuth, logout } from './authSlice';
import settingsReducer, { hydrateSettings } from './settingsSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Lớp gọi API luôn đọc địa chỉ máy chủ và token mới nhất từ store
configureApi({
  getBaseUrl: () => store.getState().settings.apiUrl,
  getToken: () => store.getState().auth.token,
  onUnauthorized: () => store.dispatch(logout()),
});

// ---------- Selectors ----------
export const selectCartCount = (s: RootState) => s.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectSelectedItems = createSelector([(s: RootState) => s.cart.items], (items) => items.filter((i) => i.selected));
export const selectSelectedTotal = createSelector([selectSelectedItems], (items) =>
  items.reduce((sum, i) => sum + i.price * i.quantity, 0),
);

// ---------- Lưu/khôi phục bằng AsyncStorage ----------
const KEYS = { cart: 'pcstore:cart', auth: 'pcstore:auth', settings: 'pcstore:settings' } as const;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function restoreState() {
  const [cart, auth, settings] = await Promise.all([
    readJson<RootState['cart']>(KEYS.cart),
    readJson<RootState['auth']>(KEYS.auth),
    readJson<RootState['settings']>(KEYS.settings),
  ]);
  if (Array.isArray(cart?.items)) store.dispatch(hydrateCart(cart.items));
  if (auth?.token) store.dispatch(hydrateAuth({ token: auth.token, user: auth.user ?? null }));
  if (settings) store.dispatch(hydrateSettings(settings));
}

// Chỉ ghi lại phần state nào thực sự thay đổi
export function startPersisting() {
  let prev = store.getState();
  return store.subscribe(() => {
    const next = store.getState();
    (Object.keys(KEYS) as (keyof typeof KEYS)[]).forEach((k) => {
      if (next[k] !== prev[k]) AsyncStorage.setItem(KEYS[k], JSON.stringify(next[k])).catch(() => {});
    });
    prev = next;
  });
}
