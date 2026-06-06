import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE, userAuthHeaders } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type Me = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: string;
  createdAt: string;
};

type MyOrder = {
  id: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  createdAt: string;
  items?: { id: string; quantity: number; unitPriceCents: number; product?: { name?: string | null } | null }[];
  address?: { line1?: string | null } | null;
};

export function AccountPage() {
  const nav = useNavigate();
  const { userToken, updateUserProfile, logoutUser } = useAuthStore();
  const [params] = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const activeTab = params.get('tab') === 'orders' ? 'orders' : 'profile';

  useEffect(() => {
    if (!userToken) {
      nav('/login', { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/users/me`, { headers: userAuthHeaders() });
        setMe(res.data);
        updateUserProfile(res.data);
        if (activeTab === 'orders') {
          const ordersRes = await axios.get(`${API_BASE}/orders/me`, { headers: userAuthHeaders() });
          setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        }
      } catch {
        setErr('Sesioni skadoi ose nuk je i kyçur.');
        logoutUser();
        nav('/login', { replace: true });
      }
    })();
  }, [activeTab, nav, userToken, updateUserProfile, logoutUser]);

  function logout() {
    logoutUser();
    nav('/');
  }

  async function saveProfile() {
    if (!me) return;
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/users/me`,
        { fullName: me.fullName, email: me.email, phone: me.phone ?? '' },
        { headers: userAuthHeaders() },
      );
      setMe(res.data);
      updateUserProfile(res.data);
      alert('Profili u përditësua.');
    } catch {
      alert('Dështoi ruajtja e profilit.');
    } finally {
      setSaving(false);
    }
  }

  if (!me && !err) return <section className="section-p1"><p>Duke ngarkuar…</p></section>;

  return (
    <section className="section-p1" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>LLOGARIA IME</span>
            <h2 style={{ marginTop: 6 }}>{activeTab === 'orders' ? 'Porositë e Mia' : 'Profili Im'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/account" className={`btn ${activeTab === 'profile' ? '' : 'secondary'}`}>Profili Im</Link>
            <Link to="/account?tab=orders" className={`btn ${activeTab === 'orders' ? '' : 'secondary'}`}>Porositë e Mia</Link>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          {activeTab === 'profile' ? (
              <div style={{ display: 'grid', gap: 10, maxWidth: 600 }}>
                <input value={me?.fullName ?? ''} onChange={(e) => setMe((p) => (p ? { ...p, fullName: e.target.value } : p))} placeholder="Emri i plotë" />
                <input value={me?.email ?? ''} onChange={(e) => setMe((p) => (p ? { ...p, email: e.target.value } : p))} placeholder="Email" />
                <input value={me?.phone ?? ''} onChange={(e) => setMe((p) => (p ? { ...p, phone: e.target.value } : p))} placeholder="Telefoni" />
                <button type="button" className="btn" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
                </button>
              </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {orders.length === 0 ? <p style={{ color: '#465b52' }}>Nuk ka porosi akoma.</p> : null}
              {orders.map((order) => (
                <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <p style={{ margin: 0 }}>
                    <strong>Porosia:</strong> {order.id}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Statusi:</strong> <span style={{ color: '#0f766e', fontWeight: 700 }}>{order.status}</span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Data:</strong> {new Date(order.createdAt).toLocaleString('sq-AL')}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Nëntotali:</strong> {(order.subtotalCents / 100).toFixed(2)}€ · <strong>Transporti:</strong>{' '}
                    {(order.shippingCents / 100).toFixed(2)}€ · <strong>Totali:</strong> {(order.totalCents / 100).toFixed(2)}€
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Adresa:</strong> {order.address?.line1 || '-'}
                  </p>
                  <p style={{ margin: '8px 0 0' }}>
                    <strong>Artikuj:</strong> {(order.items || []).map((i) => `${i.product?.name || 'Produkt'} x${i.quantity}`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn danger" onClick={logout}>
              Dil nga llogaria
            </button>
            <Link to="/" className="btn secondary">Kthehu në dyqan</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
