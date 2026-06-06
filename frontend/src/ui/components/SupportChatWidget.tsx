import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './SupportChatWidget.css';

type SupportMessage = {
  id: string;
  sessionId: string;
  from: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  messageType?: string;
};

type CustomerIdentity = {
  userId: string;
  email: string;
  fullName: string;
};

type SupportChatWidgetProps = {
  onRequireLogin: () => void;
};

export function SupportChatWidget({ onRequireLogin }: SupportChatWidgetProps) {
  const { userToken, userProfile } = useAuthStore();
  const identity = useMemo((): CustomerIdentity | null => {
    if (!userToken || !userProfile?.id || !userProfile?.email) return null;
    return {
      userId: userProfile.id,
      email: userProfile.email.toLowerCase(),
      fullName: userProfile.fullName?.trim() || userProfile.email,
    };
  }, [userToken, userProfile]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const sessionId = useMemo(() => {
    if (!identity) return '';
    return `user:${identity.userId}`;
  }, [identity]);

  // Auth state is now reactive via Zustand — no polling needed

  useEffect(() => {
    if (!identity || !sessionId) return;
    const base = getSocketBaseUrl();
    const s = io(`${base}/notifications`, {
      path: '/socket.io',
      transports: ['websocket'],
      query: {
        role: 'customer',
        sessionId,
        userId: identity.userId,
        email: identity.email,
        name: identity.fullName,
      },
    });
    setSocket(s);

    s.on('support:history', (history: SupportMessage[]) => {
      if (Array.isArray(history)) setMessages(history);
    });
    s.on('support:message', (msg: SupportMessage) => {
      if (!msg || msg.sessionId !== sessionId) return;
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      s.off('support:history');
      s.off('support:message');
      s.disconnect();
    };
  }, [identity, sessionId]);

  function sendMessage() {
    const clean = text.trim();
    if (!clean) return;
    if (!identity) {
      onRequireLogin();
      return;
    }
    if (!socket) return;
    socket.emit('support:customer:message', {
      sessionId,
      userId: identity.userId,
      email: identity.email,
      name: identity.fullName,
      text: clean,
    });
    setText('');
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="lb-support-fab" onClick={() => setOpen((v) => !v)}>
        <span className="lb-support-fab-dot" />
        Suport
      </button>

      {open && (
        <div className="lb-support-box" role="dialog" aria-label="Suport klienti">
          <div className="lb-support-head">
            <div className="lb-support-head-title">
              <strong>Suporti i klientit</strong>
              <span>{identity ? 'Online tani' : 'Duhet llogari për chat'}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Mbyll">
              ×
            </button>
          </div>
          <div className="lb-support-messages">
            {!identity ? (
              <div className="lb-support-auth-card">
                <p>Duhet të jesh log in për ta përdorur suportin dhe për të ruajtur historikun e bisedës.</p>
                <button type="button" onClick={onRequireLogin} className="lb-support-login-btn">
                  Hyr
                </button>
              </div>
            ) : messages.length === 0 ? (
              <p className="lb-support-empty">Na shkruani pyetjen tuaj, admini do t'ju pergjigjet ne kohe reale.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`lb-support-msg ${m.from === 'customer' ? 'me' : 'admin'} ${
                    m.messageType === 'automated_response' ? 'bot' : ''
                  }`}
                >
                  <small>{m.senderName}</small>
                  <span>{m.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="lb-support-input">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={identity ? 'Shkruaj mesazhin...' : 'Duhet të jesh i kyçur'}
              disabled={!identity}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button type="button" onClick={sendMessage}>
              Dergo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
