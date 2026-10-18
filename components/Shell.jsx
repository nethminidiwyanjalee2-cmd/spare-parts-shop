'use client';
import { useState, useEffect } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); // phone menu (slide-in drawer)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sp_sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      } else if (window.innerWidth < 900) {
        setCollapsed(true);
      }
    } catch {
      // LocalStorage access may fail in restricted environments
    }

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          setCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem('sp_sidebar_collapsed', String(next));
            } catch {}
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close the phone menu whenever you go to another page
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  function toggleSidebar() {
    // On a phone the sidebar is a drawer, so the collapse feature is not used
    if (window.matchMedia('(max-width: 768px)').matches) return;
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sp_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  async function logout() {
    await signOut(fb().auth);
    router.replace('/login');
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Phone only: top bar with the menu button */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
        >
          &#9776;
        </button>
        <div className="mobile-topbar-title">Gamage Motors</div>
      </header>

      {/* Phone only: dark layer behind the open menu, tap to close */}
      <div
        className={`mobile-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="brand"
            onClick={collapsed ? toggleSidebar : undefined}
            role={collapsed ? 'button' : undefined}
            tabIndex={collapsed ? 0 : undefined}
            aria-label={collapsed ? 'Expand sidebar' : undefined}
            onKeyDown={
              collapsed
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSidebar();
                    }
                  }
                : undefined
            }
            style={{ cursor: collapsed ? 'pointer' : 'default' }}
          >
            <div className="brand-mark" title="Gamage Motors">
              GM
            </div>
            <div className="brand-info" style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
              <div className="brand-title" style={{ fontSize: '14px', fontWeight: '600' }}>
                Gamage
              </div>
              <div className="brand-title" style={{ fontSize: '14px', fontWeight: '600' }}>
                Motors
              </div>
            </div>
          </div>

          {/* Desktop: collapse / expand */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {collapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>

          {/* Phone: close the menu */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            &#10005;
          </button>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link ${path === n.href ? 'active' : ''}`}
              data-tooltip={n.label}
              aria-label={n.label}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/change-password"
            className={`nav-link ${path === '/change-password' ? 'active' : ''}`}
            data-tooltip="Change Password"
            aria-label="Change Password"
          >
            <span className="nav-icon">&#9881;</span>
            <span className="nav-label">Change Password</span>
          </Link>
          <button
            type="button"
            className="nav-link"
            onClick={logout}
            data-tooltip="Log Out"
            aria-label="Log Out"
          >
            <span className="nav-icon">&#128274;</span>
            <span className="nav-label">Log Out</span>
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