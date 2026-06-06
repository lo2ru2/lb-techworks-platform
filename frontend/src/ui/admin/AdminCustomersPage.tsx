import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { adminDownloadFile } from '../lib/adminDownload';
import './admin.css';

type Customer = { id: string; email: string; fullName: string; phone?: string | null };

export function AdminCustomersPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Customer[]>([]);
  const [msg, setMsg] = useState('');
  const [importJson, setImportJson] = useState('{"items":[{"email":"a@b.c","fullName":"Emri"}]}');

  async function load() {
    try {
      const p = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await axios.get(`${API_BASE}/customers${p}`, { headers: authHeaders() });
      setList(res.data);
    } catch {
      setMsg('Nuk u lexuan klientët (customers.read?).');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportFmt(fmt: 'csv' | 'json' | 'xlsx') {
    try {
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'json' ? 'json' : 'csv';
      const p = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
      await adminDownloadFile(`/customers/export?format=${fmt}${p}`, `customers.${ext}`);
    } catch {
      setMsg('Eksporti dështoi.');
    }
  }

  async function runImport() {
    setMsg('');
    try {
      const body = JSON.parse(importJson) as { items: { email: string; fullName: string; phone?: string }[] };
      const res = await axios.post(`${API_BASE}/customers/import`, body, { headers: authHeaders() });
      setMsg(`Import: ${res.data.imported} rreshta. Gabime: ${res.data.errors?.length ?? 0}`);
      load();
    } catch {
      setMsg('Import JSON i pavlefshëm ose gabim serveri.');
    }
  }

  return (
    <div>
      <h1>Klientët</h1>
      {msg && <p style={{ color: '#64748b' }}>{msg}</p>}
      <div className="admin-card">
        <div className="admin-form" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label>
            Kërkim
            <input value={q} onChange={(e) => setQ(e.target.value)} />
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
      <div className="admin-card">
        <h2>Import JSON</h2>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        />
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => runImport()}>
          Importo
        </button>
      </div>
      <div className="admin-card" style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Emri</th>
              <th>Telefoni</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.email}</td>
                <td>{c.fullName}</td>
                <td>{c.phone ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
