import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Product } from '../api/types';
import { colors, radius, shadow } from '../constants/theme';
import { discountPercent, formatSold, formatVnd } from '../utils/format';
import ProductImage from './ProductImage';
import { Rating } from './ui';

// Thẻ sản phẩm dạng lưới (trang chủ, tìm kiếm). React.memo để FlatList không vẽ lại thừa.
function ProductCard({ product, width }: { product: Product; width: number }) {
  const off = discountPercent(product.price, product.oldPrice);
  const soldOut = product.stock <= 0;
  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.card, { width, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View>
        <ProductImage category={product.category} brand={product.brand} image={product.image} size={width * 0.82} rounded={radius.md} />
        {off > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{off}%</Text>
          </View>
        ) : null}
        {soldOut ? (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>Hết hàng</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatVnd(product.price)}</Text>
        <Text style={styles.oldPrice}>{product.oldPrice ? formatVnd(product.oldPrice) : ' '}</Text>
        <View style={styles.meta}>
          <Rating value={product.rating} />
          <Text style={styles.sold}>Đã bán {formatSold(product.sold)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 8, ...shadow(1) },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  soldOut: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  body: { paddingHorizontal: 4, paddingTop: 8 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18, minHeight: 36 },
  price: { fontSize: 15, fontWeight: '800', color: colors.accent, marginTop: 6 },
  oldPrice: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  sold: { fontSize: 11, color: colors.muted },
});
