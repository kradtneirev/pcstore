import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, errorMessage } from '../../api/client';
import type { Category, Product } from '../../api/types';
import ProductImage from '../../components/ProductImage';
import ProductCard from '../../components/ProductCard';
import CartButton from '../../components/CartButton';
import { Button, ErrorState, LoadingView, QuantityStepper, Rating, SectionTitle } from '../../components/ui';
import { colors, radius, shadow } from '../../constants/theme';
import type { IconName } from '../../constants/categories';
import { useToast } from '../../context/ToastContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { addToCart, maxQuantity, selectAll, syncProducts, toggleSelect } from '../../store/cartSlice';
import { discountPercent, formatSold, formatVnd, formatWarranty } from '../../utils/format';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const isLoggedIn = useAppSelector((s) => !!s.auth.token);
  const inCart = useAppSelector((s) => s.cart.items.find((i) => i.productId === id)?.quantity ?? 0);
  const [data, setData] = useState<{ product: Product; category: Category; related: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.product(id);
      setData(res);
      // Giá/tồn kho trong giỏ luôn theo dữ liệu mới nhất
      dispatch(syncProducts([res.product]));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, dispatch]);

  useEffect(() => {
    setData(null);
    setQty(1);
    load();
  }, [load]);

  const topBar = (
    <View style={[styles.topBar, { top: insets.top + 6 }]}>
      <Pressable onPress={() => router.back()} style={styles.roundBtn} hitSlop={6}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
      </Pressable>
      <CartButton background={colors.white} />
    </View>
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 56 }}>
        {topBar}
        {error ? <ErrorState message={error} onRetry={load} /> : <LoadingView />}
      </View>
    );
  }

  const { product, category, related } = data;
  const off = discountPercent(product.price, product.oldPrice);
  const limit = maxQuantity(product.stock);
  const available = Math.max(0, limit - inCart); // còn được thêm bao nhiêu vào giỏ
  const soldOut = product.stock <= 0;
  const safeQty = Math.min(qty, Math.max(1, available));

  const handleAdd = () => {
    if (available <= 0) {
      toast(`Giỏ hàng đã có tối đa ${limit} sản phẩm này`, 'info');
      return;
    }
    dispatch(addToCart({ product, quantity: safeQty }));
    toast(`Đã thêm ${safeQty} sản phẩm vào giỏ hàng`, 'success');
    setQty(1);
  };

  // Mua ngay: chỉ chọn sản phẩm này trong giỏ rồi chuyển sang thanh toán
  const handleBuyNow = () => {
    dispatch(selectAll(false));
    if (available > 0) dispatch(addToCart({ product, quantity: safeQty }));
    else dispatch(toggleSelect(product.id));
    router.push(isLoggedIn ? '/checkout' : '/login?redirect=/checkout');
  };

  const perks: { icon: IconName; text: string }[] = [
    { icon: 'shield-check', text: `Bảo hành ${formatWarranty(product.warrantyMonths)}` },
    { icon: 'truck-fast', text: 'Miễn phí giao từ 2 triệu' },
    { icon: 'refresh', text: 'Đổi trả trong 7 ngày' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <ProductImage
          category={product.category}
          brand={product.brand}
          image={product.image}
          size={300 + insets.top}
          rounded={0}
          iconSize={130}
          style={product.image ? { paddingTop: insets.top, borderWidth: 0 } : undefined}
        />

        <View style={styles.infoCard}>
          <View style={styles.tags}>
            <Text style={styles.tag}>{category?.fullName ?? product.category}</Text>
            <Text style={[styles.tag, { backgroundColor: colors.successSoft, color: colors.success }]}>Chính hãng</Text>
          </View>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <Rating value={product.rating} count={`(${product.reviews} đánh giá)`} size={13} />
            <Text style={styles.dotSep}>•</Text>
            <Text style={styles.muted}>Đã bán {formatSold(product.sold)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(product.price)}</Text>
            {product.oldPrice ? <Text style={styles.oldPrice}>{formatVnd(product.oldPrice)}</Text> : null}
            {off > 0 ? (
              <View style={styles.offBadge}>
                <Text style={styles.offText}>-{off}%</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.stockRow}>
            <MaterialCommunityIcons
              name={soldOut ? 'close-circle' : 'check-circle'}
              size={16}
              color={soldOut ? colors.danger : colors.success}
            />
            <Text style={[styles.stockText, { color: soldOut ? colors.danger : colors.success }]}>
              {soldOut ? 'Tạm hết hàng' : product.stock <= 5 ? `Chỉ còn ${product.stock} sản phẩm` : `Còn hàng (${product.stock})`}
            </Text>
          </View>

          {!soldOut ? (
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Số lượng</Text>
              <QuantityStepper value={safeQty} max={Math.max(1, available)} onChange={setQty} />
            </View>
          ) : null}
          {inCart > 0 ? <Text style={styles.inCart}>Đã có {inCart} sản phẩm này trong giỏ hàng</Text> : null}
        </View>

        <View style={styles.perks}>
          {perks.map((p) => (
            <View key={p.text} style={styles.perk}>
              <MaterialCommunityIcons name={p.icon} size={22} color={colors.primary} />
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.block}>
          <SectionTitle title="Mô tả sản phẩm" icon="information-outline" />
          <Text style={styles.desc}>{product.description}</Text>
        </View>

        <View style={styles.block}>
          <SectionTitle title="Thông số kỹ thuật" icon="tune-variant" />
          {[{ label: 'Thương hiệu', value: product.brand }, ...product.specs].map((s, i) => (
            <View key={s.label} style={[styles.specRow, i % 2 === 0 && { backgroundColor: colors.bg }]}>
              <Text style={styles.specLabel}>{s.label}</Text>
              <Text style={styles.specValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {related.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionTitle title="Sản phẩm tương tự" icon="star" />
            </View>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
              renderItem={({ item }) => <ProductCard product={item} width={150} />}
            />
          </View>
        ) : null}
      </ScrollView>

      {topBar}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        {soldOut ? (
          <Button title="Sản phẩm tạm hết hàng" disabled style={{ flex: 1 }} />
        ) : (
          <>
            <Button title="Thêm vào giỏ" icon="cart-plus" variant="outline" onPress={handleAdd} style={{ flex: 1 }} />
            <Button title="Mua ngay" variant="accent" onPress={handleBuyNow} style={{ flex: 1 }} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(2),
  },
  infoCard: {
    backgroundColor: colors.white,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 27 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  dotSep: { color: colors.muted },
  muted: { color: colors.textSoft, fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  price: { fontSize: 26, fontWeight: '900', color: colors.accent },
  oldPrice: { fontSize: 14, color: colors.muted, textDecorationLine: 'line-through' },
  offBadge: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  offText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  stockText: { fontSize: 13, fontWeight: '700' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qtyLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  inCart: { marginTop: 8, fontSize: 12, color: colors.primary, fontWeight: '600' },
  perks: { flexDirection: 'row', backgroundColor: colors.white, marginTop: 10, paddingVertical: 14 },
  perk: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  perkText: { fontSize: 11, color: colors.textSoft, textAlign: 'center', fontWeight: '600' },
  block: { backgroundColor: colors.white, marginTop: 10, padding: 16 },
  desc: { fontSize: 14, color: colors.textSoft, lineHeight: 22 },
  specRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.sm },
  specLabel: { width: '42%', fontSize: 13, color: colors.textSoft },
  specValue: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
