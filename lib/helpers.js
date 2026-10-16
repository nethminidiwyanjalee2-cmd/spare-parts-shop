const pad = (n) => String(n).padStart(2, '0');

export const money = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Local calendar day as YYYY-MM-DD (the shop's day, not UTC)
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
export const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// A short code unique to this browser/device, so invoice numbers created on two
// devices (even offline) can never collide.
function deviceCode() {
  try {
    let c = localStorage.getItem('deviceCode');
    if (!c) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      c = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
      localStorage.setItem('deviceCode', c);
    }
    return c;
  } catch (e) {
    return 'XX';
  }
}

// e.g. INV-20261016-143205-K7  (date - time - device)
export function newInvoiceNo() {
  const d = new Date();
  const t = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `INV-${dayKey(d).replace(/-/g, '')}-${t}-${deviceCode()}`;
}

// Next sequential internal barcode, e.g. SP00042, based on the highest one in use.
export function nextBarcode(allItems) {
  let max = 0;
  for (const i of allItems) {
    const m = /^SP(\d+)$/.exec(i.barcode || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `SP${String(max + 1).padStart(5, '0')}`;
}
