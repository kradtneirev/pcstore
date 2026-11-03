import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { colors, gradients, radius, shadow } from '../../constants/theme';
import type { IconName } from '../../constants/categories';
import { useToast } from '../../context/ToastContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/authSlice';

export default function AccountScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const toast = useToast();

  const confirmLogout = () =>
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
          toast('Đã đăng xuất', 'info');
        },
      },
    ]);

  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const menu: { icon: IconName; title: string; onPress: () => void; hidden?: boolean }[] = [
    { icon: 'account-circle', title: 'Thông tin cá nhân', onPress: () => router.push('/profile'), hidden: !token },
    { icon: 'lock', title: 'Đổi mật khẩu', onPress: () => router.push('/change-password'), hidden: !token },
    { icon: 'receipt-text', title: 'Đơn hàng của tôi', onPress: () => router.navigate('/orders'), hidden: !token },
    { icon: 'cart-outline', title: 'Giỏ hàng', onPress: () => router.navigate('/cart') },
    { icon: 'server-network', title: 'Cài đặt máy chủ', onPress: () => router.push('/settings') },
    {
      icon: 'headset',
      title: 'Hỗ trợ khách hàng',
      onPress: () => Alert.alert('Hỗ trợ khách hàng', 'Hotline: 1900 1234 (8:00 – 21:00)\nEmail: hotro@pcstore.vn'),
    },
    {
      icon: 'information-outline',
      title: 'Giới thiệu',
      onPress: () =>
        Alert.alert('PC Store', `Ứng dụng bán linh kiện máy tính\nPhiên bản ${Constants.expoConfig?.version ?? '1.0.0'}`),
    },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profile}>
        <View style={styles.avatar}>
          {user ? (
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          ) : (
            <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
          )}
        </View>
        {user ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.sub}>{user.email}</Text>
            <Text style={styles.sub}>{user.phone}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Chào bạn!</Text>
            <Text style={styles.sub}>Đăng nhập để nhận ưu đãi và theo dõi đơn hàng</Text>
          </View>
        )}
      </LinearGradient>

      {!token ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Đăng nhập" onPress={() => router.push('/login')} style={{ flex: 1 }} />
          <Button title="Đăng ký" variant="outline" onPress={() => router.push('/register')} style={{ flex: 1 }} />
        </View>
      ) : null}

      <View style={styles.menu}>
        {menu
          .filter((m) => !m.hidden)
          .map((m, i, arr) => (
            <Pressable
              key={m.title}
              onPress={m.onPress}
              style={({ pressed }) => [styles.item, i < arr.length - 1 && styles.itemBorder, pressed && { backgroundColor: colors.bg }]}
            >
              <View style={styles.itemIcon}>
                <MaterialCommunityIcons name={m.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.itemText}>{m.title}</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ))}
      </View>

      {token ? <Button title="Đăng xuất" icon="logout" variant="ghost" onPress={confirmLogout} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: radius.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: colors.primary },
  name: { color: colors.white, fontSize: 19, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', ...shadow(1) },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
});
