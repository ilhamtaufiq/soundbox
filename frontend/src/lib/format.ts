const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function formatRupiah(amount: number): string {
  return rupiah.format(amount);
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

