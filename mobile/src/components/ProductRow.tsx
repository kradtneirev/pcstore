import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Product } from '../api/types';
import { colors, radius, shadow } from '../constants/theme';
import { discountPercent, formatSold, formatVnd } from '../utils/format';
import ProductImage from './ProductImage';
import { Rating } from './ui';

// Sản phẩm dạng hàng ngang (màn hình Danh mục)
function ProductRow({ product }: { product: Product }) {
  const off = discountPercent(product.price, product.oldPrice);
  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <ProductImage category={product.category} image={product.image} size={88} rounded={radius.md} showBrand={false} style={{ width: 88 }} />
      <View style={styles.info}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatVnd(product.price)}</Text>
          {off > 0 ? <Text style={styles.off}>-{off}%</Text> : null}
        </View>
        <View style={styles.meta}>
          <Rating value={product.rating} />
          <Text style={styles.sold}>{product.stock > 0 ? `Đã bán ${formatSold(product.sold)}` : 'Hết hàng'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(ProductRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 10,
    ...shadow(1),
  },
  info: { flex: 1 },
  brand: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 2, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: colors.accent },
  off: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  sold: { fontSize: 11, color: colors.muted },
});
