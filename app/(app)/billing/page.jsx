'use client';
import { useMemo, useRef, useState } from 'react';
import { useItems } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/ui';
import { money, fmtDateTime } from '@/lib/helpers';
import { createSale } from '@/lib/actions';
import Modal from '@/components/Modal';

export default function BillingPage() {
  const { items } = useItems();
  const { user } = useAuth();
  const toast = useToast();
  const scanRef = useRef(null);

  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [payment, setPayment] = useState('Cash');
  const [discount, setDiscount] = useState('0');
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return [];
    return items.filter((i) => i.name.toLowerCase().includes(v) || i.barcode.toLowerCase().includes(v)).slice(0, 8);
  }, [q, items]);

  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const disc = Math.max(0, parseFloat(discount) || 0);
  const total = Math.max(subtotal - disc, 0);

  function addToCart(item) {
    const existing = cart.find((c) => c.categoryId === item.id);
    if (existing) {
      if (existing.quantity + 1 > item.stockQty) return toast(`Only ${item.stockQty} in stock for ${item.name}`, 'error');
      setCart(cart.map((c) => (c.categoryId === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      if (item.stockQty < 1) return toast(`${item.name} is out of stock`, 'error');
      setCart([...cart, { categoryId: item.id, name: item.name, unitPrice: item.price, quantity: 1, maxStock: item.stockQty }]);
    }
    setQ('');
    scanRef.current?.focus();
  }

  function onScanKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = e.currentTarget.value.trim();
    if (!v) return;
    const exact = items.find((i) => i.barcode.toLowerCase() === v.toLowerCase());
    if (exact) addToCart(exact);
    else if (matches.length === 1) addToCart(matches[0]);
    else { toast(`No item found for "${v}"`, 'error'); setQ(''); }
  }

  function changeQty(id, delta) {
    const c = cart.find((x) => x.categoryId === id);
    const n = c.quantity + delta;
    if (n <= 0) return setCart(cart.filter((x) => x.categoryId !== id));
    if (n > c.maxStock) return toast(`Only ${c.maxStock} in stock`, 'error');
    setCart(cart.map((x) => (x.categoryId === id ? { ...x, quantity: n } : x)));
  }

  async function checkout() {
    if (!cart.length) return toast('Cart is empty', 'error');
    setBusy(true);
    try {
      const sale = await createSale(items, cart, {
        discount: disc, paymentMethod: payment, customerName: customer.trim(), createdBy: user?.email,
      });
      setReceipt(sale);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function newBill() {
    setCart([]); setDiscount('0'); setCustomer(''); setReceipt(null); setQ('');
    setTimeout(() => scanRef.current?.focus(), 0);
  }

  return (
    <>
      <h1 className="page-title">New Bill</h1>
      <p className="page-sub">Scan a barcode or search by name to add items to the cart</p>

      <div className="billing-layout">
        <div className="card">
          <div className="field">
            <label>Scan Barcode or Search Item</label>
            <input
              ref={scanRef} type="text" className="scan-box" autoFocus
              placeholder="Scan here, or type item name..."
              value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onScanKey}
            />
          </div>
          {matches.length > 0 && (
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, marginTop: -6, marginBottom: 14 }}>
              {matches.map((m) => (
                <div key={m.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                     onMouseDown={(e) => { e.preventDefault(); addToCart(m); }}>
                  <strong>{m.name}</strong>{' '}
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>({m.barcode}) · Stock: {m.stockQty} · {money(m.price)}</span>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: 14, color: 'var(--muted)', margin: '18px 0 6px' }}>Cart</h2>
          {cart.map((c) => (
            <div className="cart-item" key={c.categoryId}>
              <div>
                <div className="cart-item-name">{c.name}</div>
                <div className="cart-item-sub">{money(c.unitPrice)} each</div>
              </div>
              <div className="qty-control">
                <button onClick={() => changeQty(c.categoryId, -1)}>-</button>
                <span>{c.quantity}</span>
                <button onClick={() => changeQty(c.categoryId, 1)}>+</button>
                <button onClick={() => setCart(cart.filter((x) => x.categoryId !== c.categoryId))}
                        style={{ marginLeft: 8, color: '#c0392b', borderColor: '#f0c9c1' }}>✕</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="empty-state">Cart is empty. Scan an item to begin.</div>}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Bill Summary</h2>
          <div className="field"><label>Customer Name (optional)</label>
            <input type="text" placeholder="Walk-in customer" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
          <div className="field"><label>Payment Method</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>Cash</option><option>Card</option><option>Bank Transfer</option>
            </select></div>
          <div className="field"><label>Discount (Rs.)</label>
            <input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
          <div className="total-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="total-row"><span>Discount</span><span>{money(disc)}</span></div>
          <div className="total-row grand"><span>Total</span><span>{money(total)}</span></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  onClick={checkout} disabled={busy}>
            {busy ? 'Saving…' : 'Complete Sale'}
          </button>
        </div>
      </div>

      <Modal open={!!receipt} width={380}>
        {receipt && (
          <>
            <h2>Sale Completed ✓</h2>
            <div className="print-area" style={{ fontSize: 13.5 }}>
              <img
                src="/logo.jpeg"
                alt="Shop Logo"
                style={{
                  display: 'block',
                  margin: '0 auto 10px',
                  maxHeight: 80,
                  maxWidth: '60%',
                  objectFit: 'contain',
                  filter: 'invert(1)',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p><strong>Invoice:</strong> {receipt.invoiceNo}</p>
              <p><strong>Date:</strong> {fmtDateTime(receipt.createdAt)}</p>
              {receipt.customerName && <p><strong>Customer:</strong> {receipt.customerName}</p>}
              <p><strong>Payment:</strong> {receipt.paymentMethod}</p>
              <table style={{ margin: '10px 0' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((i) => (
                    <tr key={i.categoryId}>
                      <td>{i.name}</td>
                      <td style={{ textAlign: 'right' }}>{i.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{money(i.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{money(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="total-row"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div>
              <div className="total-row"><span>Discount</span><span>{money(receipt.discount)}</span></div>
              <div className="total-row grand"><span>Total</span><span>{money(receipt.totalAmount)}</span></div>
              <div style={{ borderTop: '1px dashed var(--line)', marginTop: 14, paddingTop: 10, textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>Thank you for choosing us. Have a great day!</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Tel: 071 385 6615 / 075 551 7736</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Haldummulla, Sri Lanka</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
              <button className="btn btn-primary" onClick={newBill}>New Bill</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
