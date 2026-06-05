import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readCart, updateQuantity, CartItem } from './cartStorage';

export function CartPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  useEffect(() => {
    setItems(readCart());

    const attachOpenById = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return () => undefined;
      const onClick = (e: Event) => {
        e.preventDefault();
        setOpen(true);
        setItems(readCart());
      };
      el.addEventListener('click', onClick);
      return () => el.removeEventListener('click', onClick);
    };

    const detachDesktop = attachOpenById('open-cart');
    const detachMobile = attachOpenById('mobile-cart');

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cart') setItems(readCart());
    };
    const onCartChanged = (e: Event) => {
      const ce = e as CustomEvent<{ items?: CartItem[]; source?: string }>;
      const nextItems = ce.detail?.items ?? readCart();
      setItems(nextItems);
      if (ce.detail?.source === 'add') setOpen(true);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('lb:cart:changed', onCartChanged as EventListener);
    return () => {
      detachDesktop();
      detachMobile();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lb:cart:changed', onCartChanged as EventListener);
    };
  }, []);

  return (
    <div id="cart-popup" className={`cart-popup ${open ? 'is-open' : ''}`}>
      <button type="button" className="cart-overlay" aria-label="Mbyll shportën" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} />
      <div className="cart-content">
        <div className="cart-header">
          <div>
            <h2>Shporta Juaj</h2>
            <p>{totalCount} artikuj</p>
          </div>
          <span className="close-cart" id="close-cart" onClick={() => setOpen(false)}>
            ×
          </span>
        </div>
        <div id="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <h4>Shporta është bosh</h4>
              <p>Shto një produkt dhe do ta shohësh këtu menjëherë.</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <p className="item-unit-price">{item.price.toFixed(2)}€ / copë</p>
                  <div className="quantity-controls">
                    <button type="button" onClick={() => setItems(updateQuantity(item.id, item.quantity - 1))}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => setItems(updateQuantity(item.id, item.quantity + 1))}>
                      +
                    </button>
                  </div>
                  <p className="item-line-total">Nëntotali: {(item.price * item.quantity).toFixed(2)}€</p>
                </div>
                <button className="remove-btn" type="button" onClick={() => setItems(updateQuantity(item.id, 0))}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        <div className="cart-total">
          <div className="cart-grand-total">
            <span>Totali</span>
            <span id="total-price">{total.toFixed(2)}€</span>
          </div>
          <button type="button" className="continue-btn" onClick={() => setOpen(false)}>
            Vazhdo blerjen
          </button>
          <button
            className="checkout-btn"
            id="order-now"
            type="button"
            onClick={() => {
              if (items.length === 0) {
                alert('Shporta juaj është bosh!');
                return;
              }
              setOpen(false);
              navigate('/detajet');
            }}
          >
            Porosit Tani
          </button>
        </div>
      </div>
    </div>
  );
}
