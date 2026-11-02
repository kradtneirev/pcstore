import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, errorMessage } from '../../api/client';
import type { Order, OrderStatus } from '../../api/types';
import ProductImage from '../../components/ProductImage';
import { Chip, EmptyState, ErrorState, LoadingView } from '../../components/ui';
import { colors, radius, shadow } from '../../constants/theme';
import { useAppSelector } from '../../store';
import { formatDateTime, formatVnd } from '../../utils/format';
import { orderStatusInfo } from '../../utils/orderStatus';

const FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending_payment', label: 'Chờ thanh toán' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export default function OrdersScreen() {
  const token = useAppSelector((s) => s.auth.token);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const load = useCallback(async () => {
    setError(null);
    try {
      setOrders((await api.orders()).orders);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  // Tải lại mỗi khi mở tab để thấy đơn mới / trạng thái mới
  useFocusEffect(
    useCallback(() => {
      if (token) load();
      else setOrders(null);
    }, [token, load]),
  );

  if (!token) {
    return (
      <EmptyState
        icon="receipt-text"
        title="Bạn chưa đăng nhập"
        message="Đăng nhập để xem lịch sử đơn hàng của bạn."
        action={{ title: 'Đăng nhập', onPress: () => router.push('/login') }}
      />
    );
  }
  if (!orders) return error ? <ErrorState message={error} onRetry={load} /> : <LoadingView />;

  const shown = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <FlatList
      data={shown}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 12, gap: 12, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.id}
              label={f.id === 'all' ? `${f.label} (${orders.length})` : f.label}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>
      }
      ListEmptyComponent={
        <EmptyState
          icon="package-variant"
          title={orders.length === 0 ? 'Chưa có đơn hàng nào' : 'Không có đơn hàng phù hợp'}
          action={orders.length === 0 ? { title: 'Mua sắm ngay', onPress: () => router.navigate('/') } : undefined}
        />
      }
      renderItem={({ item }) => {
        const st = orderStatusInfo(item);
        const first = item.items[0];
        const more = item.items.length - 1;
        return (
          <Pressable
            onPress={() => router.push(`/order/${item.id}`)}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.head}>
              <Text style={styles.id}>#{item.id}</Text>
              <View style={[styles.badge, { backgroundColor: st.bg }]}>
                <MaterialCommunityIcons name={st.icon} size={14} color={st.color} />
                <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <View style={styles.body}>
              <ProductImage category={first.category} image={first.image} size={56} showBrand={false} style={{ width: 56 }} rounded={radius.sm} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {first.name}
                </Text>
                <Text style={styles.meta}>x{first.quantity}</Text>
                {more > 0 ? <Text style={styles.meta}>và {more} sản phẩm khác</Text> : null}
              </View>
            </View>
            <View style={styles.foot}>
              <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
              <Text style={styles.total}>
                Tổng: <Text style={{ color: colors.accent }}>{formatVnd(item.total)}</Text>
              </Text>
            </View>
            {item.status === 'pending_payment' ? (
              <Pressable onPress={() => router.push(`/payment/${item.id}`)} style={styles.payNow}>
                <MaterialCommunityIcons name="wallet" size={16} color={colors.white} />
                <Text style={styles.payNowText}>Thanh toán ngay</Text>
              </Pressable>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, ...shadow(1) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  id: { fontSize: 14, fontWeight: '800', color: colors.text },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { fontSize: 12, fontWeight: '800' },
  body: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: colors.muted },
  total: { fontSize: 14, fontWeight: '800', color: colors.text },
  payNow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    marginTop: 12,
  },
  payNowText: { color: colors.white, fontWeight: '800' },
});
