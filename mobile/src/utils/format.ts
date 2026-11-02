// Tự định dạng số thay vì Intl để chạy giống nhau trên mọi máy Android
export function formatVnd(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

export function discountPercent(price: number, oldPrice?: number | null) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

// 1540 -> "1,5k"
export function formatSold(n: number) {
  if (n < 1000) return String(n);
  return (n / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k';
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatWarranty(months: number) {
  return months % 12 === 0 ? `${months / 12} năm` : `${months} tháng`;
}

// "4242424242424242" -> "4242 4242 4242 4242"
export function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

// "1230" -> "12/30"
export function formatExpiry(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
