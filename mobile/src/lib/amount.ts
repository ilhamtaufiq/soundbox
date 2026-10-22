// Susunan klip untuk "Pembayaran diterima <nominal> rupiah <penutup>".
// Sama dengan amountToClipNames di frontend/src/lib/speech.ts.

const UNITS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

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

/** Null jika nominal di luar 1 sampai 999 miliar */
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
