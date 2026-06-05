import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { API_BASE, authHeaders, getSocketBaseUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './admin.css';

export function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { adminToken, adminUser, logoutAdmin } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState({ supportUnread: 0, contactUnread: 0, ordersUnread: 0 });

  useEffect(() => {
    if (!adminToken) nav('/admin/login', { replace: true });
  }, [adminToken, nav]);

  function logout() {
    logoutAdmin();
    nav('/admin/login');
  }

  useEffect(() => {
    axios
      .get(`${API_BASE}/notifications/counts`, { headers: authHeaders() })
      .then((res) => {
        const c = res.data as { supportUnread?: number; contactUnread?: number; ordersUnread?: number };
        setCounts({
          supportUnread: Number(c.supportUnread ?? 0),
          contactUnread: Number(c.contactUnread ?? 0),
          ordersUnread: Number(c.ordersUnread ?? 0),
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const base = getSocketBaseUrl();
    const socket = io(`${base}/notifications`, {
      path: '/socket.io',
      transports: ['websocket'],
      query: { role: 'admin', token: adminToken ?? '' },
    });
    socket.on('notifications:counts', (payload: unknown) => {
      const c = payload as { supportUnread?: number; contactUnread?: number; ordersUnread?: number };
      setCounts({
        supportUnread: Number(c.supportUnread ?? 0),
        contactUnread: Number(c.contactUnread ?? 0),
        ordersUnread: Number(c.ordersUnread ?? 0),
      });
    });
    return () => {
      socket.off('notifications:counts');
      socket.disconnect();
    };
  }, []);

  const breadcrumb = useMemo(() => {
    return location.pathname
      .split('/')
      .filter(Boolean)
      .slice(1)
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
      .join(' / ');
  }, [location.pathname]);

  const adminName = useMemo(
    () => adminUser?.fullName || adminUser?.email || 'Admin',
    [adminUser],
  );

  const totalAlerts = counts.supportUnread + counts.contactUnread + counts.ordersUnread;

  return (
    <div className={`admin-wrap ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>LB Admin</strong>
          <button type="button" className="admin-collapse-btn" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? '⟩' : '⟨'}
          </button>
        </div>
        <nav className="admin-nav">
          <p className="admin-nav-group">Komerciale</p>
          <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>🧾 Porositë</span>
            {counts.ordersUnread > 0 ? <span className="admin-badge-dot">{counts.ordersUnread}</span> : null}
          </NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>📦 Produktet</span>
          </NavLink>
          <NavLink to="/admin/stock" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>📊 Stoku</span>
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>🏷️ Kategoritë</span>
          </NavLink>
          <p className="admin-nav-group">Menaxhim</p>
          <NavLink to="/admin/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>🧑‍💼 Klientët</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>👤 Përdoruesit</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>📈 Raportet</span>
          </NavLink>
          <p className="admin-nav-group">Komunikim</p>
          <NavLink to="/admin/support?tab=support" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>💬 Support</span>
            {counts.supportUnread > 0 ? <span className="admin-badge-dot">{counts.supportUnread}</span> : null}
          </NavLink>
          <NavLink to="/admin/support?tab=contact" className={({ isActive }) => (isActive ? 'active' : '')}>
            <span>📩 Contact</span>
            {counts.contactUnread > 0 ? <span className="admin-badge-dot">{counts.contactUnread}</span> : null}
          </NavLink>
        </nav>
      </aside>
      <section className="admin-panel">
        <header className="admin-top">
          <div>
            <p className="admin-breadcrumb">Admin / {breadcrumb || 'Dashboard'}</p>
            <h2>Paneli i Administrimit</h2>
          </div>
          <div className="admin-top-actions">
            <button type="button" className="admin-bell" title="Njoftime">
              🔔
              {totalAlerts > 0 ? <span className="admin-badge-dot">{totalAlerts}</span> : null}
            </button>
            <div className="admin-profile-pill">{adminName}</div>
            <Link to="/">Dyqani</Link>
            <button type="button" className="btn secondary" onClick={logout}>
              Dil
            </button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
