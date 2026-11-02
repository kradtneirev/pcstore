import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { selectCartCount, useAppSelector } from '../store';

// Biểu tượng giỏ hàng kèm số lượng, dùng trên header
export default function CartButton({ color = colors.text, background }: { color?: string; background?: string }) {
  const count = useAppSelector(selectCartCount);
  return (
    <Pressable
      onPress={() => router.push('/cart')}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, background ? { backgroundColor: background } : null, { opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialCommunityIcons name="cart-outline" size={24} color={color} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
