import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import './admin.css';

type ProductStock = {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
  inventory?: { quantity: number } | null;
};

export function AdminStockPage() {
  const [list, setList] = useState<ProductStock[]>([]);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});

  async function load() {
    try {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      p.set('isActive', 'true');
      const qs = p.toString();
      const res = await axios.get(`${API_BASE}/products/admin/list${qs ? `?${qs}` : ''}`, {
        headers: authHeaders(),
      });
      const rows = res.data as ProductStock[];
      setList(rows);
      setStockDraft(
        Object.fromEntries(rows.map((item) => [item.id, String(item.inventory?.quantity ?? 0)])),
      );
    } catch {
      setMsg('Nuk u lexua lista e stokut.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveStock(productId: string) {
    setMsg('');
    const parsed = Number(stockDraft[productId]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setMsg('Sasia e stokut duhet të jetë numër 0 ose më e madhe.');
      return;
    }
    try {
      setSavingId(productId);
      await axios.patch(
        `${API_BASE}/products/${productId}`,
        { stock: Math.trunc(parsed) },
        { headers: authHeaders() },
      );
      setMsg('Stoku u përditësua.');
      setList((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, inventory: { quantity: Math.trunc(parsed) } } : item,
        ),
      );
    } catch {
      setMsg('Përditësimi i stokut dështoi.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1>Stoku</h1>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}

      <div className="admin-card">
        <h2>Menaxhimi i stokut</h2>
        <div className="admin-form" style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <label>
            Kërko produkt (emër / SKU)
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button type="button" className="btn" onClick={() => load()}>
            Kërko
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produkti</th>
              <th>Stoku aktual</th>
              <th>Ndrysho sasinë</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.inventory?.quantity ?? 0}</td>
                <td style={{ minWidth: 180 }}>
                  <input
                    type="number"
                    min={0}
                    value={stockDraft[p.id] ?? '0'}
                    onChange={(e) => setStockDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => saveStock(p.id)}
                    disabled={savingId === p.id}
                  >
                    {savingId === p.id ? 'Duke ruajtur...' : 'Ruaj stokun'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
