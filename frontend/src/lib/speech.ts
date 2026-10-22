/**
 * Pemutar suara untuk soundbox.
 * Browser memblokir audio sebelum ada interaksi user, jadi `unlockAudio`
 * harus dipanggil dari handler klik (tombol "Aktifkan Suara").
 *
 * Nominal diumumkan dengan menyambung klip per kata dari `public/audio/`
 * (lihat `amountToClipNames`). Kalau ada klip yang tidak ada, pakai suara browser.
 */

let audioCtx: AudioContext | null = null;
const clipCache = new Map<string, Promise<AudioBuffer>>();

const CHIME_SECONDS = 0.9;
const UNITS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

export function unlockAudio(): void {
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
}

/** Bunyi "ding-dong" singkat */
export function playChime(): void {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    const start = now + i * 0.25;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    osc.start(start);
    osc.stop(start + 0.6);
  });
}

/** Ucapkan teks dengan suara Bahasa Indonesia; ucapan antre berurutan */
export function speak(text: string): void {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

/** Angka 1–999 jadi nama klip, mis. 245 -> ["dua-ratus", "empat-puluh", "lima"] */
function hundredsClips(n: number): string[] {
  const clips: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds === 1) clips.push('seratus');
  else if (hundreds > 1) clips.push(`${UNITS[hundreds]}-ratus`);

  if (rest >= 10 && rest < 20) {
    if (rest === 10) clips.push('sepuluh');
    else if (rest === 11) clips.push('sebelas');
    else clips.push(`${UNITS[rest - 10]}-belas`);
  } else {
    const tens = Math.floor(rest / 10);
    const unit = rest % 10;
    if (tens > 1) clips.push(`${UNITS[tens]}-puluh`);
    if (unit > 0) clips.push(UNITS[unit]);
  }
  return clips;
}

/**
 * Urutan klip untuk kalimat "Pembayaran diterima <nominal> rupiah".
 * Mengembalikan null jika nominal di luar 1 sampai 999 miliar.
 */
export function amountToClipNames(amount: number): string[] | null {
  if (!Number.isInteger(amount) || amount <= 0 || amount >= 1e12) return null;

  const names = ['pembayaran-diterima'];
  let rest = amount;
  for (const [size, word] of [
    [1e9, 'miliar'],
    [1e6, 'juta'],
    [1e3, 'ribu'],
  ] as const) {
    const group = Math.floor(rest / size);
    if (group > 0) names.push(...hundredsClips(group), word);
    rest %= size;
  }
  if (rest > 0) names.push(...hundredsClips(rest));
  names.push('rupiah', 'terima-kasih');
  return names;
}

function loadClip(name: string): Promise<AudioBuffer> {
  let pending = clipCache.get(name);
  if (!pending) {
    pending = fetch(`/audio/${name}.mp3`)
      .then((res) => {
        if (!res.ok) throw new Error(`klip ${name} tidak ditemukan`);
        return res.arrayBuffer();
      })
      .then((data) => audioCtx!.decodeAudioData(data))
      .catch((err) => {
        clipCache.delete(name);
        throw err;
      });
    clipCache.set(name, pending);
  }
  return pending;
}

/**
 * Bunyikan chime lalu sebutkan nominal dan penutup. Klip diputar berurutan tanpa jeda.
 * Kalau ada klip yang gagal dimuat, seluruh pengumuman pakai suara browser.
 */
export async function announcePayment(amount: number): Promise<void> {
  if (!audioCtx) return;
  playChime();

  const names = amountToClipNames(amount);
  if (!names) {
    speak(`Pembayaran diterima, ${amount.toLocaleString('id-ID')} rupiah`);
    return;
  }

  try {
    const buffers = await Promise.all(names.map(loadClip));
    const ctx = audioCtx!;
    let start = ctx.currentTime + CHIME_SECONDS;
    for (const buffer of buffers) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(start);
      start += buffer.duration;
    }
  } catch {
    speak(`Pembayaran diterima, ${amount.toLocaleString('id-ID')} rupiah`);
  }
}
