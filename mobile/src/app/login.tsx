import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { colors, gradients, radius } from '../constants/theme';
import { useToast } from '../context/ToastContext';
import { useAppDispatch } from '../store';
import { login } from '../store/authSlice';
import { finishAuth } from '../utils/nav';

export default function LoginScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập email/số điện thoại và mật khẩu');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await dispatch(login({ identifier: identifier.trim(), password }));
    setLoading(false);
    if (login.fulfilled.match(result)) {
      toast(`Chào mừng ${result.payload.user.name}!`, 'success');
      finishAuth(redirect, 1);
    } else {
      setError(result.payload ?? 'Đăng nhập thất bại');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior="padding">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={gradients.brand} style={styles.logo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <MaterialCommunityIcons name="chip" size={40} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>Chào mừng trở lại!</Text>
        <Text style={styles.subtitle}>Đăng nhập để đặt hàng và theo dõi đơn hàng của bạn</Text>

        <Input
          label="Email hoặc số điện thoại"
          icon="account-outline"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="vd: demo@pcstore.vn"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="username"
        />
        <Input
          label="Mật khẩu"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder="Nhập mật khẩu"
          secure
          autoCapitalize="none"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button title="Đăng nhập" onPress={submit} loading={loading} size="lg" style={{ marginTop: 6 }} />

        <Pressable
          style={styles.demo}
          onPress={() => {
            setIdentifier('demo@pcstore.vn');
            setPassword('123456');
            setError(null);
          }}
        >
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.primary} />
          <Text style={styles.demoText}>
            Dùng tài khoản demo: <Text style={{ fontWeight: '800' }}>demo@pcstore.vn / 123456</Text>
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <Pressable
            onPress={() =>
              router.push(`/register?fromLogin=1${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`)
            }
            hitSlop={8}
          >
            <Text style={styles.link}>Đăng ký ngay</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 28, paddingBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 14, color: colors.textSoft, textAlign: 'center', marginTop: 6, marginBottom: 24, lineHeight: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  errorText: { color: colors.danger, fontWeight: '600', flex: 1 },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: radius.md,
    marginTop: 16,
  },
  demoText: { color: colors.primary, fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: colors.textSoft, fontSize: 14 },
  link: { color: colors.primary, fontWeight: '800', fontSize: 14 },
});
