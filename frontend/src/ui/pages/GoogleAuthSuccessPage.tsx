import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function GoogleAuthSuccessPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { loginUser, logoutAdmin } = useAuthStore();

  useEffect(() => {
    try {
      const token = params.get('token');
      const userRaw = params.get('user');
      if (!token || !userRaw) {
        nav('/login?error=google_auth_failed', { replace: true });
        return;
      }
      const user = JSON.parse(userRaw) as { id: string; email: string; fullName: string; firstName?: string; lastName?: string };
      logoutAdmin();
      loginUser(token, user);
      nav('/', { replace: true });
    } catch {
      nav('/login?error=google_auth_failed', { replace: true });
    }
  }, [nav, params, loginUser, logoutAdmin]);

  return <p style={{ padding: 24 }}>Duke hyrë me Google...</p>;
}
