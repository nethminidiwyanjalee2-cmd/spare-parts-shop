const pad = (n) => String(n).padStart(2, '0');

export const money = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Timezone for all date/time display and day-boundary calculations
const TZ = 'Asia/Colombo';

// Extract YYYY, MM, DD parts in the shop's local timezone (Asia/Colombo).
// Using Intl.DateTimeFormat avoids relying on the host system's local timezone
// setting, which could be UTC in server/CI environments.
function localParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  // en-CA gives "YYYY-MM-DD" natively
  return f.format(d); // "2026-11-03"
}

// Local calendar day as YYYY-MM-DD (the shop's day, not UTC)
export const dayKey = (d = new Date()) => localParts(d);
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localParts(d);
};
export const monthStart = () => {
  const ym = localParts().slice(0, 7); // "YYYY-MM"
  return `${ym}-01`;
};

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
// Time part also uses Asia/Colombo so it matches the date in the invoice number.
export function newInvoiceNo() {
  const d = new Date();
  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => timeParts.find((p) => p.type === type)?.value ?? '00';
  const t = `${get('hour')}${get('minute')}${get('second')}`;
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
