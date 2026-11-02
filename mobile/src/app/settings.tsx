import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api, errorMessage } from '../api/client';
import { Button, Card, Input } from '../components/ui';
import { colors, radius } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch, useAppSelector } from '../store';
import { clearCart } from '../store/cartSlice';
import { DEFAULT_API_URL, setApiUrl } from '../store/settingsSlice';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const current = useAppSelector((s) => s.settings.apiUrl);
  const cartCount = useAppSelector((s) => s.cart.items.length);
  const [url, setUrl] = useState(current);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const normalized = url.trim().replace(/\/+$/, '');
  const valid = /^https?:\/\/[^\s/]+(:\d+)?$/.test(normalized);

  const test = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await api.health(normalized);
      setStatus({ ok: true, text: 'Kết nối thành công!' });
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) });
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    dispatch(setApiUrl(normalized));
    toast('Đã lưu địa chỉ máy chủ', 'success');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.title}>Địa chỉ máy chủ (backend)</Text>
          <Text style={styles.desc}>
            Nhập địa chỉ IP của máy tính đang chạy backend. Điện thoại và máy tính phải cùng mạng Wi-Fi.
          </Text>
          <Input
            icon="server-network"
            value={url}
            onChangeText={(t) => {
              setUrl(t);
              setStatus(null);
            }}
            placeholder="http://192.168.1.10:4000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={url && !valid ? 'Địa chỉ phải có dạng http://IP:cổng' : null}
          />
          {status ? (
            <View style={[styles.status, { backgroundColor: status.ok ? colors.successSoft : colors.dangerSoft }]}>
              <MaterialCommunityIcons
                name={status.ok ? 'check-circle' : 'alert-circle-outline'}
                size={18}
                color={status.ok ? colors.success : colors.danger}
              />
              <Text style={[styles.statusText, { color: status.ok ? colors.success : colors.danger }]}>{status.text}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Kiểm tra" variant="outline" icon="server-network" onPress={test} loading={testing} disabled={!valid} style={{ flex: 1 }} />
            <Button title="Lưu" icon="check" onPress={save} disabled={!valid || normalized === current} style={{ flex: 1 }} />
          </View>
          {current !== DEFAULT_API_URL ? (
            <Button
              title={`Khôi phục mặc định (${DEFAULT_API_URL})`}
              variant="ghost"
              size="sm"
              onPress={() => {
                setUrl(DEFAULT_API_URL);
                dispatch(setApiUrl(DEFAULT_API_URL));
                toast('Đã khôi phục địa chỉ mặc định', 'info');
              }}
              style={{ marginTop: 10 }}
            />
          ) : null}
          <Text style={styles.current}>Đang dùng: {current}</Text>
        </Card>

        <Card>
          <Text style={styles.title}>Dữ liệu trên máy</Text>
          <Button
            title={`Xóa giỏ hàng (${cartCount} sản phẩm)`}
            variant="ghost"
            icon="delete-outline"
            disabled={cartCount === 0}
            onPress={() =>
              Alert.alert('Xóa giỏ hàng', 'Xóa toàn bộ sản phẩm trong giỏ hàng?', [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: () => {
                    dispatch(clearCart());
                    toast('Đã xóa giỏ hàng', 'info');
                  },
                },
              ])
            }
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  desc: { fontSize: 13, color: colors.textSoft, lineHeight: 19, marginBottom: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, marginBottom: 12 },
  statusText: { flex: 1, fontWeight: '600', fontSize: 13 },
  current: { marginTop: 12, fontSize: 12, color: colors.muted },
});
