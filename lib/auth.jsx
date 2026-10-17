'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { fb } from './firebase';

const AuthCtx = createContext({ user: null, loading: true, error: '', isManager: false });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(fb().auth, (user) => setState({ user, loading: false, error: '' }));
    } catch (e) {
      setState({ user: null, loading: false, error: e.message });
    }
  }, []);

  // Only people with a users/<uid> document saying role = "manager" get manager
  // powers. Everyone else is an employee.
  const uid = state.user?.uid;
  useEffect(() => {
    if (!uid) { setIsManager(false); return; }
    const { db } = fb();
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => setIsManager(snap.exists() && snap.data().role === 'manager'),
      () => setIsManager(false)
    );
  }, [uid]);

  return <AuthCtx.Provider value={{ ...state, isManager }}>{children}</AuthCtx.Provider>;
}