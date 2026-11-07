import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, ApiError, errorMessage } from '../api/client';
import type { Coupon, PaymentMethod, Quote, QuoteItem } from '../api/types';
import ProductImage from '../components/ProductImage';
import { Button, Card, Checkbox, Chip, EmptyState, Input, LoadingView, SectionTitle } from '../components/ui';
import { colors, radius } from '../constants/theme';
import type { IconName } from '../constants/categories';
import { useToast } from '../context/ToastContext';
import { selectSelectedItems, useAppDispatch, useAppSelector } from '../store';
import { updateProfile } from '../store/authSlice';
import { removeItems } from '../store/cartSlice';
import { formatCardNumber, formatExpiry, formatVnd } from '../utils/format';

const METHODS: { id: PaymentMethod; title: string; desc: string; icon: IconName; color: string }[] = [
  { id: 'cod', title: 'Thanh toán khi nhận hàng', desc: 'Trả tiền mặt cho nhân viên giao hàng', icon: 'cash', color: '#16A34A' },
  { id: 'bank', title: 'Chuyển khoản ngân hàng', desc: 'Chuyển khoản qua ứng dụng ngân hàng', icon: 'bank', color: '#0F766E' },
  { id: 'momo', title: 'Ví MoMo', desc: 'Thanh toán bằng ví điện tử MoMo', icon: 'wallet', color: '#A50064' },
  { id: 'zalopay', title: 'Ví ZaloPay', desc: 'Thanh toán bằng ví điện tử ZaloPay', icon: 'wallet', color: '#0068FF' },
  { id: 'card', title: 'Thẻ tín dụng / ghi nợ', desc: 'Visa, Mastercard, JCB, Napas', icon: 'credit-card-outline', color: '#4F46E5' },
];

type ShipField = 'name' | 'phone' | 'address';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const selected = useAppSelector(selectSelectedItems);
  // Mua ngay: thanh toán riêng 1 sản phẩm theo tham số, không dùng giỏ hàng
  const { buyNow, qty } = useLocalSearchParams<{ buyNow?: string; qty?: string }>();
  const buyQty = Math.max(1, Math.floor(Number(qty)) || 1);
  const lines = useMemo(
    () =>
      buyNow
        ? [{ productId: buyNow, quantity: buyQty }]
        : selected.filter((i) => i.stock > 0).map((i) => ({ productId: i.productId, quantity: i.quantity })),
    [buyNow, buyQty, selected],
  );
  const linesKey = JSON.stringify(lines);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [note, setNote] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [shipErrors, setShipErrors] = useState<Partial<Record<ShipField, string>>>({});

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [method, setMethod] = useState<PaymentMethod>('cod');
  const [card, setCard] = useState({ number: '', holder: '', expiry: '', cvv: '' });
  const [cardError, setCardError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false); // đã đặt xong, đang chuyển trang

  // Phải đăng nhập mới được thanh toán
  useEffect(() => {
    if (!token) {
      const url = buyNow ? `/checkout?buyNow=${buyNow}&qty=${buyQty}` : '/checkout';
      router.replace(`/login?redirect=${encodeURIComponent(url)}`);
    }
  }, [token, buyNow, buyQty]);

  // Điền sẵn thông tin khi tải xong tài khoản
  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.name);
    setPhone((v) => v || user.phone);
    setAddress((v) => v || user.address);
  }, [user]);

  useEffect(() => {
    api.coupons().then(setCoupons).catch(() => {});
  }, []);

  // Sản phẩm đổi (vd: giỏ vừa sửa trên máy khác) thì bỏ báo giá cũ, khóa nút Đặt hàng tới khi có báo giá mới
  useEffect(() => {
    setQuote(null);
  }, [linesKey]);

  // Tính tiền trên máy chủ mỗi khi sản phẩm hoặc mã giảm giá thay đổi
  useEffect(() => {
    const items = JSON.parse(linesKey);
    if (items.length === 0) return;
    let active = true;
    setQuoteError(null);
    api
      .quote(items, coupon ?? undefined)
      .then((q) => active && setQuote(q))
      .catch((e) => {
        if (!active) return;
        if (coupon && e instanceof ApiError && e.status === 400) {
          // Mã không còn hợp lệ (vd: giảm số lượng dưới mức tối thiểu) thì bỏ mã
          toast(e.message, 'error');
          setCoupon(null);
        } else {
          setQuoteError(errorMessage(e));
        }
      });
    return () => {
      active = false;
    };
  }, [linesKey, coupon, toast]);

  const applyCoupon = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setApplying(true);
    setCouponError(null);
    try {
      const q = await api.quote(lines, c);
      setQuote(q);
      setCoupon(c);
      setCouponInput('');
      toast(`Đã áp dụng mã ${c}`, 'success');
    } catch (e) {
      setCouponError(errorMessage(e));
    } finally {
      setApplying(false);
    }
  };

  const placeOrder = async () => {
    const e: Partial<Record<ShipField, string>> = {};
    if (name.trim().length < 2) e.name = 'Vui lòng nhập họ tên người nhận';
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';
    if (address.trim().length < 10) e.address = 'Vui lòng nhập địa chỉ đầy đủ (số nhà, đường, phường, quận, tỉnh)';
    setShipErrors(e);
    if (Object.keys(e).length) {
      toast('Vui lòng kiểm tra lại thông tin nhận hàng', 'error');
      return;
    }
    if (method === 'card') {
      const digits = card.number.replace(/\D/g, '');
      const err =
        digits.length < 12
          ? 'Vui lòng nhập số thẻ'
          : card.holder.trim().length < 3
            ? 'Vui lòng nhập tên chủ thẻ'
            : !/^\d{2}\/\d{2}$/.test(card.expiry)
              ? 'Ngày hết hạn có dạng MM/YY'
              : !/^\d{3,4}$/.test(card.cvv)
                ? 'CVV gồm 3 hoặc 4 chữ số'
                : null;
      setCardError(err);
      if (err) return;
    }

    setPlacing(true);
    try {
      const { order } = await api.createOrder({
        items: lines,
        couponCode: coupon ?? undefined,
        shipping: { name: name.trim(), phone: phone.replace(/\s/g, ''), address: address.trim(), note: note.trim() },
        paymentMethod: method,
        card: method === 'card' ? card : undefined,
        keepCart: !!buyNow,
      });
      setPlaced(true);
      if (!buyNow) dispatch(removeItems(order.items.map((i) => i.productId)));
      if (saveAddress && user && address.trim() !== user.address) {
        dispatch(updateProfile({ address: address.trim() }));
      }
      if (order.status === 'pending_payment') router.replace(`/payment/${order.id}`);
      else router.replace(`/order/${order.id}?justPlaced=1`);
    } catch (err) {
      if (err instanceof ApiError && err.problems?.length) {
        // Hết hàng / thay đổi tồn kho: tính lại để hiển thị cảnh báo
        api.quote(lines, coupon ?? undefined).then(setQuote).catch(() => {});
      }
      if (method === 'card' && err instanceof ApiError && (err.status === 402 || err.status === 400)) {
        setCardError(err.message);
      }
      toast(errorMessage(err), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (placed) return <LoadingView text="Đang xử lý đơn hàng..." />;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Chưa chọn sản phẩm"
        message="Hãy chọn sản phẩm trong giỏ hàng để thanh toán."
        action={{ title: 'Quay lại giỏ hàng', onPress: () => router.back() }}
      />
    );
  }

  const hasProblems = !!quote?.problems.length;
  const shownItems: Pick<QuoteItem, 'productId' | 'name' | 'category' | 'image' | 'price' | 'quantity'>[] = buyNow
    ? (quote?.items ?? [])
    : selected.filter((i) => i.stock > 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Card>
          <SectionTitle title="Thông tin nhận hàng" icon="map-marker" />
          <Input label="Họ tên người nhận" icon="account-outline" value={name} onChangeText={setName} error={shipErrors.name} />
          <Input
            label="Số điện thoại"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
            error={shipErrors.phone}
          />
          <Input
            label="Địa chỉ giao hàng"
            icon="map-marker"
            value={address}
            onChangeText={setAddress}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            multiline
            error={shipErrors.address}
          />
          <Input label="Ghi chú (không bắt buộc)" icon="information-outline" value={note} onChangeText={setNote} placeholder="vd: Giao giờ hành chính" />
          <Pressable style={styles.checkRow} onPress={() => setSaveAddress((v) => !v)}>
            <Checkbox checked={saveAddress} onPress={() => setSaveAddress((v) => !v)} />
            <Text style={styles.checkText}>Lưu địa chỉ cho lần mua sau</Text>
          </Pressable>
        </Card>

        <Card>
          <SectionTitle title={`Sản phẩm (${lines.length})`} icon="package-variant" />
          {buyNow && !quote && !quoteError ? <ActivityIndicator color={colors.primary} /> : null}
          {shownItems.map((i) => {
            const q = quote?.items.find((x) => x.productId === i.productId);
            const problem = quote?.problems.find((p) => p.productId === i.productId);
            return (
              <View key={i.productId} style={styles.line}>
                <ProductImage category={i.category} image={q?.image ?? i.image} size={54} showBrand={false} style={{ width: 54 }} rounded={radius.sm} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {i.name}
                  </Text>
                  <Text style={styles.lineMeta}>
                    {formatVnd(q?.price ?? i.price)} × {i.quantity}
                  </Text>
                  {problem ? <Text style={styles.problem}>{problem.message}</Text> : null}
                </View>
                <Text style={styles.lineTotal}>{formatVnd((q?.price ?? i.price) * i.quantity)}</Text>
              </View>
            );
          })}
          {/* Mua ngay: sản phẩm không còn kinh doanh thì không có trong báo giá, chỉ hiện lý do */}
          {buyNow && quote?.items.length === 0
            ? quote.problems.map((p) => (
                <Text key={p.productId} style={styles.problem}>
                  {p.message}
                </Text>
              ))
            : null}
        </Card>

        <Card>
          <SectionTitle title="Mã giảm giá" icon="ticket-percent" />
          {coupon ? (
            <View style={styles.applied}>
              <MaterialCommunityIcons name="ticket-percent" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appliedCode}>{coupon}</Text>
                <Text style={styles.appliedDesc}>{quote?.coupon?.description}</Text>
              </View>
              <Pressable onPress={() => setCoupon(null)} hitSlop={8}>
                <Text style={styles.removeText}>Bỏ mã</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Input
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  value={couponInput}
                  onChangeText={(t) => {
                    setCouponInput(t);
                    setCouponError(null);
                  }}
                  placeholder="Nhập mã giảm giá"
                  autoCapitalize="characters"
                  error={couponError}
                />
                <Button title="Áp dụng" variant="ghost" onPress={() => applyCoupon(couponInput)} loading={applying} style={{ width: 100 }} />
              </View>
              {coupons.length > 0 ? (
                <View style={styles.couponChips}>
                  {coupons.map((c) => (
                    <Chip key={c.code} label={c.code} icon="tag" onPress={() => applyCoupon(c.code)} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <SectionTitle title="Phương thức thanh toán" icon="wallet" />
          {METHODS.map((m) => {
            const active = method === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  setMethod(m.id);
                  setCardError(null);
                }}
                style={[styles.method, active && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
              >
                <View style={[styles.methodIcon, { backgroundColor: m.color }]}>
                  <MaterialCommunityIcons name={m.icon} size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodTitle}>{m.title}</Text>
                  <Text style={styles.methodDesc}>{m.desc}</Text>
                </View>
                <View style={[styles.radio, active && { borderColor: colors.primary }]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}

          {method === 'card' ? (
            <View style={styles.cardForm}>
              <Input
                label="Số thẻ"
                icon="credit-card-outline"
                value={card.number}
                onChangeText={(t) => setCard((c) => ({ ...c, number: formatCardNumber(t) }))}
                placeholder="1234 5678 9012 3456"
                keyboardType="number-pad"
                maxLength={23}
              />
              <Input
                label="Tên chủ thẻ"
                icon="account-outline"
                value={card.holder}
                onChangeText={(t) => setCard((c) => ({ ...c, holder: t.toUpperCase() }))}
                placeholder="NGUYEN VAN A"
                autoCapitalize="characters"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Input
                  containerStyle={{ flex: 1 }}
                  label="Hết hạn"
                  icon="calendar"
                  value={card.expiry}
                  onChangeText={(t) => setCard((c) => ({ ...c, expiry: formatExpiry(t) }))}
                  placeholder="MM/YY"
                  keyboardType="number-pad"
                  maxLength={5}
                />
                <Input
                  containerStyle={{ flex: 1 }}
                  label="CVV"
                  icon="lock"
                  value={card.cvv}
                  onChangeText={(t) => setCard((c) => ({ ...c, cvv: t.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
              </View>
              {cardError ? <Text style={styles.problem}>{cardError}</Text> : null}
              <View style={styles.secure}>
                <MaterialCommunityIcons name="shield-lock" size={16} color={colors.success} />
                <Text style={styles.secureText}>
                  Môi trường demo: dùng thẻ 4242 4242 4242 4242, hạn bất kỳ trong tương lai, CVV bất kỳ. Số thẻ không được lưu lại.
                </Text>
              </View>
            </View>
          ) : method !== 'cod' ? (
            <Text style={styles.methodHint}>Sau khi đặt hàng, bạn sẽ thấy thông tin thanh toán. Đơn được giữ trong 15 phút.</Text>
          ) : null}
        </Card>

        <Card>
          <SectionTitle title="Chi tiết thanh toán" icon="receipt-text" />
          {!quote && !quoteError ? (
            <ActivityIndicator color={colors.primary} />
          ) : quoteError ? (
            <Text style={styles.problem}>{quoteError}</Text>
          ) : quote ? (
            <>
              <Row label="Tạm tính" value={formatVnd(quote.subtotal)} />
              {quote.discount > 0 ? <Row label="Giảm giá" value={`-${formatVnd(quote.discount)}`} color={colors.success} /> : null}
              <Row label="Phí vận chuyển" value={quote.shippingFee === 0 ? 'Miễn phí' : formatVnd(quote.shippingFee)} />
              <View style={styles.divider} />
              <Row label="Tổng thanh toán" value={formatVnd(quote.total)} bold />
            </>
          ) : null}
        </Card>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomLabel}>Tổng thanh toán</Text>
          <Text style={styles.bottomTotal}>{quote ? formatVnd(quote.total) : '...'}</Text>
        </View>
        <Button
          title="Đặt hàng"
          icon="check-circle"
          variant="accent"
          onPress={placeOrder}
          loading={placing}
          disabled={!quote || hasProblems || !!quoteError}
          style={{ minWidth: 160 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: colors.text, fontWeight: '800', fontSize: 15 }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { color: colors.accent, fontSize: 18, fontWeight: '900' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontSize: 13, color: colors.textSoft, fontWeight: '600' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lineName: { fontSize: 13, fontWeight: '600', color: colors.text },
  lineMeta: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '800', color: colors.text },
  problem: { color: colors.danger, fontSize: 12, fontWeight: '600', marginTop: 4 },
  applied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  appliedCode: { fontWeight: '900', color: colors.success, fontSize: 15 },
  appliedDesc: { fontSize: 12, color: colors.textSoft },
  removeText: { color: colors.danger, fontWeight: '700' },
  couponChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  methodDesc: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  cardForm: { marginTop: 6 },
  secure: { flexDirection: 'row', gap: 6, backgroundColor: colors.successSoft, padding: 10, borderRadius: radius.sm, marginTop: 4 },
  secureText: { flex: 1, fontSize: 12, color: colors.textSoft, lineHeight: 17 },
  methodHint: { fontSize: 12, color: colors.textSoft, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowLabel: { fontSize: 14, color: colors.textSoft },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomLabel: { fontSize: 12, color: colors.textSoft },
  bottomTotal: { fontSize: 20, fontWeight: '900', color: colors.accent },
});
