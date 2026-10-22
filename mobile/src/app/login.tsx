import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, login } from '../lib/api';
import { setToken } from '../lib/session';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!username.trim() || !password) {
      setError('Isi username dan password.');
      return;
    }
    setSubmitting(true);
    try {
      const { token } = await login(username.trim(), password);
      await setToken(token);
      router.replace('/soundbox');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Username atau password salah.');
      } else {
        setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Admin</Text>
      <Text style={styles.muted}>Gunakan akun admin yang sama dengan dashboard web.</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [styles.button, (pressed || submitting) && styles.buttonPressed]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#001219" /> : <Text style={styles.buttonText}>Masuk</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020', padding: 24, justifyContent: 'center' },
  title: { color: '#e8ecf8', fontSize: 26, fontWeight: '700', marginBottom: 6 },
  muted: { color: '#8b95b8', marginBottom: 24 },
  label: { color: '#8b95b8', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#1d2540',
    color: '#e8ecf8',
    borderColor: '#2a3558',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  error: { color: '#ef4444', marginTop: 12 },
  button: { backgroundColor: '#00aed9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#001219', fontWeight: '700', fontSize: 16 },
});
