import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './admin.css';

export function AdminLoginPage() {
  const nav = useNavigate();
  const { loginAdmin } = useAuthStore();
  const [email, setEmail] = useState('admin@lbtechworks.local');
  const [password, setPassword] = useState('Admin123!');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const roles: string[] = res.data.roles ?? [];
      if (!roles.includes('ADMIN')) {
        setErr('Kjo llogari nuk është administrator. Për blerësit përdorni Hyr te dyqani.');
        return;
      }
      loginAdmin(res.data.accessToken, res.data.user);
      nav('/admin/orders');
    } catch {
      setErr('Login dështoi. Kontrollo email/fjalëkalim.');
    }
  }

  return (
    <div className="admin-wrap">
      <div className="admin-top">
        <span>LB Techworks — Admin</span>
        <Link to="/">← Dyqani</Link>
      </div>
      <div className="admin-main">
        <div className="admin-card" style={{ maxWidth: 420 }}>
          <h1>Hyrje admin</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Përdor llogarinë nga seed (README).</p>
          <form className="admin-form" onSubmit={submit}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </label>
            <label>
              Fjalëkalim
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </label>
            {err && <p style={{ color: '#b91c1c' }}>{err}</p>}
            <button className="btn" type="submit">
              Hyr
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
