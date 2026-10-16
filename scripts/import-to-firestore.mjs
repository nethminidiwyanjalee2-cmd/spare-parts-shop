// Step 2 of migrating from the old Python app: load scripts/data.json into Firestore.
//   npm install --no-save firebase-admin
//   (download a service account key from Firebase Console > Project settings >
//    Service accounts > Generate new private key, save it as ./serviceAccount.json)
//   node scripts/import-to-firestore.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const key = JSON.parse(readFileSync(new URL('../serviceAccount.json', import.meta.url)));
const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
initializeApp({ credential: cert(key) });
const db = getFirestore();
const writer = db.bulkWriter();

const iso = (s) => new Date(String(s).replace(' ', 'T')).toISOString(); // old app stored local time
const idMap = new Map();

for (const c of data.categories) {
  const ref = db.collection('categories').doc();
  idMap.set(c.id, ref.id);
  writer.set(ref, {
    name: c.name, barcode: c.barcode, price: c.price, costPrice: c.cost_price,
    stockQty: c.stock_qty, reorderLevel: c.reorder_level, vehicleType: c.vehicle_type || '',
    notes: c.notes || '', isActive: !!c.is_active, createdAt: iso(c.created_at),
  });
}

for (const s of data.sales) {
  const items = data.sale_items.filter((i) => i.sale_id === s.id).map((i) => ({
    categoryId: idMap.get(i.category_id) || '', name: i.category_name,
    quantity: i.quantity, unitPrice: i.unit_price, lineTotal: i.line_total,
  }));
  writer.set(db.collection('sales').doc(), {
    invoiceNo: s.invoice_no, items, subtotal: s.total_amount + s.discount, discount: s.discount,
    totalAmount: s.total_amount, paymentMethod: s.payment_method, customerName: s.customer_name || '',
    createdBy: 'imported', createdAt: iso(s.created_at), day: String(s.created_at).slice(0, 10),
  });
}

for (const a of data.stock_adjustments) {
  writer.set(db.collection('stockAdjustments').doc(), {
    categoryId: idMap.get(a.category_id) || '', changeQty: a.change_qty,
    reason: a.reason || '', createdAt: iso(a.created_at),
  });
}

await writer.close();
console.log(`Imported ${data.categories.length} items, ${data.sales.length} sales.`);
