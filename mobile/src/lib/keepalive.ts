import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CLIPS } from './clips';

// Memutar klip hening yang diulang terus. Selama ada pemutaran, Android
// menjaga aplikasi tetap hidup saat layar terkunci, dan kontrol layar kunci
// menampilkan status "Soundbox aktif".
let player: AudioPlayer | null = null;

export function startKeepAlive(): void {
  if (player) return;
  const source = CLIPS['silence'];
  if (source === undefined) return;

  const p = createAudioPlayer(source, { keepAudioSessionActive: true });
  p.loop = true;
  p.volume = 0.001;
  p.setActiveForLockScreen(true, {
    title: 'Soundbox aktif',
    artist: 'Memantau pembayaran masuk',
  });
  p.play();
  player = p;
}

export function stopKeepAlive(): void {
  if (!player) return;
  player.pause();
  player.setActiveForLockScreen(false);
  player.remove();
  player = null;
}
