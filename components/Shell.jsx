'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { fb } from '@/lib/firebase';
import { useOnline } from '@/lib/ui';

const NAV = [
  { href: '/', label: 'Dashboard', icon: '\u25A0' },
  { href: '/billing', label: 'New Bill', icon: '\u{1F4B3}' },
  { href: '/inventory', label: 'Inventory', icon: '\u{1F4E6}' },
  { href: '/sales', label: 'Sales History', icon: '\u{1F4CB}' },
  { href: '/reports', label: 'Reports', icon: '\u{1F4C8}' },
];

export default function Shell({ children }) {
  const path = usePathname();
  const router = useRouter();
  const online = useOnline();

  async function logout() {
    await signOut(fb().auth);
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SP</div>
          <div>
            <div className="brand-title">Spare Parts</div>
            <div className="brand-sub">Shop Manager</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link ${path === n.href ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #3a4150' }}>
          <Link href="/change-password" className={`nav-link ${path === '/change-password' ? 'active' : ''}`}>
            <span className="nav-icon">&#9881;</span> Change Password
          </Link>
          <button className="nav-link" onClick={logout}>
            <span className="nav-icon">&#128274;</span> Log Out
          </button>
        </div>
      </aside>
      <main className="main">
        {!online && (
          <div className="offline-banner">
            You are offline. You can keep selling and adding stock &mdash; everything is saved on this device
            and will sync automatically when the internet is back.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
