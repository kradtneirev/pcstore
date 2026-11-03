import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Input } from '../components/ui';
import { colors, radius } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch, useAppSelector } from '../store';
import { changePassword } from '../store/authSlice';

type Field = 'current' | 'next' | 'confirm';

export default function ChangePasswordScreen() {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [form, setForm] = useState<Record<Field, string>>({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  // Bị đăng xuất khi đang ở màn hình này thì quay lại
  useEffect(() => {
    if (!token) router.back();
  }, [token]);

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
      toast('Đã đổi mật khẩu', 'success');
      router.back();
    } else if (result.payload?.includes('hiện tại')) {
      setErrors({ current: result.payload });
    } else {
      toast(result.payload ?? 'Đổi mật khẩu thất bại', 'error');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Input
            label="Mật khẩu hiện tại"
            icon="lock"
            value={form.current}
            onChangeText={set('current')}
            secure
            autoCapitalize="none"
            error={errors.current}
          />
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
          <Button title="Đổi mật khẩu" icon="check" onPress={submit} loading={saving} />
        </Card>
        <View style={styles.note}>
          <MaterialCommunityIcons name="shield-lock" size={18} color={colors.primary} />
          <Text style={styles.noteText}>
            Sau khi đổi, tài khoản sẽ tự đăng xuất trên các điện thoại khác. Điện thoại này vẫn giữ đăng nhập.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.primarySoft, padding: 12, borderRadius: radius.md },
  noteText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 19 },
});
