import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { API_BASE, authHeaders, getSocketBaseUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AdminSkeleton } from './components/AdminSkeleton';
import './admin.css';

type SupportMessage = {
  id: string;
  sessionId: string;
  from: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
  isReplied?: boolean;
  messageType?: string;
};

type SupportSession = {
  sessionId: string;
  customerUserId?: string;
  customerEmail?: string;
  customerName: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export function AdminSupportPage() {
  const [params] = useSearchParams();
  const activeTab = params.get('tab') === 'contact' ? 'contact' : 'support';
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [loadingSupport, setLoadingSupport] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [contactRows, setContactRows] = useState<
    { id: string; customerName: string; customerEmail?: string; status?: string; updatedAt?: string; messages: { id: string; text: string; createdAt?: string; isRead?: boolean; isReplied?: boolean }[] }[]
  >([]);
  const [loadingContact, setLoadingContact] = useState(true);
  const [activeContact, setActiveContact] = useState('');
  const [supportFilter, setSupportFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  const [contactFilter, setContactFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  const adminUser  = useAuthStore((s) => s.adminUser);
  const adminToken = useAuthStore((s) => s.adminToken);
  const adminName  = useMemo(
    () => adminUser?.fullName || adminUser?.email || 'Admin',
    [adminUser],
  );

  useEffect(() => {
    const base = getSocketBaseUrl();
    const s = io(`${base}/notifications`, {
      path: '/socket.io',
      transports: ['websocket'],
      query: { role: 'admin', token: adminToken ?? '' },
    });
    setSocket(s);

    s.on('support:sessions', (rows: SupportSession[]) => {
      if (!Array.isArray(rows)) return;
      setSessions(rows);
      setSelectedId((prev) => prev || rows[0]?.sessionId || '');
      setLoadingSupport(false);
    });

    s.on('support:message', (msg: SupportMessage) => {
      if (!msg) return;
      setSessions((prev) => {
        const idx = prev.findIndex((x) => x.sessionId === msg.sessionId);
        if (idx < 0) {
          return [
            {
              sessionId: msg.sessionId,
              customerName: msg.from === 'customer' ? msg.senderName : 'Klient',
              updatedAt: msg.createdAt,
              messages: [msg],
            },
            ...prev,
          ];
        }
        const next = [...prev];
        const row = next[idx];
        next[idx] = {
          ...row,
          updatedAt: msg.createdAt,
          messages: [...row.messages, msg],
        };
        next.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        return next;
      });
    });

    return () => {
      s.off('support:sessions');
      s.off('support:message');
      s.disconnect();
    };
  }, [adminToken]);

  useEffect(() => {
    const loadContact = async () => {
      try {
        const res = await axios.get(`${API_BASE}/contact`, { headers: authHeaders() });
        setContactRows(Array.isArray(res.data) ? res.data : []);
        setActiveContact((prev) => prev || res.data?.[0]?.id || '');
      } catch {
        setContactRows([]);
      } finally {
        setLoadingContact(false);
      }
    };
    void loadContact();
  }, []);

  const selected = sessions.find((s) => s.sessionId === selectedId);
  const selectedContact = contactRows.find((row) => row.id === activeContact);

  const filteredSupportSessions = sessions.filter((s) => {
    const lastCustomer = [...s.messages].reverse().find((m) => m.from === 'customer');
    if (!lastCustomer) return supportFilter === 'all';
    if (supportFilter === 'unread') return !lastCustomer.isRead;
    if (supportFilter === 'read') return !!lastCustomer.isRead;
    if (supportFilter === 'replied') return !!lastCustomer.isReplied;
    return true;
  });
  const filteredContactRows = contactRows.filter((row) => {
    if (contactFilter === 'all') return true;
    return row.status === contactFilter;
  });

  function sendReply() {
    const clean = text.trim();
    if (!clean || !socket || !selectedId) return;
    socket.emit('support:admin:message', {
      sessionId: selectedId,
      adminName,
      text: clean,
    });
    setText('');
  }

  async function markSupportRead(id: string) {
    try {
      await axios.patch(`${API_BASE}/support/${id}/read`, {}, { headers: authHeaders() });
    } catch {
      return;
    }
  }

  async function markContactRead(id: string) {
    try {
      await axios.patch(`${API_BASE}/contact/${id}/read`, {}, { headers: authHeaders() });
      const fresh = await axios.get(`${API_BASE}/contact`, { headers: authHeaders() });
      setContactRows(Array.isArray(fresh.data) ? fresh.data : []);
    } catch {
      return;
    }
  }

  async function markAllSupportRead() {
    try {
      await axios.patch(`${API_BASE}/support/read-all`, {}, { headers: authHeaders() });
    } catch {
      return;
    }
  }

  async function markAllContactRead() {
    try {
      await axios.patch(`${API_BASE}/contact/read-all`, {}, { headers: authHeaders() });
      const fresh = await axios.get(`${API_BASE}/contact`, { headers: authHeaders() });
      setContactRows(Array.isArray(fresh.data) ? fresh.data : []);
    } catch {
      return;
    }
  }

  async function clearReadSupport() {
    try {
      await axios.delete(`${API_BASE}/support/read`, { headers: authHeaders() });
    } catch {
      return;
    }
  }

  async function clearReadContact() {
    try {
      await axios.delete(`${API_BASE}/contact/read`, { headers: authHeaders() });
      const fresh = await axios.get(`${API_BASE}/contact`, { headers: authHeaders() });
      setContactRows(Array.isArray(fresh.data) ? fresh.data : []);
    } catch {
      return;
    }
  }

  return (
    <div>
      <h1>Support i klientëve</h1>
      {activeTab === 'contact' ? (
      <div className="admin-card" style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Mesazhet Contact</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={contactFilter} onChange={(e) => setContactFilter(e.target.value as typeof contactFilter)}>
              <option value="all">Të gjitha</option>
              <option value="unread">Të palexuara</option>
              <option value="read">Të lexuara</option>
              <option value="replied">Të përgjigjuara</option>
            </select>
            <button type="button" className="btn secondary" onClick={markAllContactRead}>Shëno të gjitha si të lexuara</button>
            <button type="button" className="btn danger" onClick={clearReadContact}>Fshij të lexuarat</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 10 }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'auto', maxHeight: 260 }}>
            {loadingContact ? <AdminSkeleton lines={4} /> : filteredContactRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setActiveContact(row.id);
                  void markContactRead(row.id);
                }}
                style={{
                  width: '100%',
                  padding: 10,
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid #e2e8f0',
                  background: activeContact === row.id ? '#ecfdf5' : row.status === 'unread' ? '#eff6ff' : '#fff',
                  fontWeight: row.status === 'unread' ? 700 : 500,
                }}
              >
                <strong style={{ display: 'block' }}>{row.status === 'unread' ? '🔵 ' : row.status === 'replied' ? '✅ ' : ''}{row.customerName}</strong>
                <small>{row.customerEmail || '-'}</small>
              </button>
            ))}
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'grid', gap: 10 }}>
            {loadingContact ? (
              <AdminSkeleton lines={5} />
            ) : !selectedContact ? (
              <p style={{ margin: 0 }}>Zgjidh një mesazh.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{selectedContact.customerName}</p>
                  <p style={{ margin: 0, color: '#334155' }}>{selectedContact.customerEmail || '-'}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                    {selectedContact.messages?.[0]?.createdAt
                      ? new Date(selectedContact.messages[0].createdAt).toLocaleString('sq-AL')
                      : selectedContact.updatedAt
                        ? new Date(selectedContact.updatedAt).toLocaleString('sq-AL')
                        : '-'}
                  </p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Statusi:{' '}
                    <strong>
                      {selectedContact.status === 'unread'
                        ? 'i palexuar'
                        : selectedContact.status === 'replied'
                          ? 'i përgjigjuar'
                          : 'i lexuar'}
                    </strong>
                  </p>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#f8fafc' }}>
                  <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: 15 }}>
                    {selectedContact.messages?.[0]?.text || '-'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      ) : null}
      {activeTab === 'support' ? (
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '12px 12px 0' }}>
          <h2 style={{ margin: 0 }}>Live Support</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={supportFilter} onChange={(e) => setSupportFilter(e.target.value as typeof supportFilter)}>
              <option value="all">Të gjitha</option>
              <option value="unread">Të palexuara</option>
              <option value="read">Të lexuara</option>
              <option value="replied">Të përgjigjuara</option>
            </select>
            <button type="button" className="btn secondary" onClick={markAllSupportRead}>Shëno të gjitha si të lexuara</button>
            <button type="button" className="btn danger" onClick={clearReadSupport}>Fshij të lexuarat</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 520 }}>
          <aside style={{ borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
            {loadingSupport ? (
              <div style={{ padding: 14 }}><AdminSkeleton lines={6} /></div>
            ) : filteredSupportSessions.length === 0 ? (
              <p style={{ padding: 14, margin: 0, color: '#64748b' }}>Nuk ka biseda akoma.</p>
            ) : (
              filteredSupportSessions.map((s) => {
                const lastCustomer = [...s.messages].reverse().find((m) => m.from === 'customer');
                const unread = !!lastCustomer && !lastCustomer.isRead;
                const replied = !!lastCustomer?.isReplied;
                return (
                <button
                  key={s.sessionId}
                  type="button"
                  onClick={() => {
                    setSelectedId(s.sessionId);
                    if (lastCustomer?.id) void markSupportRead(lastCustomer.id);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #e2e8f0',
                    background: selectedId === s.sessionId ? '#ecfdf5' : unread ? '#eff6ff' : '#fff',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: unread ? 700 : 500,
                  }}
                >
                  <strong style={{ display: 'block' }}>
                    {unread ? '🔵 ' : replied ? '✅ ' : ''}
                    {s.customerName || 'Klient'}
                  </strong>
                  <span style={{ display: 'block', fontSize: 12, color: '#334155' }}>
                    {s.customerEmail || 'pa-email'}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(s.updatedAt).toLocaleString('sq-AL')}
                  </span>
                </button>
              )})
            )}
          </aside>
          <section style={{ display: 'grid', gridTemplateRows: '1fr auto' }}>
            <div style={{ padding: 14, overflowY: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
              {!selected ? (
                <p style={{ color: '#64748b' }}>Zgjidh një bisedë për të përgjigjur.</p>
              ) : (
                selected.messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      maxWidth: '80%',
                      marginLeft: m.from === 'admin' ? 'auto' : 0,
                      background: m.from === 'admin' ? '#ecfeff' : '#f8fafc',
                      borderRadius: 10,
                      padding: '8px 10px',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 12 }}>{m.senderName}</strong>
                    <span>{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', padding: 10, display: 'flex', gap: 8 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Shkruaj përgjigjen..."
                style={{ flex: 1, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
              />
              <button type="button" className="btn" onClick={sendReply} disabled={!selectedId}>
                Dërgo
              </button>
            </div>
          </section>
        </div>
      </div>
      ) : null}
    </div>
  );
}
