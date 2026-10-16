'use client';
import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { fb } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState({ error: '', success: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (f.next.length < 6) return setMsg({ error: 'New password must be at least 6 characters', success: '' });
    if (f.next !== f.confirm) return setMsg({ error: 'New passwords do not match', success: '' });
    try {
      const cred = EmailAuthProvider.credential(user.email, f.current);
      await reauthenticateWithCredential(fb().auth.currentUser, cred);
      await updatePassword(fb().auth.currentUser, f.next);
      setF({ current: '', next: '', confirm: '' });
      setMsg({ error: '', success: 'Password updated successfully' });
    } catch (err) {
      setMsg({
        error: ['auth/invalid-credential', 'auth/wrong-password'].includes(err.code)
          ? 'Current password is incorrect'
          : err.message,
        success: '',
      });
    }
  }

  return (
    <>
      <h1 className="page-title">Change Password</h1>
      <p className="page-sub">Update your login password (needs internet)</p>
      <div className="card" style={{ maxWidth: 400 }}>
        {msg.error && <div className="error-msg">{msg.error}</div>}
        {msg.success && <div className="success-msg">{msg.success}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Current Password</label>
            <input type="password" value={f.current} onChange={set('current')} required /></div>
          <div className="field"><label>New Password</label>
            <input type="password" value={f.next} onChange={set('next')} required minLength={6} /></div>
          <div className="field"><label>Confirm New Password</label>
            <input type="password" value={f.confirm} onChange={set('confirm')} required minLength={6} /></div>
          <button type="submit" className="btn btn-primary">Update Password</button>
        </form>
      </div>
    </>
  );
}
