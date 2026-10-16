'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ItemsProvider } from '@/lib/data';
import Shell from '@/components/Shell';

// Everything inside (app) requires a signed-in user.
export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <div className="empty-state" style={{ padding: 40 }}>Loading&hellip;</div>;

  return (
    <ItemsProvider>
      <Shell>{children}</Shell>
    </ItemsProvider>
  );
}
