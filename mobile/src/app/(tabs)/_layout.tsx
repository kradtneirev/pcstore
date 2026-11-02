import { ColorValue, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { selectCartCount, useAppSelector } from '../../store';
import type { IconName } from '../../constants/categories';

const icon =
  (active: IconName, inactive: IconName) =>
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <MaterialCommunityIcons name={focused ? active : inactive} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const cartCount = useAppSelector(selectCartCount);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { fontWeight: '800', fontSize: 18, color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', headerShown: false, tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Danh mục',
          tabBarIcon: icon('view-grid', 'view-grid-outline'),
          headerRight: () => (
            <Pressable onPress={() => router.push('/search')} hitSlop={10} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarIcon: icon('cart', 'cart-outline'),
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10, fontWeight: '800' },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Đơn hàng', tabBarIcon: icon('receipt-text', 'receipt') }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('account', 'account-outline') }} />
    </Tabs>
  );
}
