'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [t, setT] = useState({ msg: '', type: '', show: false });
  const timer = useRef();
  const toast = useCallback((msg, type = '') => {
    setT({ msg, type, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT((p) => ({ ...p, show: false })), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast ${t.show ? 'show' : ''} ${t.type}`}>{t.msg}</div>
    </ToastCtx.Provider>
  );
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}
