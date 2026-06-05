import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE, authHeaders } from '../lib/api';
import { adminDownloadFile } from '../lib/adminDownload';
import './admin.css';

type Cat = { id: string; name: string; _count: { products: number } };

export function AdminCategoriesPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Cat[]>([]);
  const [msg, setMsg] = useState('');
  const [importJson, setImportJson] = useState('{"items":[{"name":"Kategoria e re"}]}');

  async function load() {
    try {
      const p = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      const res = await axios.get(`${API_BASE}/categories${p}`, { headers: authHeaders() });
      setList(res.data);
    } catch {
      setMsg('Nuk u lexuan kategoritë.');
    }
  }

  useEffect(() => {
    load();

  }, []);

  async function exportFmt(fmt: 'csv' | 'json' | 'xlsx') {
    try {
      const ext = fmt === 'xlsx' ? 'xlsx' : fmt === 'json' ? 'json' : 'csv';
      const p = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
      await adminDownloadFile(`/categories/export?format=${fmt}${p}`, `categories.${ext}`);
    } catch {
      setMsg('Eksporti dështoi.');
    }
  }

  async function runImport() {
    setMsg('');
    try {
      const body = JSON.parse(importJson) as { items: { name: string }[] };
      const res = await axios.post(`${API_BASE}/categories/import`, body, { headers: authHeaders() });
      setMsg(`Import: ${res.data.imported}. Gabime: ${res.data.errors?.length ?? 0}`);
      load();
    } catch {
      setMsg('Import JSON i pavlefshëm ose gabim serveri.');
    }
  }

  return (
    <div>
      <h1>Kategoritë</h1>
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
          rows={5}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        />
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => runImport()}>
          Importo (upsert sipas emrit)
        </button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Emri</th>
              <th>Produkte</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c._count.products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
