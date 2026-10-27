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
            {/* <h2 className="no-print">Sale Completed ✓</h2> */}

            {/* Thermal Print Area */}
            <div className="print-area thermal-slip">
              {<img
                src="/logo2.jpg"
                alt="Shop Logo"
                style={{
                  display: 'block',
                  margin: '0 auto 6px',
                  maxHeight: 130,
                  maxWidth: '120%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />}
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span><strong>INV:</strong> #{receipt.invoiceNo}</span>
                <span>{fmtDateTime(receipt.createdAt)}</span>
              </div>
              {receipt.customerName && (
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  <strong>CUST:</strong> {receipt.customerName}
                </div>
              )}
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                <strong>PAYMENT:</strong> {receipt.paymentMethod}
              </div>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '3px' }}>Item</th>
                    <th style={{ textAlign: 'right', paddingBottom: '3px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '3px' }}>Price</th>
                    <th style={{ textAlign: 'right', paddingBottom: '3px' }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((i) => (
                    <tr key={i.categoryId}>
                      <td style={{ paddingTop: '3px', paddingBottom: '3px' }}>{i.name}</td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{i.quantity}</td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{money(i.unitPrice)}</td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{money(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Subtotal</span>
                <span>{money(receipt.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Discount</span>
                <span>{money(receipt.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '3px' }}>
                <span>TOTAL</span>
                <span>{money(receipt.totalAmount)}</span>
              </div>

              <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '6px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>Thank you for choosing us!</div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>Tel: 075 092 8684 / 076 909 4427 / 071 385 6615</div>
                <div style={{ fontSize: '10px' }}>Haldummulla, Sri Lanka</div>
              </div>
            </div>

            <div className="modal-actions no-print" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
              <button className="btn btn-primary" onClick={newBill}>New Bill</button>
            </div>
          </>
        )}
      </Modal>

      {/* Global CSS Force for 80mm Thermal Printer */}
      <style jsx global>{`
        @media print {
          /* Receipt එක හැර අන් සියල්ල Hide කිරීම */
          body * {
            visibility: hidden !important;
          }
          
          /* Thermal Slip එක විතරක් Visible කිරීම */
          .thermal-slip, .thermal-slip * {
            visibility: visible !important;
          }

          /* Thermal Slip Layout Force කිරීම */
          .thermal-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            max-width: 78mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            font-family: 'Courier New', Courier, monospace !important;
            color: #000 !important;
            background: #fff !important;
          }

          /* Force all text inside the receipt to be full black */
          .thermal-slip *, .thermal-slip *::before, .thermal-slip *::after {
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Buttons, Headings Hide කිරීම */
          .no-print {
            display: none !important;
          }

          /* Page Size එක Code එකෙන්ම 80mm වලට Force කිරීම */
          @page {
            size: 80mm auto !important;
            margin: 0mm !important;
          }
        }
      `}</style>
    </>
  );
}