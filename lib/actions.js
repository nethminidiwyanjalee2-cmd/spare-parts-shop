import { collection, doc, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { fb } from './firebase';
import { dayKey, newInvoiceNo, nextBarcode } from './helpers';

// Firestore write promises only resolve once the SERVER confirms. Offline they
// stay pending, even though the data is already saved on this device and shown
// in the app, and will sync by itself later. So: wait for confirmation when
// online (to surface errors), but never block the counter when offline.
async function commit(promise) {
  promise.catch((err) => console.error('Write failed', err));
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  await Promise.race([promise, new Promise((r) => setTimeout(r, 4000))]);
}

const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

// ---------- Inventory ----------

export async function createItem(allItems, f) {
  const name = (f.name || '').trim();
  if (!name) throw new Error('Name is required');
  const barcode = (f.barcode || '').trim() || nextBarcode(allItems);
  if (allItems.some((i) => i.isActive !== false && i.barcode === barcode)) {
    throw new Error(`Barcode ${barcode} already exists`);
  }
  const { db } = fb();
  const ref = doc(collection(db, 'categories'));
  await commit(setDoc(ref, {
    name,
    barcode,
    price: num(f.price),
    costPrice: num(f.costPrice),
    stockQty: Math.trunc(num(f.stockQty)),
    reorderLevel: f.reorderLevel === '' || f.reorderLevel == null ? 5 : Math.trunc(num(f.reorderLevel, 5)),
    vehicleType: (f.vehicleType || '').trim(),
    notes: (f.notes || '').trim(),
    isActive: true,
    createdAt: new Date().toISOString(),
  }));
  return barcode;
}

export async function updateItem(id, f) {
  const name = (f.name || '').trim();
  if (!name) throw new Error('Name is required');
  const { db } = fb();
  await commit(updateDoc(doc(db, 'categories', id), {
    name,
    price: num(f.price),
    costPrice: num(f.costPrice),
    reorderLevel: f.reorderLevel === '' ? 5 : Math.trunc(num(f.reorderLevel, 5)),
    vehicleType: (f.vehicleType || '').trim(),
    notes: (f.notes || '').trim(),
  }));
}

// Soft delete, so old invoices still point at a real item
export async function deleteItem(id) {
  const { db } = fb();
  await commit(updateDoc(doc(db, 'categories', id), { isActive: false }));
}

export async function adjustStock(item, change, reason) {
  if (!change) throw new Error('Quantity must not be 0');
  if (item.stockQty + change < 0) throw new Error('Stock cannot go below 0');
  const { db } = fb();
  const batch = writeBatch(db);
  batch.update(doc(db, 'categories', item.id), { stockQty: increment(change) });
  batch.set(doc(collection(db, 'stockAdjustments')), {
    categoryId: item.id,
    categoryName: item.name,
    changeQty: change,
    reason: (reason || '').trim(),
    createdAt: new Date().toISOString(),
  });
  await commit(batch.commit());
}

// ---------- Billing ----------

// Records the sale and lowers stock in ONE atomic batch. It uses increment(-qty)
// rather than "read stock, then write new stock", so it also works offline and
// merges correctly with sales made on other devices when everything syncs.
export async function createSale(items, cart, { discount, paymentMethod, customerName, createdBy }) {
  if (!cart.length) throw new Error('Cart is empty');

  const byId = new Map(items.map((i) => [i.id, i]));
  for (const line of cart) {
    const item = byId.get(line.categoryId);
    if (!item) throw new Error(`"${line.name}" no longer exists`);
    if (item.stockQty < line.quantity) {
      throw new Error(`Not enough stock for "${item.name}". Available: ${item.stockQty}`);
    }
  }

  const lines = cart.map((l) => ({
    categoryId: l.categoryId,
    name: l.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.quantity * l.unitPrice,
  }));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const disc = Math.max(0, discount || 0);
  if (disc > subtotal) throw new Error('Discount cannot be more than the subtotal');

  const now = new Date();
  const sale = {
    invoiceNo: newInvoiceNo(),
    items: lines,
    subtotal,
    discount: disc,
    totalAmount: subtotal - disc,
    paymentMethod: paymentMethod || 'Cash',
    customerName: customerName || '',
    createdBy: createdBy || '',
    createdAt: now.toISOString(),
    day: dayKey(now),
  };

  const { db } = fb();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'sales')), sale);
  for (const l of lines) {
    batch.update(doc(db, 'categories', l.categoryId), { stockQty: increment(-l.quantity) });
  }
  await commit(batch.commit());
  return sale;
}
