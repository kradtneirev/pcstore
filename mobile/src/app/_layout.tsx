import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { refreshCart, restoreState, startPersisting, store } from '../store';
import { fetchMe } from '../store/authSlice';
import { ToastProvider } from '../context/ToastContext';
import { colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // Khôi phục giỏ hàng, phiên đăng nhập, địa chỉ máy chủ trước khi hiện giao diện
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    restoreState()
      .catch(() => {})
      .finally(() => {
        unsubscribe = startPersisting();
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
        if (store.getState().auth.token) {
          store.dispatch(fetchMe());
          refreshCart();
        }
      });
    // Quay lại app: giỏ hàng có thể đã sửa trên máy khác
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshCart();
    });
    return () => {
      unsubscribe?.();
      appState.remove();
    };
  }, []);

  if (!ready) return null;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          {/* Nút điều hướng Android (◁ ○ □) màu tối để nổi trên nền sáng của app */}
          <NavigationBar style="dark" />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.white },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '800', fontSize: 17 },
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: 'Đăng nhập', presentation: 'modal' }} />
            <Stack.Screen name="register" options={{ title: 'Tạo tài khoản' }} />
            <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
            <Stack.Screen name="payment/[id]" options={{ title: 'Thanh toán đơn hàng' }} />
            <Stack.Screen name="order/[id]" options={{ title: 'Chi tiết đơn hàng' }} />
            <Stack.Screen name="profile" options={{ title: 'Thông tin cá nhân' }} />            <Stack.Screen name="settings" options={{ title: 'Cài đặt' }} />
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
