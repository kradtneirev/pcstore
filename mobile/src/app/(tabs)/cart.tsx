import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../api/client';
import ProductImage from '../../components/ProductImage';
import { Button, Checkbox, EmptyState, QuantityStepper } from '../../components/ui';
import { colors, radius, shadow } from '../../constants/theme';
import { selectSelectedItems, store, useAppDispatch, useAppSelector } from '../../store';
import {
  CartItem,
  maxQuantity,
  removeFromCart,
  removeItems,
  selectAll,
  setQuantity,
  syncProducts,
  toggleSelect,
} from '../../store/cartSlice';
import { formatVnd } from '../../utils/format';

const FREE_SHIPPING_FROM = 2000000;

export default function CartScreen() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const selected = useAppSelector(selectSelectedItems);
  const isLoggedIn = useAppSelector((s) => !!s.auth.token);
  const allSelected = items.length > 0 && selected.length === items.length;
  // Chỉ tính những sản phẩm được chọn và còn hàng
  const buyable = selected.filter((i) => i.stock > 0);
  const total = buyable.reduce((s, i) => s + i.price * i.quantity, 0);
  const buyableCount = buyable.reduce((n, i) => n + i.quantity, 0);

  // Mỗi lần mở giỏ hàng thì cập nhật giá và tồn kho mới nhất
  // (đọc thẳng từ store để không chạy lại mỗi lần đổi số lượng)
  useFocusEffect(
    useCallback(() => {
      const ids = store.getState().cart.items.map((i) => i.productId);
      if (ids.length === 0) return;
      api
        .products({ ids: ids.join(','), limit: 50 })
        .then((res) => dispatch(syncProducts(res.items)))
        .catch(() => {});
    }, [dispatch]),
  );

  const confirmRemove = (item: CartItem) =>
    Alert.alert('Xóa sản phẩm', `Bỏ "${item.name}" khỏi giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => dispatch(removeFromCart(item.productId)) },
    ]);

  const confirmRemoveSelected = () =>
    Alert.alert('Xóa sản phẩm', `Bỏ ${selected.length} sản phẩm đã chọn khỏi giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => dispatch(removeItems(selected.map((i) => i.productId))) },
    ]);

  const checkout = () => router.push(isLoggedIn ? '/checkout' : '/login?redirect=/checkout');

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Giỏ hàng đang trống"
        message="Hãy chọn những linh kiện bạn yêu thích nhé!"
        action={{ title: 'Mua sắm ngay', onPress: () => router.navigate('/') }}
      />
    );
  }

  const remain = FREE_SHIPPING_FROM - total;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Pressable style={styles.selectAll} onPress={() => dispatch(selectAll(!allSelected))}>
          <Checkbox checked={allSelected} onPress={() => dispatch(selectAll(!allSelected))} />
          <Text style={styles.toolbarText}>Chọn tất cả ({items.length})</Text>
        </Pressable>
        {selected.length > 0 ? (
          <Pressable onPress={confirmRemoveSelected} hitSlop={8}>
            <Text style={styles.removeSelected}>Xóa đã chọn</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item }) => {
          const outOfStock = item.stock <= 0;
          return (
            <View style={[styles.item, outOfStock && { opacity: 0.7 }]}>
              <Checkbox checked={item.selected} onPress={() => dispatch(toggleSelect(item.productId))} />
              <Pressable onPress={() => router.push(`/product/${item.productId}`)}>
                <ProductImage category={item.category} image={item.image} size={76} showBrand={false} style={{ width: 76 }} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={styles.name} numberOfLines={2} onPress={() => router.push(`/product/${item.productId}`)}>
                    {item.name}
                  </Text>
                  <Pressable onPress={() => confirmRemove(item)} hitSlop={10}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={colors.muted} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <Text style={styles.price}>{formatVnd(item.price)}</Text>
                  {item.oldPrice ? <Text style={styles.oldPrice}>{formatVnd(item.oldPrice)}</Text> : null}
                </View>
                <View style={styles.itemBottom}>
                  {outOfStock ? (
                    <Text style={styles.warn}>Sản phẩm đã hết hàng</Text>
                  ) : (
                    <>
                      <QuantityStepper
                        compact
                        value={item.quantity}
                        max={maxQuantity(item.stock)}
                        onChange={(q) => dispatch(setQuantity({ productId: item.productId, quantity: q }))}
                      />
                      {item.stock <= 5 ? <Text style={styles.warn}>Còn {item.stock}</Text> : null}
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.summary}>
        {total > 0 ? (
          <View style={styles.shipHint}>
            <MaterialCommunityIcons name="truck-fast" size={18} color={remain > 0 ? colors.warning : colors.success} />
            <Text style={styles.shipText}>
              {remain > 0 ? `Mua thêm ${formatVnd(remain)} để được miễn phí vận chuyển` : 'Đơn hàng được miễn phí vận chuyển'}
            </Text>
          </View>
        ) : null}
        {total > 0 ? (
          <View style={styles.progress}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (total / FREE_SHIPPING_FROM) * 100)}%` }]} />
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Tạm tính ({buyableCount} sản phẩm)</Text>
            <Text style={styles.total}>{formatVnd(total)}</Text>
          </View>
          <Button title={`Mua hàng (${buyable.length})`} disabled={buyable.length === 0} onPress={checkout} style={{ minWidth: 150 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolbarText: { fontSize: 14, fontWeight: '600', color: colors.text },
  removeSelected: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 10,
    ...shadow(1),
  },
  name: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '800', color: colors.accent },
  oldPrice: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  warn: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  summary: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadow(3),
  },
  shipHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shipText: { fontSize: 12, color: colors.textSoft, fontWeight: '600', flex: 1 },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.bg, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.success },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  totalLabel: { fontSize: 12, color: colors.textSoft },
  total: { fontSize: 20, fontWeight: '900', color: colors.accent },
});
