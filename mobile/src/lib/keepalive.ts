import { NativeModules, Platform } from 'react-native';

// Modul native KeepAlive (plugins/native/KeepAliveModule.kt) menjalankan
// foreground service agar pemantauan tetap hidup saat layar terkunci.
interface KeepAliveNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  update(text: string): Promise<boolean>;
}

const native = NativeModules.KeepAlive as KeepAliveNative | undefined;
const available = () => Platform.OS === 'android' && !!native;

export async function startKeepAlive(): Promise<void> {
  if (available()) await native!.start();
}

export async function stopKeepAlive(): Promise<void> {
  if (available()) await native!.stop();
}

/** Teks status yang tampil di notifikasi "Soundbox aktif" */
export async function updateKeepAliveText(text: string): Promise<void> {
  if (available()) await native!.update(text).catch(() => {});
}
