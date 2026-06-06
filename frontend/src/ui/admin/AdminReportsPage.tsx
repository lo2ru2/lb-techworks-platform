import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { adminDownloadFile } from '../lib/adminDownload';
import './admin.css';

type Summary = {
  totalOrders: number;
  totalRevenueCents: number;
  byStatus: Record<string, { count: number; totalCents: number }>;
  filterSummary?: string;
};

export function AdminReportsPage() {
  const [days, setDays] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [data, setData] = useState<Summary | null>(null);
  const [msg, setMsg] = useState('');

  function queryParams() {
    const p = new URLSearchParams();
    if (from && to) {
      p.set('from', from);
      p.set('to', to);
    } else {
      p.set('days', days || '30');
    }
    if (status) p.set('status', status);
    if (customerEmail.trim()) p.set('customerEmail', customerEmail.trim());
    return p.toString();
  }

  async function load() {
    setMsg('');
    try {
      const res = await axios.get(`${API_BASE}/reports/sales-summary?${queryParams()}`, {
        headers: authHeaders(),
      });
      setData(res.data);
    } catch {
      setMsg('Nuk u lexuan raportet.');
      setData(null);
    }
  }

  useEffect(() => {
    load();
   
  }, []);

  async function exportFmt(fmt: 'csv' | 'json' | 'xlsx') {
    try {
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'json' ? 'json' : 'csv';
      await adminDownloadFile(`/reports/sales-summary/export?format=${fmt}&${queryParams()}`, `sales-report.${ext}`);
      setMsg('Shkarkimi filloi.');
    } catch {
      setMsg('Eksporti dështoi.');
    }
  }

  return (
    <div>
      <h1>Raporte dinamike (shitje)</h1>
      <p style={{ color: '#64748b', maxWidth: 560 }}>
        Filtra sipas ditëve ose intervalit datash, statusit të porosisë dhe emailit të klientit. Përdor eksportin për
        CSV / JSON / Excel.
      </p>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}

      <div className="admin-card">
        <div className="admin-form" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          <label>
            Ditët (nëse pa nga–deri)
            <input value={days} onChange={(e) => setDays(e.target.value)} type="number" min={1} max={365} />
          </label>
          <label>
            Nga data
            <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" />
          </label>
          <label>
            Deri data
            <input value={to} onChange={(e) => setTo(e.target.value)} type="date" />
          </label>
          <label>
            Statusi
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">(të gjitha)</option>
              {['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: 'span 2' }}>
            Email klienti (përmban)
            <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="p.sh. @gmail" />
          </label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn" onClick={() => load()}>
            Apliko filtrat
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('csv')}>
            Eksport CSV
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('json')}>
            Eksport JSON
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('xlsx')}>
            Eksport Excel
          </button>
        </div>
      </div>

      {data && (
        <div className="admin-card">
          <h2>Përmbledhje</h2>
          <p>
            <strong>Porosi:</strong> {data.totalOrders} · <strong>Totali (cent):</strong> {data.totalRevenueCents}
          </p>
          {data.filterSummary && (
            <p style={{ fontSize: 13, color: '#64748b' }}>Filtra: {data.filterSummary}</p>
          )}
          <table className="admin-table">
            <thead>
              <tr>
                <th>Statusi</th>
                <th>Numri</th>
                <th>Totali (cent)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byStatus).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{v.count}</td>
                  <td>{v.totalCents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
