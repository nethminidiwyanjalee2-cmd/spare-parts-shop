'use client';
import { useMemo } from 'react';
import { useItems, useSales } from '@/lib/data';
import { dayKey, daysAgo, money } from '@/lib/helpers';

export default function ReportsPage() {
  const { items } = useItems();
  const sales = useSales(daysAgo(45), dayKey());

  const { daily, top } = useMemo(() => {
    const list = sales || [];
    const since14 = daysAgo(14);
    const since30 = daysAgo(30);

    const byDay = {};
    list.filter((s) => s.day >= since14).forEach((s) => { byDay[s.day] = (byDay[s.day] || 0) + s.totalAmount; });
    const daily = Object.keys(byDay).sort().map((day) => ({ day, total: byDay[day] }));

    const byItem = {};
    list.filter((s) => s.day >= since30).forEach((s) => s.items.forEach((l) => {
      const e = (byItem[l.categoryId] ||= { name: l.name, qty: 0, revenue: 0 });
      e.qty += l.quantity; e.revenue += l.lineTotal;
    }));
    const top = Object.values(byItem).sort((a, b) => b.qty - a.qty).slice(0, 15);
    return { daily, top };
  }, [sales]);

  const maxVal = Math.max(1, ...daily.map((d) => d.total));
  const byValue = [...items].sort((a, b) => b.stockQty * b.price - a.stockQty * a.price);

  return (
    <>
      <h1 className="page-title">Reports</h1>
      <p className="page-sub">Sales trends and top-selling items</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>Daily Sales (last 14 days)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 210, paddingTop: 10 }}>
            {daily.length === 0 && <div className="empty-state">No sales data yet</div>}
            {daily.map((d) => (
         <div key={d.day} style={{ flex: '0 1 64px', minWidth: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
         <div title={money(d.total)} className="mini-chart-bar" style={{ width: '100%', height: Math.max(4, (d.total / maxVal) * 150) }} />
         <div style={{ fontSize: 10, color: 'var(--muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 40 }}>
        {new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
      </div>
    </div>
  ))}
</div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Top Selling Items (30 days)</h2>
          <table>
            <thead><tr><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {top.map((t) => <tr key={t.name}><td>{t.name}</td><td>{t.qty}</td><td>{money(t.revenue)}</td></tr>)}
            </tbody>
          </table>
          {top.length === 0 && <div className="empty-state">No sales yet.</div>}
        </div>
        <div className="card">
          <h2 style={{ fontSize: 15, marginTop: 0 }}>Current Stock Snapshot</h2>
          <table>
            <thead><tr><th>Item</th><th>Stock</th><th>Value</th></tr></thead>
            <tbody>
              {byValue.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.stockQty}</td><td>{money(i.stockQty * i.price)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
