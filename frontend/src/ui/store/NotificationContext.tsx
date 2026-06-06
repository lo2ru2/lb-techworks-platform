import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastNotif = { id: string; title: string; body: string; at: number };

type NotificationState = {
  items: ToastNotif[];
  push: (p: { title: string; body: string }) => void;
  dismiss: (id: string) => void;
};

const NotificationCtx = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastNotif[]>([]);

  const push = useCallback((p: { title: string; body: string }) => {
    setItems((s) =>
      [
        { id: crypto.randomUUID(), title: p.title, body: p.body, at: Date.now() },
        ...s,
      ].slice(0, 15),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((s) => s.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ items, push, dismiss }), [items, push, dismiss]);
  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>;
}

export function useNotifications() {
  const v = useContext(NotificationCtx);
  if (!v) throw new Error('useNotifications duhet te perdoret brenda NotificationProvider');
  return v;
}

