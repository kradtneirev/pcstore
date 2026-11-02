import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadow } from '../constants/theme';
import type { IconName } from '../constants/categories';

// ---------- Nút bấm ----------
type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'accent';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  size = 'md',
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}) {
  const inactive = disabled || loading;
  const height = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;
  const fg = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white;
  const content = (
    <View style={[styles.btnInner, { height }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={size === 'sm' ? 16 : 20} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg, fontSize: size === 'sm' ? 13 : 15 }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.btn,
        variant === 'outline' && styles.btnOutline,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && { backgroundColor: colors.danger },
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {variant === 'primary' || variant === 'accent' ? (
        <LinearGradient
          colors={variant === 'primary' ? gradients.brand : gradients.sale}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

// ---------- Ô nhập liệu ----------
export function Input({
  label,
  error,
  icon,
  secure,
  right,
  containerStyle,
  ...props
}: TextInputProps & { label?: string; error?: string | null; icon?: IconName; secure?: boolean; right?: ReactNode; containerStyle?: ViewStyle }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[{ marginBottom: 14 }, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputBox,
          focused && { borderColor: colors.primary, backgroundColor: colors.white },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={focused ? colors.primary : colors.muted} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          secureTextEntry={secure ? hidden : props.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }, props.style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <MaterialCommunityIcons name={hidden ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// ---------- Chọn số lượng ----------
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  compact,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const size = compact ? 30 : 38;
  const btn = (icon: IconName, disabled: boolean, next: number) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepBtn,
        { width: size, height: size, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={compact ? 16 : 20} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('minus', value <= min, value - 1)}
      <Text style={[styles.stepValue, { minWidth: compact ? 30 : 40, fontSize: compact ? 14 : 16 }]}>{value}</Text>
      {btn('plus', value >= max, value + 1)}
    </View>
  );
}

// ---------- Trạng thái màn hình ----------
export function LoadingView({ text = 'Đang tải...' }: { text?: string }) {
  // Chờ quá 6 giây thì báo cho người dùng biết máy chủ đang khởi động
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centerText}>{text}</Text>
      {slow ? <Text style={styles.centerText}>Máy chủ đang khởi động, vui lòng chờ khoảng 30 giây...</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={46} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.centerText}>{message}</Text> : null}
      {action ? <Button title={action.title} onPress={action.onPress} style={{ marginTop: 20, minWidth: 200 }} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="wifi-off"
      title="Không tải được dữ liệu"
      message={message}
      action={{ title: 'Thử lại', onPress: onRetry }}
    />
  );
}

// ---------- Khác ----------
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <MaterialCommunityIcons name={icon} size={15} color={active ? colors.white : colors.textSoft} /> : null}
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, icon, action }: { title: string; icon?: IconName; action?: { title: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={colors.primary} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionAction}>{action.title}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Rating({ value, count, size = 12 }: { value: number; count?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <MaterialCommunityIcons name="star" size={size + 2} color={colors.star} />
      <Text style={{ fontSize: size, fontWeight: '700', color: colors.text }}>{value.toFixed(1)}</Text>
      {count ? <Text style={{ fontSize: size, color: colors.muted }}>{count}</Text> : null}
    </View>
  );
}

export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <MaterialCommunityIcons name="check" size={16} color={colors.white} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.primary },
  btnGradient: { borderRadius: radius.md },
  btnOutline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  btnGhost: { backgroundColor: colors.primarySoft },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnText: { fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSoft, marginBottom: 6 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  input: { flex: 1, minHeight: 48, fontSize: 15, color: colors.text, paddingVertical: 10 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4, fontWeight: '500' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  stepBtn: { alignItems: 'center', justifyContent: 'center' },
  stepValue: { textAlign: 'center', fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  centerText: { marginTop: 8, color: colors.textSoft, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSoft },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow(1) },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: '700', color: colors.primary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
