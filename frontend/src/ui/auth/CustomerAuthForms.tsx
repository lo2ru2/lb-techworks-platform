import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { parseApiError } from '../lib/parseApiError';
import { useAuthStore } from '../store/authStore';
import './customerAuth.css';

type Mode = 'login' | 'register' | 'changePassword';

type Props = {
  variant: 'page' | 'modal';
  initialMode?: Mode;
  onSuccess?: () => void;
};

export function CustomerAuthForms({ variant, initialMode = 'login', onSuccess }: Props) {
  const nav = useNavigate();
  const { loginUser, loginAdmin, logoutUser, logoutAdmin } = useAuthStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [changeEmail, setChangeEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  function finishSession(accessToken: string, user: { id: string; email: string; fullName: string; firstName?: string; lastName?: string }) {
    loginUser(accessToken, user);
    onSuccess?.();
    if (variant === 'page') nav('/');
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: loginEmail,
        password: loginPassword,
      });
      const roles: string[] = res.data.roles ?? [];
      if (roles.includes('ADMIN')) {
        logoutUser();
        loginAdmin(res.data.accessToken, res.data.user);
        onSuccess?.();
        nav('/admin/orders');
        return;
      }
      logoutAdmin();
      finishSession(res.data.accessToken, res.data.user);
    } catch (e) {
      setErr(parseApiError(e, 'Email ose fjalëkalimi është i gabuar!'));
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSuccessMsg('');
    if (newPassword !== confirmNewPassword) {
      setErr('Fjalëkalimet e reja nuk përputhen!');
      return;
    }
    try {
      await axios.post(`${API_BASE}/auth/change-password`, {
        email: changeEmail,
        currentPassword,
        newPassword,
      });
      setSuccessMsg('Fjalëkalimi u ndryshua me sukses. Tani mund të hyni me fjalëkalimin e ri.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');
    } catch (e) {
      setErr(parseApiError(e, 'Ndryshimi i fjalëkalimit dështoi.'));
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (regPassword !== confirmPassword) {
      setErr('Fjalëkalimet nuk përputhen!');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail,
        password: regPassword,
        phone: phone.trim() || undefined,
      });
      finishSession(res.data.accessToken, res.data.user);
    } catch (e) {
      setErr(parseApiError(e, 'Ndodhi një gabim gjatë regjistrimit.'));
    }
  }

  const wrapClass =
    variant === 'page' ? 'lb-customer-auth lb-customer-auth--page' : 'lb-customer-auth';

  return (
    <div className={wrapClass}>
      {mode === 'login' ? (
        <>
          <div className="section-title">
            <h3>Mirë se vini përsëri</h3>
            <div className="divider" />
            <p>Ju lutemi logohuni në llogarinë tuaj</p>
          </div>
          {err && <div className="alert alert-danger">{err}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          <form className="login-form" onSubmit={onLogin}>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Fjalëkalimi"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>
            <button type="submit" className="btn-main">
              Hyr
            </button>
            <a className="btn-main btn-google" href={`${API_BASE}/auth/google`}>
              Vazhdo me Google
            </a>
            <div className="lb-auth-secondary-link">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setErr('');
                  setSuccessMsg('');
                  setChangeEmail(loginEmail);
                  setMode('changePassword');
                }}
              >
                Ndrysho fjalëkalimin
              </a>
            </div>
            <div className="register-link">
              <p>
                Nuk keni llogari?{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setErr('');
                    setMode('register');
                  }}
                >
                  Regjistrohu tani
                </a>
              </p>
            </div>
          </form>
        </>
      ) : mode === 'register' ? (
        <>
          <div className="section-title">
            <h3>Krijo llogari</h3>
            <div className="divider" />
            <p>Ju lutemi plotësoni informacionin tuaj</p>
          </div>
          {err && <div className="alert alert-danger">{err}</div>}
          <form className="login-form" onSubmit={onRegister}>
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                placeholder="Emri (p.sh. Andi)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                placeholder="Mbiemri (p.sh. Berisha)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
                autoComplete="family-name"
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Fjalëkalimi (min. 6 karaktere)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Konfirmo fjalëkalimin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <input
                type="tel"
                className="form-control"
                placeholder="Numri i telefonit (opsional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <button type="submit" className="btn-main">
              Krijo llogari
            </button>
            <div className="register-link">
              <p>
                Keni tashmë një llogari?{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setErr('');
                    setMode('login');
                  }}
                >
                  Hyr këtu
                </a>
              </p>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="section-title">
            <h3>Ndrysho fjalëkalimin</h3>
            <div className="divider" />
            <p>Plotëso email-in dhe fjalëkalimin aktual për ta ndryshuar fjalëkalimin.</p>
          </div>
          {err && <div className="alert alert-danger">{err}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          <form className="login-form" onSubmit={onChangePassword}>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={changeEmail}
                onChange={(e) => setChangeEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Fjalëkalimi aktual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Fjalëkalimi i ri"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                className="form-control"
                placeholder="Konfirmo fjalëkalimin e ri"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn-main">
              Ruaj fjalëkalimin e ri
            </button>
            <div className="register-link">
              <p>
                Kthehu te login?{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setErr('');
                    setMode('login');
                  }}
                >
                  Hyr këtu
                </a>
              </p>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
