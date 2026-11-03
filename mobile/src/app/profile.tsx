import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Input } from '../components/ui';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { colors } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch, useAppSelector } from '../store';
import { updateProfile } from '../store/authSlice';

export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Đăng xuất (hoặc phiên hết hạn) khi đang ở màn hình này thì quay lại
  useEffect(() => {
    if (!user) router.back();
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Họ tên phải có ít nhất 2 ký tự');
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) return setError('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0');
    setSaving(true);
    const result = await dispatch(updateProfile({ name: name.trim(), phone: phone.replace(/\s/g, ''), address: address.trim() }));
    setSaving(false);
    if (updateProfile.fulfilled.match(result)) {
      toast('Đã cập nhật thông tin', 'success');
      router.back();
    } else {
      setError(result.payload ?? 'Cập nhật thất bại');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Input label="Email (không thể thay đổi)" icon="email" value={user.email} editable={false} />
          <Input label="Họ và tên" icon="account-outline" value={name} onChangeText={setName} />
          <Input label="Số điện thoại" icon="phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={11} />
          <Input
            label="Địa chỉ giao hàng mặc định"
            icon="map-marker"
            value={address}
            onChangeText={setAddress}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            multiline
          />
          {error ? <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: 12 }}>{error}</Text> : null}
          <Button title="Lưu thay đổi" onPress={save} loading={saving} />
        </Card>
        <ChangePasswordCard />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
