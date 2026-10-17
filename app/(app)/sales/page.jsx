'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSales } from '@/lib/data';
import { daysAgo, dayKey, monthStart, fmtDateTime, money } from '@/lib/helpers';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 20;

function getMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return dayKey(d);
}

export default function SalesPage() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(dayKey());
  const [detail, setDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const sales = useSales(from || '0000-00-00', to || '9999-12-31');

  // Reset page when filter dates change
  useEffect(() => {
    setCurrentPage(1);
  }, [from, to]);

  const allSales = sales || [];
  const totalBills = allSales.length;
  const totalAmount = allSales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

  const totalPages = Math.max(1, Math.ceil(totalBills / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSales = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return allSales.slice(start, start + PAGE_SIZE);
  }, [allSales, safeCurrentPage]);

  const today = dayKey();
  const monday = getMonday();
  const thisMonth = monthStart();

  const isToday = from === today && to === today;
  const isThisWeek = from === monday && to === today;
  const isThisMonth = from === thisMonth && to === today;

  return (
    <>
      <h1 className="page-title">Sales History</h1>
      <p className="page-sub">Browse and inspect past invoices</p>

      <div className="toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            type="button"
            className={isToday ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => {
              const t = dayKey();
              setFrom(t);
              setTo(t);
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={isThisWeek ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => {
              setFrom(getMonday());
              setTo(dayKey());
            }}
          >
            This Week
          </button>
          <button
            type="button"
            className={isThisMonth ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => {
              setFrom(monthStart());
              setTo(dayKey());
            }}
          >
            This Month
          </button>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 14 }}>
          {totalBills} {totalBills === 1 ? 'bill' : 'bills'} · Total: <strong>{money(totalAmount)}</strong>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Invoice</th><th>Date/Time</th><th>Customer</th><th>Payment</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {paginatedSales.map((s) => (
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
        {sales && allSales.length === 0 && <div className="empty-state">No sales recorded for this period.</div>}
        {sales && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalBills}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
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
