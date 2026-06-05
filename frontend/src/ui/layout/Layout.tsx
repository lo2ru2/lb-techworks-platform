import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { CartPopup } from './cart/CartPopup';
import { hydrateCartForSession, readCart } from './cart/cartStorage';
import { CustomerAuthModal } from '../auth/CustomerAuthModal';
import { legacyAsset } from '../lib/assets';
import { SupportChatWidget } from '../components/SupportChatWidget';
import { useAuthStore } from '../store/authStore';

function isShopPath(pathname: string) {
  return (
    pathname.startsWith('/shop') ||
    pathname.startsWith('/telefona') ||
    pathname.startsWith('/kamera') ||
    pathname.startsWith('/audio') ||
    pathname.startsWith('/aksesore')
  );
}

export function Layout() {
  const location = useLocation();
  const { userToken, userProfile, logoutUser } = useAuthStore();
  const [navOpen, setNavOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLLIElement | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const customerProfile = useMemo(
    () => (userToken ? (userProfile ?? { id: '', email: '', fullName: 'Llogaria' }) : null),
    [userToken, userProfile],
  );

  function customerLogout() {
    logoutUser();
    setProfileMenuOpen(false);
  }

  function initialsFromName(fullName?: string): string {
    if (!fullName) return 'LL';
    const chunks = fullName.trim().split(/\s+/).filter(Boolean);
    if (chunks.length === 0) return 'LL';
    if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
    return `${chunks[0][0] ?? ''}${chunks[chunks.length - 1][0] ?? ''}`.toUpperCase();
  }

  useEffect(() => {
    setNavOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    void hydrateCartForSession();
    setCartCount(readCart().reduce((s, i) => s + i.quantity, 0));
  }, [userToken]);

  useEffect(() => {
    const onCartChanged = () => {
      setCartCount(readCart().reduce((s, i) => s + i.quantity, 0));
    };
    window.addEventListener('lb:cart:changed', onCartChanged);
    return () => window.removeEventListener('lb:cart:changed', onCartChanged);
  }, []);

  const cls = (path: string, end = false) => {
    const match = end ? location.pathname === path : location.pathname.startsWith(path);
    return match ? 'active' : undefined;
  };

  return (
    <>
      <section id="header">
        <Link to="/">
          <img src={legacyAsset('img/logo.png')} className="logo" alt="" />
        </Link>
        <div>
          <ul id="navbar" className={navOpen ? 'active' : undefined}>
            <li>
              <NavLink className={cls('/', true)} end to="/">
                Home
              </NavLink>
            </li>
            <li className="has-dropdown">
              <NavLink className={isShopPath(location.pathname) ? 'active' : undefined} to="/shop">
                Shop
              </NavLink>
              <div className="dropdown-menu">
                <div className="dropdown-content">
                  <Link to="/shop" onClick={() => setNavOpen(false)}>New Arrivals</Link>
                  <Link to="/telefona" onClick={() => setNavOpen(false)}>Telefona</Link>
                  <Link to="/kamera" onClick={() => setNavOpen(false)}>Kamera</Link>
                  <Link to="/audio" onClick={() => setNavOpen(false)}>Pajisje Zërimi</Link>
                  <Link to="/aksesore" onClick={() => setNavOpen(false)}>Aksesorë</Link>
                </div>
              </div>
            </li>
            <li>
              <NavLink className={cls('/blog')} to="/blog">
                Blog
              </NavLink>
            </li>
            <li>
              <NavLink className={cls('/about')} to="/about">
                About
              </NavLink>
            </li>
            <li>
              <NavLink className={cls('/contact')} to="/contact">
                Contact
              </NavLink>
            </li>

            <li id="lg-bag" style={{ position: 'relative' }}>
              <a href="#" id="open-cart" onClick={(e) => e.preventDefault()} style={{ position: 'relative', display: 'inline-block' }}>
                <i className="far fa-shopping-bag" />
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -8, right: -8,
                    background: '#e11d48', color: '#fff',
                    borderRadius: '999px', fontSize: 10, fontWeight: 700,
                    minWidth: 16, height: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', lineHeight: 1,
                  }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </a>
            </li>

            {customerProfile ? (
              <>
                <li className="lb-nav-auth lb-nav-after-bag lb-profile-menu" ref={profileMenuRef}>
                  <button type="button" className="lb-profile-avatar" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((v) => !v)}>
                    {initialsFromName(customerProfile.fullName)}
                  </button>
                  {profileMenuOpen && (
                    <div className="lb-profile-popover" role="menu" aria-label="Menyja e profilit">
                      <div className="lb-profile-head">
                        <strong>{customerProfile.fullName ?? 'Llogaria'}</strong>
                        {customerProfile.email ? <span>{customerProfile.email}</span> : null}
                      </div>
                      <Link to="/account" className="lb-profile-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); setNavOpen(false); }}>
                        Profili im
                      </Link>
                      <Link to="/account?tab=orders" className="lb-profile-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); setNavOpen(false); }}>
                        Porositë e mia
                      </Link>
                      <button type="button" className="lb-profile-item lb-profile-logout" role="menuitem" onClick={() => { customerLogout(); setNavOpen(false); }}>
                        Log out
                      </button>
                    </div>
                  )}
                </li>
              </>
            ) : (
              <li className="lb-nav-auth lb-nav-after-bag">
                <button
                  type="button"
                  className="lb-login-btn"
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                    setNavOpen(false);
                  }}
                >
                  <i className="far fa-user" aria-hidden />
                  <span>Hyr</span>
                </button>
              </li>
            )}
            <a
              href="#"
              id="close"
              onClick={(e) => {
                e.preventDefault();
                setNavOpen(false);
              }}
            >
              <i className="far fa-times" />
            </a>
          </ul>
        </div>
        <div id="mobile">
          <a href="#" id="mobile-cart" onClick={(e) => e.preventDefault()}>
            <i className="far fa-shopping-bag" />
          </a>
          {!customerProfile && (
            <button
              type="button"
              id="open-auth-mobile"
              className="lb-mobile-login"
              aria-label="Hyr"
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
            >
              <i className="far fa-user" aria-hidden />
            </button>
          )}
          <i
            id="bar"
            className="fas fa-outdent"
            role="button"
            tabIndex={0}
            onClick={() => setNavOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setNavOpen(true)}
          />
        </div>
      </section>

      <Outlet />

      <section id="newsletter" className="section-p1 section-m1">
        <div className="newstext">
          <h4>Regjistrohuni per lajmet me te reja</h4>
          <p>
            Lajmet me te reja të dyqanit dhe <span>ofertat speciale</span>
          </p>
        </div>
        <div className="form">
          <input type="text" placeholder="Email adresa juaj" />
          <button
            type="button"
            className="normal"
            onClick={() => {
              setAuthModalMode('register');
              setAuthModalOpen(true);
            }}
          >
            Regjistrohuni
          </button>
        </div>
      </section>

      <footer className="section-p1">
        <div className="col">
          <img className="logo" src={legacyAsset('img/logo.png')} alt="" />
          <h4>Kontakti</h4>
          <p>
            <strong>Address:</strong> Mbretëresha Teutë, Pejë 30000
          </p>
          <p>
            <strong>Phone:</strong> +383 49 123 456
          </p>
          <p>
            <strong>Hours:</strong> Hëne - Shtune: 9.00 - 20.00
          </p>
          <div className="follow">
            <h4>Follow us</h4>
            <div className="icon">
              <i className="fab fa-facebook-f" />
              <i className="fab fa-twitter" />
              <i className="fab fa-instagram" />
              <i className="fab fa-pinterest" />
              <i className="fab fa-youtube" />
            </div>
          </div>
        </div>

        <div className="col">
          <h4>About</h4>
          <a href="#">About us</a>
          <a href="#">Delivery Information</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Contact Us</a>
        </div>

        <div className="col">
          <h4>My Account</h4>
          <Link to="/login">Admin (hyr me të njëjtin login)</Link>
          {customerProfile ? (
            <>
              <Link to="/account">Llogaria ime</Link>
              <button type="button" className="lb-footer-linkbtn" onClick={() => customerLogout()}>
                Dil
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="lb-footer-linkbtn"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
              >
                Hyr
              </button>
              <button
                type="button"
                className="lb-footer-linkbtn"
                onClick={() => {
                  setAuthModalMode('register');
                  setAuthModalOpen(true);
                }}
              >
                Regjistrohu
              </button>
            </>
          )}
          <a href="#">View Cart</a>
          <a href="#">My Wishlist</a>
          <a href="#">Track My Order</a>
          <a href="#">Help</a>
        </div>

        <div className="col install">
          <h4>Install App</h4>
          <p>From App Store or Google Play</p>
          <div className="row">
            <img src={legacyAsset('img/pay/app.jpg')} alt="" />
            <img src={legacyAsset('img/pay/play.jpg')} alt="" />
          </div>
          <p>Secured Payment Gateways</p>
          <img src={legacyAsset('img/pay/pay.png')} alt="" />
        </div>

        <div className="copyright">
          <p>© 2024, LB Techworks</p>
        </div>
      </footer>

      <CustomerAuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthed={() => undefined}
      />

      <CartPopup />
      <SupportChatWidget
        onRequireLogin={() => {
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }}
      />
    </>
  );
}
