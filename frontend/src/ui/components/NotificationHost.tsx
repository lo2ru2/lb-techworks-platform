import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getSocketBaseUrl } from '../lib/api';
import { useNotifications } from '../store/NotificationContext';
import { useAuthStore } from '../store/authStore';
import './NotificationHost.css';

export function NotificationHost() {
  const { push, items, dismiss } = useNotifications();
  const userProfile  = useAuthStore((s) => s.userProfile);
  const isAdminSession = useAuthStore((s) => !!s.adminToken);

  useEffect(() => {
    if (!isAdminSession) return;
    const base   = getSocketBaseUrl();
    const userId = userProfile?.id;

    const socket = io(`${base}/notifications`, {
      path: '/socket.io',
      transports: ['websocket'],
      query: userId ? { userId } : {},
    });

    socket.on('notification', (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const o = payload as { title?: unknown; body?: unknown; message?: unknown };
      if (typeof o.title !== 'string') return;
      push({
        title: o.title,
        body: typeof (o.body ?? o.message) === 'string' ? String(o.body ?? o.message) : '',
      });
    });

    return () => {
      socket.off('notification');
      socket.disconnect();
    };
  }, [isAdminSession, userProfile?.id, push]);

  if (!isAdminSession) return null;

  return (
    <div className="lb-toast-host" aria-live="polite">
      {items.map((n) => (
        <button key={n.id} type="button" className="lb-toast" onClick={() => dismiss(n.id)}>
          <strong>{n.title}</strong>
          <span>{n.body}</span>
        </button>
      ))}
    </div>
  );
}
