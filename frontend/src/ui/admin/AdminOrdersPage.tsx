import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { AdminSkeleton } from './components/AdminSkeleton';
import './admin.css';

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const;

type Order = {
  id: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  createdAt: string;
  customer: { email: string; fullName: string; phone?: string | null };
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPriceCents: number;
    product?: { name?: string | null; sku?: string | null } | null;
  }>;
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function listQuery() {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (filterStatus) p.set('status', filterStatus);
    if (customerEmail.trim()) p.set('customerEmail', customerEmail.trim());
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/orders${listQuery()}`, { headers: authHeaders() });
      setOrders(res.data);
    } catch {
      setMsg('Nuk u lexuan porositë (401?). Dil dhe hyr përsëri.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id: string, status: string) {
    try {
      await axios.patch(`${API_BASE}/orders/${id}/status`, { status }, { headers: authHeaders() });
      setMsg('Status u përditësua.');
      load();
    } catch {
      setMsg('Gabim gjatë përditësimit.');
    }
  }

  async function markOrderSeen(id: string) {
    try {
      await axios.patch(`${API_BASE}/orders/${id}/seen`, {}, { headers: authHeaders() });
    } catch {
      return;
    }
  }

  return (
    <div>
      <h1>Porositë</h1>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}
      <div className="admin-card">
        <h2>Kërkim i avancuar</h2>
        <div
          className="admin-form"
          style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
        >
          <label>
            Tekst (klient / email)
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            Statusi
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">(të gjitha)</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email klienti
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </label>
          <label>
            Nga data
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Deri data
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn" onClick={() => load()}>
            Apliko
          </button>
        </div>
      </div>
      <div className="admin-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <AdminSkeleton lines={8} height={20} />
        ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Klienti</th>
              <th>Email</th>
              <th>Totali</th>
              <th>Statusi</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => {
                  setSelectedOrder(o);
                  void markOrderSeen(o.id);
                }}
                style={{ cursor: 'pointer' }}
                title="Kliko për faturë / detaje"
              >
                <td title={o.id}>{o.id.slice(0, 8)}…</td>
                <td>{o.customer?.fullName}</td>
                <td>{o.customer?.email}</td>
                <td>{(o.totalCents / 100).toFixed(2)} €</td>
                <td>
                  <select
                    value={o.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    style={{ padding: 6 }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{new Date(o.createdAt).toLocaleString('sq-AL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {selectedOrder && (
        <div className="admin-card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Faturë porosie</h2>
            <button type="button" className="btn secondary" onClick={() => setSelectedOrder(null)}>
              Mbyll
            </button>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            <p style={{ margin: 0 }}>
              <strong>Porosia:</strong> {selectedOrder.id}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Data:</strong> {new Date(selectedOrder.createdAt).toLocaleString('sq-AL')}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Klienti:</strong> {selectedOrder.customer?.fullName}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {selectedOrder.customer?.email}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Telefoni:</strong> {selectedOrder.customer?.phone || '-'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Adresa:</strong>{' '}
              {[
                selectedOrder.address?.line1,
                selectedOrder.address?.line2,
                selectedOrder.address?.city,
                selectedOrder.address?.postalCode,
                selectedOrder.address?.country,
              ]
                .filter(Boolean)
                .join(', ') || '-'}
            </p>
          </div>
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produkti</th>
                  <th>SKU</th>
                  <th>Sasia</th>
                  <th>Çmimi njësi</th>
                  <th>Totali</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name || '-'}</td>
                    <td>{item.product?.sku || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>{(item.unitPriceCents / 100).toFixed(2)} €</td>
                    <td>{((item.unitPriceCents * item.quantity) / 100).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
            <p style={{ margin: 0 }}>
              <strong>Nëntotali:</strong> {(selectedOrder.subtotalCents / 100).toFixed(2)} €
            </p>
            <p style={{ margin: 0 }}>
              <strong>Dërgesa:</strong> {(selectedOrder.shippingCents / 100).toFixed(2)} €
            </p>
            <p style={{ margin: 0 }}>
              <strong>Zbritja:</strong> {(selectedOrder.discountCents / 100).toFixed(2)} €
            </p>
            <p style={{ margin: 0 }}>
              <strong>Gjithsej:</strong> {(selectedOrder.totalCents / 100).toFixed(2)} €
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
