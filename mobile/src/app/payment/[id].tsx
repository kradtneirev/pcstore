import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api, errorMessage } from '../../api/client';
import type { Order } from '../../api/types';
import { Button, Card, EmptyState, ErrorState, LoadingView } from '../../components/ui';
import { colors, radius } from '../../constants/theme';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_BRAND } from '../../utils/orderStatus';
import { formatVnd } from '../../utils/format';

function useCountdown(expiresAt?: string) {
  const calc = () => (expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const timer = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);
  return left;
}

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

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

  const left = useCountdown(order?.payment.expiresAt);

  // Hết giờ: tải lại để lấy trạng thái đơn (máy chủ tự hủy đơn quá hạn)
  const expiresAt = order?.payment.expiresAt;
  useEffect(() => {
    const expired = !!expiresAt && new Date(expiresAt).getTime() <= Date.now();
    if (order?.status === 'pending_payment' && left === 0 && expired) load();
  }, [left, order?.status, expiresAt, load]);

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    toast(`Đã sao chép ${label}`, 'success');
  };

  const confirmPaid = async () => {
    setPaying(true);
    try {
      await api.payOrder(id);
      toast('Thanh toán thành công!', 'success');
      router.replace(`/order/${id}?justPlaced=1`);
    } catch (e) {
      toast(errorMessage(e), 'error');
      load();
    } finally {
      setPaying(false);
    }
  };

  if (!order) return error ? <ErrorState message={error} onRetry={load} /> : <LoadingView />;

  if (order.status !== 'pending_payment') {
    const paid = order.payment.status === 'paid';
    return (
      <EmptyState
        icon={paid ? 'check-circle' : 'clock-outline'}
        title={paid ? 'Đơn hàng đã được thanh toán' : 'Đơn hàng đã hết hạn thanh toán'}
        message={paid ? undefined : 'Đơn hàng đã tự động hủy. Bạn có thể đặt lại từ giỏ hàng.'}
        action={{ title: 'Xem đơn hàng', onPress: () => router.replace(`/order/${order.id}`) }}
      />
    );
  }

  const brand = PAYMENT_BRAND[order.payment.method] ?? PAYMENT_BRAND.bank;
  const r = order.payment.receiver;
  const content = order.payment.transferContent ?? order.id;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const rows: { label: string; value: string; copyable?: boolean }[] =
    order.payment.method === 'bank'
      ? [
          { label: 'Ngân hàng', value: r?.bankName ?? '' },
          { label: 'Số tài khoản', value: r?.accountNumber ?? '', copyable: true },
          { label: 'Chủ tài khoản', value: r?.accountName ?? '' },
        ]
      : [
          { label: 'Ví điện tử', value: r?.walletName ?? '' },
          { label: 'Số điện thoại', value: r?.phone ?? '', copyable: true },
          { label: 'Tên tài khoản', value: r?.accountName ?? '' },
        ];
  rows.push({ label: 'Số tiền', value: String(order.total), copyable: true }, { label: 'Nội dung', value: content, copyable: true });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <LinearGradient colors={brand.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <MaterialCommunityIcons name={brand.icon} size={22} color={colors.white} />
            <Text style={styles.heroBrand}>{brand.name}</Text>
          </View>
          <Text style={styles.heroLabel}>Số tiền cần thanh toán</Text>
          <Text style={styles.heroAmount}>{formatVnd(order.total)}</Text>
          <View style={styles.timer}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.white} />
            <Text style={styles.timerText}>
              Thanh toán trong {mm}:{ss}
            </Text>
          </View>
        </LinearGradient>

        <Card>
          <Text style={styles.cardTitle}>Thông tin chuyển tiền</Text>
          {rows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={[styles.infoValue, row.label === 'Nội dung' && { color: colors.primary }]} selectable>
                {row.label === 'Số tiền' ? formatVnd(order.total) : row.value}
              </Text>
              {row.copyable ? (
                <Pressable onPress={() => copy(row.label.toLowerCase(), row.value)} hitSlop={8} style={styles.copyBtn}>
                  <MaterialCommunityIcons name="content-copy" size={16} color={colors.primary} />
                </Pressable>
              ) : (
                <View style={{ width: 30 }} />
              )}
            </View>
          ))}
          <View style={styles.warn}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.warnText}>
              Vui lòng ghi đúng nội dung <Text style={{ fontWeight: '800' }}>{content}</Text> để đơn hàng được xác nhận tự động.
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Hướng dẫn</Text>
          {(order.payment.method === 'bank'
            ? ['Mở ứng dụng ngân hàng của bạn', 'Chọn chuyển khoản và nhập thông tin ở trên', 'Kiểm tra số tiền, nội dung rồi xác nhận']
            : [`Mở ứng dụng ${brand.name.replace('Ví ', '')}`, 'Chọn chuyển tiền đến số điện thoại ở trên', 'Nhập đúng số tiền, nội dung rồi xác nhận']
          ).map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.demo}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
          <Text style={styles.demoText}>
            Môi trường demo: không cần chuyển tiền thật. Bấm "Tôi đã thanh toán" để giả lập ngân hàng/ví báo đã nhận tiền.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <Button title="Thanh toán sau" variant="outline" onPress={() => router.replace(`/order/${order.id}`)} style={{ flex: 1 }} />
        <Button title="Tôi đã thanh toán" icon="check-circle" onPress={confirmPaid} loading={paying} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBrand: { color: colors.white, fontWeight: '800', fontSize: 15 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', marginTop: 18, fontSize: 13 },
  heroAmount: { color: colors.white, fontSize: 32, fontWeight: '900', marginTop: 2 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  timerText: { color: colors.white, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  infoLabel: { width: 110, fontSize: 13, color: colors.textSoft },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { flexDirection: 'row', gap: 8, backgroundColor: colors.warningSoft, padding: 12, borderRadius: radius.md, marginTop: 12 },
  warnText: { flex: 1, fontSize: 12, color: colors.textSoft, lineHeight: 18 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  stepText: { flex: 1, fontSize: 14, color: colors.text },
  demo: { flexDirection: 'row', gap: 8, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md },
  demoText: { flex: 1, fontSize: 12, color: colors.primary, lineHeight: 18 },
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
