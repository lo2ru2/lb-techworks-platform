import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { AdminSkeleton } from './components/AdminSkeleton';
import { StatusBadge } from './components/StatusBadge';
import './admin.css';

type Product = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  isActive: boolean;
  images: { url: string }[];
  inventory?: { quantity: number } | null;
};

export function AdminProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [priceEuro, setPriceEuro] = useState('19.99');
  const [categoryName, setCategoryName] = useState('Telefona');
  const [stock, setStock] = useState('20');
  const [imageUrl, setImageUrl] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editStock, setEditStock] = useState('0');

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('isActive', 'true');
      const qs = p.toString();
      const res = await axios.get(`${API_BASE}/products/admin/list${qs ? `?${qs}` : ''}`, {
        headers: authHeaders(),
      });
      setList(res.data);
    } catch {
      setMsg('Nuk u lexuan produktet.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const priceCents = Math.round(Number(priceEuro.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setMsg('Çmim i pavlefshëm');
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/products`,
        {
          sku,
          name,
          priceCents,
          categoryName: categoryName || undefined,
          stock: Number(stock) || 0,
          imageUrl: imageUrl || undefined,
        },
        { headers: authHeaders() },
      );
      setMsg('Produkti u krijua.');
      setSku('');
      setName('');
      load();
    } catch {
      setMsg('Krijimi dështoi (SKU unik?).');
    }
  }

  async function deactivate(id: string) {
    if (!confirm('Çaktivizo këtë produkt?')) return;
    try {
      await axios.delete(`${API_BASE}/products/${id}`, { headers: authHeaders() });
      load();
    } catch {
      setMsg('Fshirja dështoi.');
    }
  }

  function openEdit(p: Product) {
    setMsg('');
    setEditId(p.id);
    setEditSku(p.sku);
    setEditName(p.name);
    setEditImageUrl(p.images?.[0]?.url ?? '');
    setEditStock(String(p.inventory?.quantity ?? 0));
    setEditOpen(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setMsg('');
    try {
      await axios.patch(
        `${API_BASE}/products/${editId}`,
        {
          name: editName,
          imageUrl: editImageUrl || undefined,
          stock: Number(editStock) || 0,
        },
        { headers: authHeaders() },
      );
      setEditOpen(false);
      setEditId(null);
      setMsg('Produkti u përditësua.');
      load();
    } catch {
      setMsg('Edit dështoi.');
    }
  }

  return (
    <div>
      <h1>Produktet</h1>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}

      <div className="admin-card">
        <h2>Shto Produkt të Ri</h2>
        <form className="admin-form" onSubmit={createProduct}>
          <label>
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </label>
          <label>
            Emri
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Çmimi (€)
            <input value={priceEuro} onChange={(e) => setPriceEuro(e.target.value)} />
          </label>
          <label>
            Kategoria
            <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </label>
          <label>
            Stoku
            <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" min={0} />
          </label>
          <label>
            URL foto (opsionale)
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Vendos URL të imazhit..."
            />
          </label>
          <button className="btn" type="submit">
            Ruaj
          </button>
        </form>
      </div>

      <div className="admin-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <AdminSkeleton lines={8} height={20} />
        ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Emri</th>
              <th>Çmimi</th>
              <th>Stoku</th>
              <th>Aktiv</th>
              <th>Foto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{(p.priceCents / 100).toFixed(2)} €</td>
                <td>{p.inventory?.quantity ?? 0}</td>
                <td>
                  <StatusBadge status={p.isActive ? 'ACTIVE' : 'DISABLED'} />
                </td>
                <td>
                  {p.images?.[0] ? (
                    <img src={p.images[0].url} alt="" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => openEdit(p)}>
                    Edit
                  </button>{' '}
                  {p.isActive && (
                    <button type="button" className="btn danger" onClick={() => deactivate(p.id)}>
                      Çaktivizo
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {editOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={() => setEditOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>Edit produktin ({editSku})</h3>
              <button type="button" className="admin-modal-close" onClick={() => setEditOpen(false)} aria-label="Mbyll">
                ×
              </button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="admin-modal-body">
                <div className="admin-preview">
                  {editImageUrl ? (
                    <img src={editImageUrl} alt="" />
                  ) : (
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e2e8f0'/%3E%3C/svg%3E" alt="" />
                  )}
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong style={{ fontSize: 13 }}>{editName || '—'}</strong>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Ndrysho emrin, foton dhe stokun.</span>
                  </div>
                </div>

                <div className="admin-edit-grid" style={{ marginTop: 12 }}>
                  <label className="full">
                    Emri
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  </label>
                  <label className="full">
                    URL foto
                    <input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} placeholder="Vendos URL të imazhit..." />
                  </label>
                  <label>
                    Stoku
                    <input value={editStock} onChange={(e) => setEditStock(e.target.value)} type="number" min={0} />
                  </label>
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn outline" onClick={() => setEditOpen(false)}>
                  Anulo
                </button>
                <button type="submit" className="btn">
                  Ruaj ndryshimet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
