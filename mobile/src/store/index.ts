import { configureStore, createListenerMiddleware, createSelector, isAnyOf } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, configureApi } from '../api/client';
import cartReducer, {
  addToCart,
  CartItem,
  clearCart,
  hydrateCart,
  maxQuantity,
  removeFromCart,
  removeItems,
  selectAll,
  setQuantity,
  toggleSelect,
} from './cartSlice';
import authReducer, { hydrateAuth, login, logout, register } from './authSlice';
import settingsReducer, { hydrateSettings } from './settingsSlice';

const listener = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    auth: authReducer,
    settings: settingsReducer,
  },
  middleware: (getDefault) => getDefault().prepend(listener.middleware),
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

// ---------- Đồng bộ giỏ hàng với tài khoản trên máy chủ ----------
const toLines = (items: CartItem[]) => items.map(({ productId, quantity, selected }) => ({ productId, quantity, selected }));

// Gộp giỏ hàng lúc chưa đăng nhập vào giỏ hàng của tài khoản.
// Sản phẩm vừa chọn khi chưa đăng nhập (vd: "Mua ngay") được giữ là lựa chọn để thanh toán.
function mergeCarts(account: CartItem[], guest: CartItem[]) {
  const guestHasSelection = guest.some((g) => g.selected);
  const result = account.map((a) => ({ ...a, selected: guestHasSelection ? false : a.selected }));
  for (const g of guest) {
    const same = result.find((a) => a.productId === g.productId);
    if (same) {
      same.quantity = Math.min(same.quantity + g.quantity, maxQuantity(same.stock) || same.quantity);
      same.selected = same.selected || g.selected;
    } else {
      result.unshift({ ...g });
    }
  }
  return result;
}

/**
 * Tải giỏ hàng của tài khoản về máy.
 * mergeGuest = true (vừa đăng nhập): gộp thêm các sản phẩm đã bỏ vào giỏ lúc chưa đăng nhập.
 * mergeGuest = false (mở app khi đang đăng nhập): giỏ hàng trên máy chủ là bản mới nhất.
 */
export async function loadAccountCart(mergeGuest: boolean) {
  const local = store.getState().cart.items;
  try {
    let { items } = await api.getCart();
    if (mergeGuest && local.length > 0) {
      items = (await api.saveCart(toLines(mergeCarts(items, local)))).items;
    } else if (items.length === 0 && local.length > 0) {
      // Máy chủ chưa có giỏ hàng (vd: vừa cập nhật từ bản app cũ): đưa giỏ hàng trên máy lên
      items = (await api.saveCart(toLines(local))).items;
    }
    if (store.getState().auth.token) store.dispatch(hydrateCart(items));
  } catch {
    // Lỗi mạng: giữ giỏ hàng hiện tại, lần thay đổi sau sẽ lưu lại
  }
}

const startListening = listener.startListening.withTypes<RootState, AppDispatch>();

// Mỗi lần giỏ hàng thay đổi thì lưu lên máy chủ (gộp các thay đổi liên tiếp trong 0,7 giây)
startListening({
  matcher: isAnyOf(addToCart, setQuantity, removeFromCart, removeItems, toggleSelect, selectAll, clearCart),
  effect: async (_action, { cancelActiveListeners, delay, getState }) => {
    cancelActiveListeners();
    await delay(700);
    const { auth, cart } = getState();
    if (!auth.token) return; // chưa đăng nhập: chỉ giữ trên máy
    await api.saveCart(toLines(cart.items)).catch(() => {});
  },
});

// Vừa đăng nhập / đăng ký: lấy giỏ hàng của tài khoản và gộp giỏ hàng tạm
startListening({
  matcher: isAnyOf(login.fulfilled, register.fulfilled),
  effect: async () => {
    await loadAccountCart(true);
  },
});

// ---------- Selectors ----------
export const selectCartCount = (s: RootState) => s.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectSelectedItems = createSelector([(s: RootState) => s.cart.items], (items) => items.filter((i) => i.selected));

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
