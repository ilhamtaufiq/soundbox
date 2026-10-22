import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { amountToClipNames } from './amount';
import { CLIPS } from './clips';

// Batas waktu per klip, supaya satu klip yang macet tidak menghentikan antrean
const CLIP_TIMEOUT_MS = 8000;

let modeReady: Promise<void> | null = null;

/** Izinkan pemutaran saat layar terkunci dan saat mode senyap */
export function prepareAudio(): Promise<void> {
  modeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {});
  return modeReady;
}

function playClip(name: string): Promise<void> {
  const source = CLIPS[name];
  if (source === undefined) return Promise.resolve();

  return new Promise((resolve) => {
    const player = createAudioPlayer(source);
    const timer = setTimeout(() => finish(), CLIP_TIMEOUT_MS);
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) finish();
    });

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sub.remove();
      player.remove();
      resolve();
    }

    player.play();
  });
}

/** Bunyikan chime lalu nominal dan penutup, berurutan tanpa jeda */
export async function announcePayment(amount: number): Promise<void> {
  await prepareAudio();
  const names = amountToClipNames(amount);
  if (!names) return;

  await playClip('chime');
  for (const name of names) {
    await playClip(name);
  }
}
