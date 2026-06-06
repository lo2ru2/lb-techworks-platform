import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { writeCart } from '../layout/cart/cartStorage';

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';

  useEffect(() => {
    writeCart([]);
    if (!orderId) return;
    axios.post(`${API_BASE}/orders/checkout/${encodeURIComponent(orderId)}/stripe-sync`).catch(() => {
      /* Webhook ose rifreskim manual në admin */
    });
  }, [orderId]);

  return (
    <section className="section-p1" style={{ maxWidth: 760, margin: '40px auto', textAlign: 'center' }}>
      <h2>Pagesa u krye me sukses</h2>
      <p>Faleminderit! Porosia juaj u regjistrua dhe do të përpunohet shumë shpejt.</p>
      {orderId ? (
        <p>
          ID e porosisë: <strong>{orderId}</strong>
        </p>
      ) : null}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
        <Link to="/account?tab=orders" className="normal">
          Shiko porositë
        </Link>
        <Link to="/" className="normal">
          Kthehu në faqen kryesore
        </Link>
      </div>
    </section>
  );
}
