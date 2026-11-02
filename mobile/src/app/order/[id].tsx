import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../../api/client';
import type { Order } from '../../api/types';
import ProductImage from '../../components/ProductImage';
import { Button, Card, ErrorState, LoadingView } from '../../components/ui';
import { colors, radius } from '../../constants/theme';
import { useToast } from '../../context/ToastContext';
import { useAppDispatch } from '../../store';
import { addToCart } from '../../store/cartSlice';
import { formatDateTime, formatVnd } from '../../utils/format';
import { orderStatusInfo, paymentStatusLabel } from '../../utils/orderStatus';

export default function OrderDetailScreen() {
  const { id, justPlaced } = useLocalSearchParams<{ id: string; justPlaced?: string }>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'cancel' | 'rebuy' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOrder((await api.order(id)).order);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!order) return error ? <ErrorState message={error} onRetry={load} /> : <LoadingView />;

  const st = orderStatusInfo(order);
  const canCancel = order.status === 'pending_payment' || order.status === 'confirmed';

  const cancel = () =>
    Alert.alert(
      'Hủy đơn hàng',
      order.payment.status === 'paid' ? 'Số tiền đã thanh toán sẽ được hoàn lại. Bạn chắc chắn muốn hủy?' : 'Bạn chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            setBusy('cancel');
            try {
              setOrder((await api.cancelOrder(order.id)).order);
              toast('Đã hủy đơn hàng', 'success');
            } catch (e) {
              toast(errorMessage(e), 'error');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  // Mua lại: lấy thông tin mới nhất của sản phẩm rồi thêm vào giỏ
  const rebuy = async () => {
    setBusy('rebuy');
    try {
      const res = await api.products({ ids: order.items.map((i) => i.productId).join(','), limit: 50 });
      let added = 0;
      for (const it of order.items) {
        const p = res.items.find((x) => x.id === it.productId);
        if (p && p.stock > 0) {
          dispatch(addToCart({ product: p, quantity: it.quantity }));
          added++;
        }
      }
      if (added === 0) toast('Các sản phẩm trong đơn đều đã hết hàng', 'error');
      else {
        toast(`Đã thêm ${added} sản phẩm vào giỏ hàng`, 'success');
        router.navigate('/cart');
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
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
      >
        {justPlaced && order.status !== 'cancelled' ? (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check" size={40} color={colors.white} />
            </View>
            <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
            <Text style={styles.successText}>
              Cảm ơn bạn đã mua sắm tại PC Store. Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất.
            </Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
              <MaterialCommunityIcons name={st.icon} size={16} color={st.color} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
          </View>
          <Pressable
            style={styles.idRow}
            onPress={async () => {
              await Clipboard.setStringAsync(order.id);
              toast('Đã sao chép mã đơn hàng', 'success');
            }}
          >
            <Text style={styles.idLabel}>Mã đơn hàng</Text>
            <Text style={styles.idValue}>{order.id}</Text>
            <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
          </Pressable>
          {order.cancelReason ? <Text style={styles.cancelReason}>Lý do hủy: {order.cancelReason}</Text> : null}

          <View style={{ marginTop: 12 }}>
            {[...order.timeline].reverse().map((t, i) => (
              <View key={`${t.status}-${t.at}-${i}`} style={styles.tl}>
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.tlDot, i === 0 && { backgroundColor: st.color }]} />
                  {i < order.timeline.length - 1 ? <View style={styles.tlLine} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={[styles.tlLabel, i === 0 && { color: colors.text, fontWeight: '800' }]}>{t.label}</Text>
                  <Text style={styles.tlTime}>{formatDateTime(t.at)}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Địa chỉ nhận hàng</Text>
          <Text style={styles.shipName}>
            {order.shipping.name} • {order.shipping.phone}
          </Text>
          <Text style={styles.shipAddr}>{order.shipping.address}</Text>
          {order.shipping.note ? <Text style={styles.shipNote}>Ghi chú: {order.shipping.note}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Sản phẩm</Text>
          {order.items.map((it) => (
            <Pressable key={it.productId} style={styles.item} onPress={() => router.push(`/product/${it.productId}`)}>
              <ProductImage category={it.category} image={it.image} size={56} showBrand={false} style={{ width: 56 }} rounded={radius.sm} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {it.name}
                </Text>
                <Text style={styles.itemMeta}>
                  {formatVnd(it.price)} × {it.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatVnd(it.lineTotal)}</Text>
            </Pressable>
          ))}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Thanh toán</Text>
          <Line label="Phương thức" value={order.payment.label} />
          <Line label="Trạng thái" value={paymentStatusLabel(order.payment.status)} />
          {order.payment.cardLast4 ? <Line label="Thẻ" value={`${order.payment.cardBrand} •••• ${order.payment.cardLast4}`} /> : null}
          {order.payment.paidAt ? <Line label="Thanh toán lúc" value={formatDateTime(order.payment.paidAt)} /> : null}
          <View style={styles.divider} />
          <Line label="Tạm tính" value={formatVnd(order.subtotal)} />
          {order.discount > 0 ? <Line label={`Giảm giá${order.coupon ? ` (${order.coupon.code})` : ''}`} value={`-${formatVnd(order.discount)}`} /> : null}
          <Line label="Phí vận chuyển" value={order.shippingFee === 0 ? 'Miễn phí' : formatVnd(order.shippingFee)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVnd(order.total)}</Text>
          </View>
        </Card>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        {order.status === 'pending_payment' ? (
          <>
            <Button title="Hủy đơn" variant="outline" onPress={cancel} loading={busy === 'cancel'} style={{ flex: 1 }} />
            <Button title="Thanh toán ngay" icon="wallet" onPress={() => router.push(`/payment/${order.id}`)} style={{ flex: 1.4 }} />
          </>
        ) : (
          <>
            {canCancel ? (
              <Button title="Hủy đơn" variant="outline" onPress={cancel} loading={busy === 'cancel'} style={{ flex: 1 }} />
            ) : null}
            {justPlaced ? (
              <Button title="Tiếp tục mua sắm" onPress={() => router.navigate('/')} style={{ flex: 1.4 }} />
            ) : (
              <Button title="Mua lại" icon="cart-plus" onPress={rebuy} loading={busy === 'rebuy'} style={{ flex: 1.4 }} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  success: { alignItems: 'center', paddingVertical: 12 },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.successSoft,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginTop: 12 },
  successText: { fontSize: 14, color: colors.textSoft, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  statusText: { fontWeight: '800', fontSize: 13 },
  date: { fontSize: 12, color: colors.muted },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  idLabel: { fontSize: 13, color: colors.textSoft },
  idValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  cancelReason: { marginTop: 6, color: colors.danger, fontSize: 13, fontWeight: '600' },
  tl: { flexDirection: 'row', gap: 12 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border, marginTop: 4 },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2 },
  tlLabel: { fontSize: 14, color: colors.textSoft, fontWeight: '600' },
  tlTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  shipName: { fontSize: 14, fontWeight: '700', color: colors.text },
  shipAddr: { fontSize: 14, color: colors.textSoft, marginTop: 4, lineHeight: 20 },
  shipNote: { fontSize: 13, color: colors.muted, marginTop: 4, fontStyle: 'italic' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  itemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: colors.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  lineLabel: { fontSize: 14, color: colors.textSoft },
  lineValue: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '900', color: colors.accent },
  bottom: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
