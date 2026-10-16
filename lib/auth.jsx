'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { fb } from './firebase';

const AuthCtx = createContext({ user: null, loading: true, error: '' });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });

  useEffect(() => {
    try {
      // Firebase remembers the signed-in user on this device, so this also
      // works when the shop is offline.
      return onAuthStateChanged(fb().auth, (user) => setState({ user, loading: false, error: '' }));
    } catch (e) {
      setState({ user: null, loading: false, error: e.message });
    }
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
