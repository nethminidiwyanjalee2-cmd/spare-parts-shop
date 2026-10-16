'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { fb } from './firebase';

const ItemsCtx = createContext({ items: [], allItems: [], ready: false });
export const useItems = () => useContext(ItemsCtx);

// One live listener for the whole inventory. Because the list is small, every
// page (search, barcode scan, reports) reads from this in-memory copy, which is
// also what makes everything work offline.
export function ItemsProvider({ children }) {
  const [allItems, setAll] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { db } = fb();
    return onSnapshot(
      collection(db, 'categories'),
      (snap) => { setAll(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setReady(true); },
      (err) => console.error('Items listener error', err)
    );
  }, []);

  const items = useMemo(
    () => allItems.filter((i) => i.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [allItems]
  );

  return <ItemsCtx.Provider value={{ items, allItems, ready }}>{children}</ItemsCtx.Provider>;
}

// Live list of sales between two days (YYYY-MM-DD, inclusive), newest first.
// Returns null while loading.
export function useSales(fromDay, toDay) {
  const [sales, setSales] = useState(null);

  useEffect(() => {
    const { db } = fb();
    const q = query(collection(db, 'sales'), where('day', '>=', fromDay), where('day', '<=', toDay));
    return onSnapshot(
      q,
      (snap) =>
        setSales(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        ),
      (err) => { console.error('Sales listener error', err); setSales([]); }
    );
  }, [fromDay, toDay]);

  return sales;
}
