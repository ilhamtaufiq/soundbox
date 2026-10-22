import { NativeModules, Platform } from 'react-native';

// Modul native KeepAlive (plugins/native/KeepAliveModule.kt) menjalankan
// foreground service agar pemantauan tetap hidup saat layar terkunci.
interface KeepAliveNative {
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
}

const native = NativeModules.KeepAlive as KeepAliveNative | undefined;

export async function startKeepAlive(): Promise<void> {
  if (Platform.OS !== 'android' || !native) return;
  await native.start();
}

export async function stopKeepAlive(): Promise<void> {
  if (Platform.OS !== 'android' || !native) return;
  await native.stop();
}
