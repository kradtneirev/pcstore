import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import ProductCard from '../components/ProductCard';
import CartButton from '../components/CartButton';
import { Chip, EmptyState, ErrorState, LoadingView } from '../components/ui';
import { CATEGORY_STYLE } from '../constants/categories';
import { colors, radius } from '../constants/theme';
import { useProductList } from '../hooks/useProductList';

const SORTS = [
  { id: 'popular', label: 'Phổ biến' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price_asc', label: 'Giá thấp' },
  { id: 'price_desc', label: 'Giá cao' },
  { id: 'rating', label: 'Đánh giá' },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [text, setText] = useState(params.q ?? '');
  const [query, setQuery] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.category ?? '');
  const [sort, setSort] = useState(params.sort ?? 'popular');
  const [brand, setBrand] = useState('');
  const [inStock, setInStock] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);

  // Debounce: chỉ tìm khi người dùng ngừng gõ 400ms
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);

  // Danh sách hãng thay đổi theo danh mục đang chọn
  useEffect(() => {
    let active = true;
    setBrand('');
    api
      .brands(category || undefined)
      .then((b) => active && setBrands(b))
      .catch(() => active && setBrands([]));
    return () => {
      active = false;
    };
  }, [category]);

  const filters = useMemo(
    () => ({ q: query || undefined, category: category || undefined, brand: brand || undefined, sort, inStock }),
    [query, category, brand, sort, inStock],
  );
  const list = useProductList(filters);
  const cardWidth = (width - 32 - 12) / 2;

  const header = (
    <View style={{ paddingTop: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Tất cả" active={!category} onPress={() => setCategory('')} />
        {Object.entries(CATEGORY_STYLE).map(([id, c]) => (
          <Chip key={id} label={c.name} icon={c.icon} active={category === id} onPress={() => setCategory(id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Còn hàng" icon="check-circle" active={inStock} onPress={() => setInStock((v) => !v)} />
        {brands.map((b) => (
          <Chip key={b} label={b} active={brand === b} onPress={() => setBrand(brand === b ? '' : b)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <Pressable key={s.id} onPress={() => setSort(s.id)} style={styles.sortItem}>
            <Text style={[styles.sortText, sort === s.id && styles.sortActive]}>{s.label}</Text>
            {sort === s.id ? <View style={styles.sortLine} /> : null}
          </Pressable>
        ))}
      </View>
      {!list.loading && !list.error ? (
        <Text style={styles.count}>
          {list.total} sản phẩm{query ? ` cho "${query}"` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tìm sản phẩm, thương hiệu..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus={!params.category && !params.sort}
            returnKeyType="search"
            onSubmitEditing={() => setQuery(text.trim())}
          />
          {text ? (
            <Pressable
              onPress={() => {
                setText('');
                setQuery('');
              }}
              hitSlop={10}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <CartButton />
      </View>

      <FlatList
        data={list.loading || list.error ? [] : list.items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.primary]} />}
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          list.loading ? (
            <LoadingView text="Đang tìm kiếm..." />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.retry} />
          ) : (
            <EmptyState icon="magnify" title="Không tìm thấy sản phẩm" message="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc." />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  sortRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: radius.md,
    marginTop: 2,
  },
  sortItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sortText: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  sortActive: { color: colors.primary, fontWeight: '800' },
  sortLine: { position: 'absolute', bottom: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  count: { marginHorizontal: 16, marginTop: 12, color: colors.textSoft, fontSize: 13, fontWeight: '600' },
});
