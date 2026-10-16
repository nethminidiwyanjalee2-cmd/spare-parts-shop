'use client';
import { useState } from 'react';
import { useSales } from '@/lib/data';
import { daysAgo, dayKey, fmtDateTime, money } from '@/lib/helpers';
import Modal from '@/components/Modal';

export default function SalesPage() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(dayKey());
  const [detail, setDetail] = useState(null);
  const sales = useSales(from || '0000-00-00', to || '9999-12-31');
  const list = (sales || []).slice(0, 200);

  return (
    <>
      <h1 className="page-title">Sales History</h1>
      <p className="page-sub">Browse and inspect past invoices</p>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Invoice</th><th>Date/Time</th><th>Customer</th><th>Payment</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.invoiceNo}</strong></td>
                <td>{fmtDateTime(s.createdAt)}</td>
                <td>{s.customerName || '—'}</td>
                <td>{s.paymentMethod}</td>
                <td>{money(s.totalAmount)}</td>
                <td><button className="btn btn-sm btn-secondary" onClick={() => setDetail(s)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales && list.length === 0 && <div className="empty-state">No sales recorded for this period.</div>}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} width={420}>
        {detail && (
          <>
            <h2>{detail.invoiceNo}</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {fmtDateTime(detail.createdAt)} · {detail.paymentMethod}{detail.customerName ? ` · ${detail.customerName}` : ''}
            </p>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
              <tbody>
                {detail.items.map((i, idx) => (
                  <tr key={idx}><td>{i.name}</td><td>{i.quantity}</td><td>{money(i.lineTotal)}</td></tr>
                ))}
              </tbody>
            </table>
            {detail.discount > 0 && <div className="total-row"><span>Discount</span><span>{money(detail.discount)}</span></div>}
            <div className="total-row grand"><span>Total</span><span>{money(detail.totalAmount)}</span></div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button></div>
          </>
        )}
      </Modal>
    </>
  );
}
