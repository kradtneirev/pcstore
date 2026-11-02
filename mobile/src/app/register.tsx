import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { finishAuth } from '../utils/nav';
import { Button, Input } from '../components/ui';
import { colors } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch } from '../store';
import { register } from '../store/authSlice';

type Field = 'name' | 'email' | 'phone' | 'password' | 'confirm';

function validate(f: Record<Field, string>) {
  const e: Partial<Record<Field, string>> = {};
  if (f.name.trim().length < 2) e.name = 'Họ tên phải có ít nhất 2 ký tự';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Email không hợp lệ';
  if (!/^0\d{9}$/.test(f.phone.replace(/\s/g, ''))) e.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';
  if (f.password.length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
  if (f.confirm !== f.password) e.confirm = 'Mật khẩu nhập lại không khớp';
  return e;
}

export default function RegisterScreen() {
  const { redirect, fromLogin } = useLocalSearchParams<{ redirect?: string; fromLogin?: string }>();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [form, setForm] = useState<Record<Field, string>>({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: Field) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    setServerError(null);
    if (Object.keys(e).length) return;
    setLoading(true);
    const result = await dispatch(
      register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.replace(/\s/g, ''), password: form.password }),
    );
    setLoading(false);
    if (register.fulfilled.match(result)) {
      toast('Tạo tài khoản thành công!', 'success');
      // Mở từ màn hình đăng nhập thì đóng cả 2 màn hình
      finishAuth(redirect, fromLogin ? 2 : 1);
    } else {
      setServerError(result.payload ?? 'Đăng ký thất bại');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo tài khoản mới</Text>
        <Text style={styles.subtitle}>Chỉ mất 30 giây để bắt đầu mua sắm cùng PC Store</Text>
        <Input label="Họ và tên" icon="account-outline" value={form.name} onChangeText={set('name')} placeholder="Nguyễn Văn A" error={errors.name} />
        <Input
          label="Email"
          icon="email"
          value={form.email}
          onChangeText={set('email')}
          placeholder="email@vidu.com"
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <Input
          label="Số điện thoại"
          icon="phone"
          value={form.phone}
          onChangeText={set('phone')}
          placeholder="0901234567"
          keyboardType="phone-pad"
          maxLength={11}
          error={errors.phone}
        />
        <Input label="Mật khẩu" icon="lock" value={form.password} onChangeText={set('password')} placeholder="Ít nhất 6 ký tự" secure autoCapitalize="none" error={errors.password} />
        <Input
          label="Nhập lại mật khẩu"
          icon="lock"
          value={form.confirm}
          onChangeText={set('confirm')}
          placeholder="Nhập lại mật khẩu"
          secure
          autoCapitalize="none"
          error={errors.confirm}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {serverError ? <Text style={styles.serverError}>{serverError}</Text> : null}
        <Button title="Đăng ký" onPress={submit} loading={loading} size="lg" style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSoft, marginTop: 6, marginBottom: 24 },
  serverError: { color: colors.danger, fontWeight: '600', marginBottom: 12 },
});
