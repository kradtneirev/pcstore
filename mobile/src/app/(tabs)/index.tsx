import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, errorMessage } from '../../api/client';
import type { HomeData, Product } from '../../api/types';
import ProductCard from '../../components/ProductCard';
import CartButton from '../../components/CartButton';
import { ErrorState, LoadingView, SectionTitle } from '../../components/ui';
import { colors, gradients, radius, shadow } from '../../constants/theme';
import type { IconName } from '../../constants/categories';
import { useAppSelector } from '../../store';

const PERKS: { icon: IconName; title: string }[] = [
  { icon: 'shield-check', title: 'Chính hãng 100%' },
  { icon: 'truck-fast', title: 'Giao nhanh 2h' },
  { icon: 'refresh', title: 'Đổi trả 7 ngày' },
];

// Đếm ngược đến 23:59:59 hôm nay cho mục Flash Sale
function useEndOfDayCountdown() {
  const calc = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  };
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const timer = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map(pad);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAppSelector((s) => s.auth.user);
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const countdown = useEndOfDayCountdown();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setData(await api.home());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Header màu tím nên đổi chữ thanh trạng thái sang màu trắng khi đang ở màn hình này
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const bannerWidth = width - 32;
  const cardWidth = 156;
  const gridWidth = (width - 32 - 12) / 2;

  const renderHorizontal = (list: Product[]) => (
    <FlatList
      horizontal
      data={list}
      keyExtractor={(p) => p.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{user ? `Xin chào, ${user.name.split(' ').slice(-1)[0]} 👋` : 'Xin chào 👋'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="chip" size={24} color={colors.white} />
              <Text style={styles.brand}>PC Store</Text>
            </View>
          </View>
          <CartButton color={colors.white} background="rgba(255,255,255,0.18)" />
        </View>
        <Pressable onPress={() => router.push('/search')} style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.muted} />
          <Text style={styles.searchText}>Tìm CPU, VGA, RAM, màn hình...</Text>
        </Pressable>
      </LinearGradient>

      {!data && !error ? (
        <LoadingView />
      ) : !data && error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : data ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        >
          {/* Banner */}
          <FlatList
            horizontal
            pagingEnabled={false}
            snapToInterval={bannerWidth + 12}
            decelerationRate="fast"
            data={data.banners}
            keyExtractor={(b) => b.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingTop: 16 }}
            onMomentumScrollEnd={(e) => setBannerIndex(Math.round(e.nativeEvent.contentOffset.x / (bannerWidth + 12)))}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(item.category ? `/search?category=${item.category}` : '/search')}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, { width: bannerWidth }]}>
                  <View style={styles.bannerCircle} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{item.title}</Text>
                    <Text style={styles.bannerSub}>{item.subtitle}</Text>
                    <View style={styles.bannerBtn}>
                      <Text style={styles.bannerBtnText}>Mua ngay</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name={item.icon as IconName} size={84} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              </Pressable>
            )}
          />
          <View style={styles.dots}>
            {data.banners.map((b, i) => (
              <View key={b.id} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
            ))}
          </View>

          {/* Cam kết */}
          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p.title} style={styles.perk}>
                <MaterialCommunityIcons name={p.icon} size={18} color={colors.primary} />
                <Text style={styles.perkText}>{p.title}</Text>
              </View>
            ))}
          </View>

          {/* Danh mục */}
          <View style={styles.section}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionTitle title="Danh mục" icon="view-grid" action={{ title: 'Tất cả', onPress: () => router.push('/categories') }} />
            </View>
            <View style={styles.catGrid}>
              {data.categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/search?category=${c.id}`)}
                  style={({ pressed }) => [styles.catItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <LinearGradient colors={c.colors} style={styles.catIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <MaterialCommunityIcons name={c.icon as IconName} size={26} color={colors.white} />
                  </LinearGradient>
                  <Text style={styles.catText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Flash sale */}
          {data.flashSale.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.flashHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={22} color={colors.accent} />
                <Text style={styles.flashTitle}>FLASH SALE</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
                  {countdown.map((v, i) => (
                    <Text key={i} style={styles.timeBox}>
                      {v}
                    </Text>
                  ))}
                </View>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => router.push('/search?sort=popular')} hitSlop={8}>
                  <Text style={styles.seeAll}>Xem thêm</Text>
                </Pressable>
              </View>
              {renderHorizontal(data.flashSale)}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionTitle title="Bán chạy nhất" icon="fire" action={{ title: 'Xem thêm', onPress: () => router.push('/search?sort=popular') }} />
            </View>
            {renderHorizontal(data.bestSellers)}
          </View>

          <View style={[styles.section, { paddingHorizontal: 16 }]}>
            <SectionTitle title="Hàng mới về" icon="gift" action={{ title: 'Xem thêm', onPress: () => router.push('/search?sort=newest') }} />
            <View style={styles.grid}>
              {data.newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} width={gridWidth} />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  hello: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  brand: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: 0.3 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    height: 46,
    paddingHorizontal: 14,
    ...shadow(2),
  },
  searchText: { color: colors.muted, fontSize: 14 },
  banner: { height: 140, borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  bannerCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    right: -40,
    top: -50,
  },
  bannerTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  bannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  bannerBtnText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primary },
  perks: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 10,
    ...shadow(1),
  },
  perk: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  perkText: { fontSize: 11, fontWeight: '700', color: colors.textSoft },
  section: { marginTop: 22 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  catItem: { width: '25%', alignItems: 'center', marginBottom: 14 },
  catIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...shadow(1) },
  catText: { marginTop: 6, fontSize: 12, fontWeight: '600', color: colors.text },
  flashHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 4 },
  flashTitle: { fontSize: 17, fontWeight: '900', color: colors.accent, fontStyle: 'italic' },
  timeBox: {
    backgroundColor: colors.text,
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  seeAll: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
