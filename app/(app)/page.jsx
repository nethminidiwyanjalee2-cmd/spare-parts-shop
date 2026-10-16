'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useItems, useSales } from '@/lib/data';
import { dayKey, daysAgo, monthStart, money } from '@/lib/helpers';

export default function Dashboard() {
  const { items } = useItems();
  const sales = useSales(daysAgo(45), dayKey());

  const stats = useMemo(() => {
    const today = dayKey();
    const month = monthStart();
    const list = sales || [];
    return {
      today: list.filter((s) => s.day === today).reduce((t, s) => t + s.totalAmount, 0),
      month: list.filter((s) => s.day >= month).reduce((t, s) => t + s.totalAmount, 0),
      count: list.filter((s) => s.day === today).length,
      stockValue: items.reduce((t, i) => t + i.stockQty * i.price, 0),
    };
  }, [sales, items]);

  const low = items.filter((i) => i.stockQty <= i.reorderLevel).sort((a, b) => a.stockQty - b.stockQty);

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Overview of today&apos;s business and stock health</p>

      <div className="grid-4">
        <div className="stat-card"><div className="stat-label">Today&apos;s Sales</div><div className="stat-value accent">{money(stats.today)}</div></div>
        <div className="stat-card"><div className="stat-label">This Month</div><div className="stat-value">{money(stats.month)}</div></div>
        <div className="stat-card"><div className="stat-label">Bills Today</div><div className="stat-value green">{stats.count}</div></div>
        <div className="stat-card"><div className="stat-label">Stock Value</div><div className="stat-value amber">{money(stats.stockValue)}</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Low Stock Alerts</h2>
          {low.length === 0 ? (
            <div className="empty-state">All items are well stocked 👍</div>
          ) : (
            <table>
              <thead><tr><th>Item</th><th>In Stock</th><th>Reorder Level</th></tr></thead>
              <tbody>
                {low.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td><span className="badge badge-red">{i.stockQty}</span></td>
                    <td>{i.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/billing" className="btn btn-primary">+ Create New Bill</Link>
            <Link href="/inventory" className="btn btn-secondary">Manage Inventory / Add Item</Link>
            <Link href="/reports" className="btn btn-secondary">View Sales Reports</Link>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 16 }}>
            Tip: plug in a USB barcode scanner and it will type directly into the billing screen — no extra setup needed.
          </p>
        </div>
      </div>
    </>
  );
}
