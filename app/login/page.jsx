'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { fb } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, error: configError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/'); }, [loading, user, router]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(fb().auth, email.trim(), password);
      router.replace('/');
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setError(
        offline ? 'You are offline. The first login on a device needs internet.'
        : ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(err.code)
          ? 'Incorrect email or password'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div className="brand-mark">SP</div>
          <div>
            <div style={{ fontWeight: 700 }}>Spare Parts</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Shop Manager</div>
          </div>
        </div>
        {(error || configError) && <div className="error-msg">{error || configError}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
