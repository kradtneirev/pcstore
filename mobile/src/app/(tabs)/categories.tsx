import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProductRow from '../../components/ProductRow';
import { EmptyState, ErrorState, LoadingView } from '../../components/ui';
import { CATEGORY_STYLE } from '../../constants/categories';
import { colors, radius } from '../../constants/theme';
import { useProductList } from '../../hooks/useProductList';

const IDS = Object.keys(CATEGORY_STYLE);

export default function CategoriesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selected, setSelected] = useState(params.category && IDS.includes(params.category) ? params.category : IDS[0]);

  // Mở tab kèm ?category=... thì chọn sẵn danh mục đó
  useEffect(() => {
    if (params.category && IDS.includes(params.category)) setSelected(params.category);
  }, [params.category]);

  const list = useProductList({ category: selected, sort: 'popular' });
  const cs = CATEGORY_STYLE[selected];

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.sidebar}
        data={IDS}
        keyExtractor={(id) => id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const c = CATEGORY_STYLE[item];
          const active = item === selected;
          return (
            <Pressable onPress={() => setSelected(item)} style={[styles.side, active && styles.sideActive]}>
              {active ? <View style={styles.sideBar} /> : null}
              <MaterialCommunityIcons name={c.icon} size={24} color={active ? colors.primary : colors.muted} />
              <Text style={[styles.sideText, active && { color: colors.primary, fontWeight: '800' }]} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          );
        }}
      />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        data={list.loading || list.error ? [] : list.items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductRow product={item} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.primary]} />}
        ListHeaderComponent={
          <LinearGradient colors={cs.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{cs.name}</Text>
              <Text style={styles.heroSub}>{list.loading ? 'Đang tải...' : `${list.total} sản phẩm`}</Text>
            </View>
            <MaterialCommunityIcons name={cs.icon} size={48} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        }
        ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} /> : null}
        ListEmptyComponent={
          list.loading ? (
            <LoadingView />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.retry} />
          ) : (
            <EmptyState icon="package-variant" title="Chưa có sản phẩm" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  sidebar: { width: 84, flexGrow: 0, backgroundColor: colors.white },
  side: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, gap: 4 },
  sideActive: { backgroundColor: colors.primarySoft },
  sideBar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: 2, backgroundColor: colors.primary },
  sideText: { fontSize: 11, fontWeight: '600', color: colors.textSoft, textAlign: 'center' },
  hero: { borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
});
