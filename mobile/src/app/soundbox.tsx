import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatRupiah } from '../lib/format';
import { announcePayment } from '../lib/player';
import { clearToken, getToken } from '../lib/session';
import {
  getMonitorState,
  setUnauthorizedHandler,
  startMonitor,
  stopMonitor,
  subscribeMonitor,
  type MonitorState,
} from '../lib/monitor';

export default function SoundboxScreen() {
  const [state, setState] = useState<MonitorState>(getMonitorState());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeMonitor(setState);
    setUnauthorizedHandler(() => router.replace('/login'));

    (async () => {
      // Android 13 ke atas butuh izin notifikasi agar notifikasi layanan tampil
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
      }
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      await startMonitor();
    })();

    // Memperbarui tampilan "baru" setiap detik
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  async function handleLogout() {
    await stopMonitor();
    await clearToken();
    router.replace('/login');
  }

  const isFresh = state.freshAt > 0 && now - state.freshAt < 6000;
  const statusText =
    state.online === null ? 'Menghubungkan…' : state.online ? 'Terhubung' : 'Gagal terhubung, mencoba lagi…';
  const statusColor = state.online ? '#22c55e' : state.online === false ? '#ef4444' : '#f59e0b';
  const label = isFresh ? 'PEMBAYARAN DITERIMA' : state.last ? 'PEMBAYARAN TERAKHIR' : 'MENUNGGU PEMBAYARAN';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={styles.muted}>{statusText}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{label}</Text>
        {state.last ? (
          <>
            <Text style={styles.amount}>{formatRupiah(state.last.amount)}</Text>
            <Text style={styles.muted}>{new Date(state.last.paid_at).toLocaleString('id-ID')}</Text>
          </>
        ) : (
          <Text style={styles.muted}>Belum ada pembayaran masuk</Text>
        )}
      </View>

      <View style={styles.row}>
        <Pressable style={styles.secondary} onPress={() => announcePayment(12345)}>
          <Text style={styles.secondaryText}>Tes Suara</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={handleLogout}>
          <Text style={styles.secondaryText}>Keluar</Text>
        </Pressable>
      </View>

      {state.recent.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5 pembayaran terakhir</Text>
          {state.recent.map((tx) => (
            <View key={tx.id} style={styles.recentRow}>
              <Text style={styles.muted}>{new Date(tx.paid_at).toLocaleTimeString('id-ID')}</Text>
              <Text style={styles.recentAmount}>{formatRupiah(tx.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Agar suara tetap berbunyi saat layar terkunci, matikan optimasi baterai untuk aplikasi ini di pengaturan HP.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  content: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  muted: { color: '#8b95b8' },
  card: { backgroundColor: '#151b2e', borderColor: '#2a3558', borderWidth: 1, borderRadius: 16, padding: 20, gap: 8 },
  label: { color: '#8b95b8', fontSize: 12, letterSpacing: 1 },
  amount: { color: '#22c55e', fontSize: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
  secondary: {
    flex: 1,
    backgroundColor: '#1d2540',
    borderColor: '#2a3558',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#e8ecf8', fontWeight: '600' },
  sectionTitle: { color: '#e8ecf8', fontWeight: '600', marginBottom: 4 },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopColor: '#2a3558',
    borderTopWidth: 1,
  },
  recentAmount: { color: '#e8ecf8', fontWeight: '600' },
  hint: { backgroundColor: '#1d2540', borderRadius: 12, padding: 14 },
  hintText: { color: '#f59e0b', fontSize: 13 },
});
