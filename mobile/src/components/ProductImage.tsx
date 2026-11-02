import { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { categoryStyle } from '../constants/categories';
import { colors, radius } from '../constants/theme';
import { useAppSelector } from '../store';

interface Props {
  category: string;
  brand?: string;
  image?: string | null; // đường dẫn ảnh từ backend, vd "/images/products/p001.jpg?v=..."
  size?: number; // chiều cao khung ảnh
  iconSize?: number;
  rounded?: number;
  style?: ViewStyle;
  showBrand?: boolean;
}

/**
 * Ảnh sản phẩm. Có ảnh thật (backend/public/products) thì hiện ảnh,
 * chưa có hoặc tải lỗi thì hiện nền gradient theo danh mục + icon linh kiện.
 */
export default function ProductImage({ category, brand, image, size = 140, iconSize, rounded = radius.md, style, showBrand = true }: Props) {
  const apiUrl = useAppSelector((s) => s.settings.apiUrl);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = image ? (/^https?:\/\//.test(image) ? image : `${apiUrl}${image}`) : null;

  if (uri && uri !== failedUri) {
    return (
      <View style={[{ height: size, borderRadius: rounded }, styles.photoBox, style]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setFailedUri(uri)}
        />
      </View>
    );
  }

  const cs = categoryStyle(category);
  const icon = iconSize ?? Math.round(size * 0.42);
  return (
    <LinearGradient
      colors={cs.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ height: size, borderRadius: rounded, overflow: 'hidden' }, styles.center, style]}
    >
      <View style={[styles.circle, { width: size * 0.9, height: size * 0.9, borderRadius: size, right: -size * 0.3, top: -size * 0.35 }]} />
      <View style={[styles.circle, { width: size * 0.6, height: size * 0.6, borderRadius: size, left: -size * 0.2, bottom: -size * 0.25 }]} />
      <MaterialCommunityIcons name={cs.icon} size={icon} color="rgba(255,255,255,0.95)" />
      {showBrand && brand ? (
        <View style={styles.brand}>
          <Text style={[styles.brandText, { fontSize: Math.max(9, Math.min(12, size * 0.075)) }]} numberOfLines={1}>
            {brand.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  photoBox: { backgroundColor: colors.white, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF0F4' },
  circle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)' },
  brand: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(15,23,42,0.35)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '80%',
  },
  brandText: { color: colors.white, fontWeight: '800', letterSpacing: 0.5 },
});
