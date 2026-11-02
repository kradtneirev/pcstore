import { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Bản sao icon/màu của danh mục (giống backend) để vẽ ảnh sản phẩm ngay cả khi chưa tải danh mục
export const CATEGORY_STYLE: Record<string, { icon: IconName; colors: [string, string]; name: string }> = {
  cpu: { icon: 'cpu-64-bit', colors: ['#6366F1', '#8B5CF6'], name: 'CPU' },
  vga: { icon: 'expansion-card', colors: ['#10B981', '#059669'], name: 'VGA' },
  mainboard: { icon: 'developer-board', colors: ['#0EA5E9', '#2563EB'], name: 'Mainboard' },
  ram: { icon: 'memory', colors: ['#F59E0B', '#EA580C'], name: 'RAM' },
  storage: { icon: 'harddisk', colors: ['#EC4899', '#DB2777'], name: 'Ổ cứng' },
  psu: { icon: 'power-plug', colors: ['#EF4444', '#B91C1C'], name: 'Nguồn' },
  case: { icon: 'desktop-tower', colors: ['#64748B', '#334155'], name: 'Vỏ case' },
  cooling: { icon: 'fan', colors: ['#06B6D4', '#0891B2'], name: 'Tản nhiệt' },
  monitor: { icon: 'monitor', colors: ['#8B5CF6', '#6D28D9'], name: 'Màn hình' },
  keyboard: { icon: 'keyboard', colors: ['#14B8A6', '#0F766E'], name: 'Bàn phím' },
  mouse: { icon: 'mouse', colors: ['#F97316', '#C2410C'], name: 'Chuột' },
  headset: { icon: 'headphones', colors: ['#A855F7', '#7E22CE'], name: 'Tai nghe' },
};

export function categoryStyle(id: string) {
  return CATEGORY_STYLE[id] ?? { icon: 'package-variant' as IconName, colors: ['#4F46E5', '#7C3AED'] as [string, string], name: 'Khác' };
}
