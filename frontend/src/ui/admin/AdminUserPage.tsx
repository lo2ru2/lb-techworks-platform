import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { adminDownloadFile } from '../lib/adminDownload';
import { AdminSkeleton } from './components/AdminSkeleton';
import { StatusBadge } from './components/StatusBadge';
import './admin.css';

type Row = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: { role: { name: string } }[];
};

export function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const p = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await axios.get(`${API_BASE}/users/admin/list${p}`, { headers: authHeaders() });
      setList(res.data);
    } catch {
      setMsg('Nuk u lexuan përdoruesit.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    
  }, []);

  async function exportFmt(fmt: 'csv' | 'json' | 'xlsx') {
    try {
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'json' ? 'json' : 'csv';
      const p = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
      await adminDownloadFile(`/users/admin/export?format=${fmt}${p}`, `users.${ext}`);
    } catch {
      setMsg('Eksporti dështoi.');
    }
  }

  return (
    <div>
      <h1>Përdoruesit (stafi)</h1>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}
      <div className="admin-card">
        <div className="admin-form" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label>
            Kërkim (email / emër)
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="…" />
          </label>
          <button type="button" className="btn" onClick={() => load()}>
            Kërko
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('csv')}>
            CSV
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('json')}>
            JSON
          </button>
          <button type="button" className="btn secondary" onClick={() => exportFmt('xlsx')}>
            Excel
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
              <th>Email</th>
              <th>Emri</th>
              <th>Statusi</th>
              <th>Rolet</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.fullName}</td>
                <td><StatusBadge status={u.status} /></td>
                <td>{u.roles.map((r) => r.role.name).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
