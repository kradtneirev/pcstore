import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Input, SectionTitle } from './ui';
import { colors, radius } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch } from '../store';
import { changePassword } from '../store/authSlice';

type Field = 'current' | 'next' | 'confirm';
const EMPTY: Record<Field, string> = { current: '', next: '', confirm: '' };

// Khung đổi mật khẩu trong màn hình Thông tin cá nhân
export default function ChangePasswordCard() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (k: Field) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const e: Partial<Record<Field, string>> = {};
    if (!form.current) e.current = 'Vui lòng nhập mật khẩu hiện tại';
    if (form.next.length < 6) e.next = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    else if (form.next === form.current) e.next = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    if (form.confirm !== form.next) e.confirm = 'Mật khẩu nhập lại không khớp';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const result = await dispatch(changePassword({ currentPassword: form.current, newPassword: form.next }));
    setSaving(false);
    if (changePassword.fulfilled.match(result)) {
      setForm(EMPTY);
      toast('Đã đổi mật khẩu', 'success');
    } else if (result.payload?.includes('hiện tại')) {
      setErrors({ current: result.payload });
    } else {
      toast(result.payload ?? 'Đổi mật khẩu thất bại', 'error');
    }
  };

  return (
    <Card>
      <SectionTitle title="Đổi mật khẩu" icon="lock" />
      <Input label="Mật khẩu hiện tại" icon="lock" value={form.current} onChangeText={set('current')} secure autoCapitalize="none" error={errors.current} />
      <Input
        label="Mật khẩu mới"
        icon="lock"
        value={form.next}
        onChangeText={set('next')}
        placeholder="Ít nhất 6 ký tự"
        secure
        autoCapitalize="none"
        error={errors.next}
      />
      <Input
        label="Nhập lại mật khẩu mới"
        icon="lock"
        value={form.confirm}
        onChangeText={set('confirm')}
        secure
        autoCapitalize="none"
        error={errors.confirm}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <View style={styles.note}>
        <MaterialCommunityIcons name="shield-lock" size={16} color={colors.primary} />
        <Text style={styles.noteText}>Sau khi đổi, tài khoản tự đăng xuất trên các điện thoại khác.</Text>
      </View>
      <Button title="Đổi mật khẩu" icon="check" variant="outline" onPress={submit} loading={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.primary },
});
