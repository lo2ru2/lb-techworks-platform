import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { legacyAsset } from '../lib/assets';
import { hydrateCartForSession, readCart, writeCart, type CartItem } from '../layout/cart/cartStorage';
import { API_BASE } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import './DetajetPage.css';

/** Checkout + Stripe Checkout (faqja e hostuar e Stripe për pagesë me kartë). */
export function DetajetPage() {
  const navigate  = useNavigate();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [payment, setPayment]         = useState<'cash' | 'card'>('cash');
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [address, setAddress]         = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [loading, setLoading]         = useState(false);

  // Parafusho të dhënat e klientit të kyçur
  useEffect(() => {
    if (userProfile) {
      setFullName((prev) => prev || userProfile.fullName || '');
      setEmail((prev)    => prev || userProfile.email    || '');
    }
  }, [userProfile]);

  useEffect(() => {
    const loadCart = async () => {
      await hydrateCartForSession();
      setCart(readCart());
    };
    void loadCart();
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const shippingFee = 5;
  const total = subtotal + shippingFee;

  async function finishOrder() {
    if (cart.length === 0) {
      alert('Shporta juaj është bosh!');
      return;
    }
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      alert('Plotësoni të dhënat personale.');
      return;
    }

    setLoading(true);
    setCheckoutError('');
    try {
      const res = await axios.post(`${API_BASE}/orders/checkout`, {
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine: address.trim(),
        paymentMethod: payment,
        items: cart.map((c) => ({ productId: c.id, quantity: c.quantity })),
      });
      const data = res.data as { orderId: string; stripeCheckoutUrl?: string };
      if (payment === 'cash') {
        writeCart([]);
        setCart([]);
        navigate(`/payment/success?orderId=${encodeURIComponent(data.orderId)}`);
        return;
      }
      const url = data.stripeCheckoutUrl?.trim();
      if (!url) {
        setCheckoutError('Momentalisht pagesa me kartë nuk është e disponueshme. Provo përsëri pas pak.');
        return;
      }
      window.location.assign(url);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string | string[] } } };
      const m = ax.response?.data?.message;
      const text = Array.isArray(m)
        ? m.join(', ')
        : m ??
          'Gabim. Sigurohu që produktet në shportë kanë ID nga databaza (blej nga Shop pasi backend të jetë aktiv).';
      alert(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section id="header">
        <Link to="/">
          <img src={legacyAsset('img/logo.png')} className="logo" alt="" />
        </Link>
        <div>
          <ul id="navbar">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/shop">Shop</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li id="lg-bag">
              <Link to="/shop" id="open-cart">
                <i className="far fa-shopping-bag" />
              </Link>
            </li>
            <a href="#" id="close" onClick={(e) => e.preventDefault()}>
              <i className="far fa-times" />
            </a>
          </ul>
        </div>
        <div id="mobile">
          <Link to="/shop" id="mobile-cart">
            <i className="far fa-shopping-bag" />
          </Link>
          <i id="bar" className="fas fa-outdent" />
        </div>
      </section>

      <div className="back-button">
        <Link to="/" title="Kthehu në faqen kryesore">
          <i className="fas fa-arrow-left" />
        </Link>
      </div>

      <section className="checkout-section">
        <div className="container">
          <div className="checkout-header">
            <h2>Detajet e Porosisë</h2>
            <p>Plotësoni të dhënat për të përfunduar porosinë tuaj</p>
          </div>

          <div className="checkout-content">
            <div className="order-summary">
              <h3>Artikujt e Zgjedhur</h3>
              <div id="order-items" className="order-items-list">
                {cart.length === 0 ? (
                  <p>Nuk ka artikuj në shportë</p>
                ) : (
                  cart.map((item) => (
                    <div className="order-item" key={item.id}>
                      <img src={item.image} alt={item.name} />
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p>
                          Çmimi: {item.price.toFixed(2)}€ · Sasia: {item.quantity}
                        </p>
                        <p className="item-total">Totali: {(item.price * item.quantity).toFixed(2)}€</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="order-total">
                <p>
                  Nëntotali: <strong>{subtotal.toFixed(2)}€</strong>
                </p>
                <p>
                  Transporti: <strong>{shippingFee.toFixed(2)}€</strong>
                </p>
                <h4>
                  Totali final: <span id="checkout-total">{total.toFixed(2)}€</span>
                </h4>
              </div>
            </div>

            <div className="checkout-form">
              <div className="form-block">
                <h3>Të Dhënat Personale</h3>
                <div className="input-group">
                  <input
                    type="text"
                    id="name"
                    required
                    placeholder=" "
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <label htmlFor="name">Emri i Plotë</label>
                </div>
                <div className="input-group">
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label htmlFor="email">Email</label>
                </div>
                <div className="input-group">
                  <input
                    type="tel"
                    id="phone"
                    required
                    placeholder=" "
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <label htmlFor="phone">Numri i Telefonit</label>
                </div>
                <div className="input-group">
                  <textarea
                    id="address"
                    rows={3}
                    required
                    placeholder=" "
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <label htmlFor="address">Adresa e Plotë</label>
                </div>
              </div>

              <div className="form-block payment-block">
                <h3>Zgjidh Mënyrën e Pagesës</h3>
                {payment === 'card' ? (
                  <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}>
                    Me kartë do të ridrejtoheni te <strong>faqja e sigurt e Stripe</strong> ku plotësoni kartën dhe
                    përfundoni pagesën për artikujt në shportë. Email-i i mësipërm përdoret nga Stripe për dëftesë.
                  </p>
                ) : null}
                <div className="payment-options">
                  <div className="payment-option">
                    <input
                      type="radio"
                      id="cash"
                      name="payment"
                      checked={payment === 'cash'}
                      onChange={() => setPayment('cash')}
                    />
                    <label htmlFor="cash">
                      <i className="fas fa-money-bill-wave" />
                      <span>Para në Dorë</span>
                    </label>
                  </div>
                  <div className="payment-option">
                    <input
                      type="radio"
                      id="card"
                      name="payment"
                      checked={payment === 'card'}
                      onChange={() => setPayment('card')}
                    />
                    <label htmlFor="card">
                      <i className="fas fa-credit-card" />
                      <span>Kartë (Stripe Checkout)</span>
                    </label>
                  </div>
                </div>

                {payment === 'card' ? (
                  <p style={{ fontSize: 13, color: '#334155', marginTop: 12 }}>
                    Pas konfirmimit do të ridrejtoheni në faqen e sigurt të pagesës.
                  </p>
                ) : null}
                {checkoutError ? <p style={{ color: '#b91c1c', fontSize: 13 }}>{checkoutError}</p> : null}

                <button type="button" className="checkout-btn" onClick={finishOrder} disabled={loading}>
                  {loading
                    ? 'Duke u përgatitur…'
                    : payment === 'card'
                      ? 'Vazhdo te pagesa në Stripe'
                      : 'Përfundo Porosinë'}
                  <i className="fas fa-arrow-right" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
