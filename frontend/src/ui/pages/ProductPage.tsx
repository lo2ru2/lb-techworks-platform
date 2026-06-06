import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { addToCart } from '../layout/cart/cartStorage';
import { legacyAsset } from '../lib/assets';
import { API_BASE } from '../lib/api';

type ViewProduct = {
  name: string;
  price: number;
  cat: string;
  image: string;
  desc: string;
  dbId?: string;
  stock: number;
};


export function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const staticMap: Record<string, ViewProduct> = useMemo(
    () => ({
      p1: {
        name: 'Samsung Galaxy S24 Ultra',
        price: 900,
        cat: 'Telefona',
        image: legacyAsset('img/telefonat/65.png'),
        desc: 'Pajisje premium me performancë të lartë dhe dizajn elegant.',
        stock: 8,
      },
      p2: {
        name: 'Dahua PTZ-SD3A',
        price: 415,
        cat: 'Kamera',
        image: legacyAsset('img/kamera/2.png'),
        desc: 'Zgjidhje sigurie profesionale për monitorim të avancuar.',
        stock: 4,
      },
      p3: {
        name: 'Dahua Siren e Jashtme',
        price: 65,
        cat: 'Kamera',
        image: legacyAsset('img/kamera/35.png'),
        desc: 'Sirenë e jashtme për sinjalizim të qartë dhe të fuqishëm.',
        stock: 0,
      },
      n1: {
        name: 'Fonestar P100',
        price: 125,
        cat: 'Pajisje Zërimi',
        image: legacyAsset('img/zerim/zerim/19.png'),
        desc: 'Pajisje audio me cilësi të lartë për përdorim profesional.',
        stock: 6,
      },
      n3: {
        name: 'Iphone 16 Green',
        price: 750,
        cat: 'Telefona',
        image: legacyAsset('img/telefonat/21.png'),
        desc: 'Telefon modern me performancë dhe kamera të avancuar.',
        stock: 3,
      },
    }),
    [],
  );

  const [product, setProduct] = useState<ViewProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    const key = id ?? 'p1';
    const local = staticMap[key];
    if (local) {
      setProduct({ ...local, dbId: undefined });
      return;
    }

    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/products/${key}`);
        const p = res.data;
        const img = p.images?.[0]?.url || legacyAsset('img/logo.png');
        const cat = p.categories?.[0]?.category?.name ?? '';
        setProduct({
          name: p.name,
          price: p.priceCents / 100,
          cat,
          image: img.startsWith('http') || img.startsWith('/') ? img : img,
          desc: p.description || '',
          dbId: p.id,
          stock: p.inventory?.quantity ?? 0,
        });
      } catch {
        setProduct(staticMap.p1);
      }
    };
    load();
  }, [id, staticMap]);

  const p = product ?? staticMap.p1;
  const cartId = p.dbId ?? id ?? 'p1';
  const mainImg = activeImg ?? p.image;

  return (
    <>
      <section className="section-p1 lb-product-topbar">
        <button
          type="button"
          className="lb-back-btn"
          aria-label="Kthehu mbrapa"
          onClick={() => {
            // Kthehu te faqja ku ishte para produktit; fallback te Shop.
            if (window.history.length > 1) nav(-1);
            else nav('/shop');
          }}
        >
          <svg className="lb-back-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M15 18l-6-6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </section>
      <section id="prodetails" className="section-p1 lb-product-page">
        <div className="single-pro-image">
          <div className="lb-product-media-card">
            <img src={mainImg} width="100%" id="MainImg" alt={p.name} />
          </div>
          <div className="small-img-group">
            {[p.image, p.image, p.image, p.image].map((img, i) => (
              <div className="small-img-col" key={i}>
                <button
                  type="button"
                  className={`lb-thumb ${mainImg === img ? 'is-active' : ''}`}
                  onClick={() => setActiveImg(img)}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img src={img} width="100%" className="small-img" alt="" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="single-pro-details">
          <div className="lb-product-breadcrumbs">
            <span>Dyqani</span>
            <span className="lb-sep">/</span>
            <span id="product-category">{p.cat}</span>
          </div>

          <h1 id="product-name" className="lb-product-title">
            {p.name}
          </h1>

          <div className="lb-product-price-row">
            <div id="product-price" className="lb-product-price">
              {p.price.toFixed(2)} €
            </div>
            <span className="lb-product-badge">{p.stock > 0 ? `Në stok: ${p.stock}` : 'Out of Stock'}</span>
          </div>

          <div className="lb-product-actions">
            <div className="lb-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Ul sasinë">
                −
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                inputMode="numeric"
                aria-label="Sasia"
                onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
              />
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Rrit sasinë">
                +
              </button>
            </div>
            <button
              type="button"
              className="lb-add-to-cart"
              id="addToCartBtn"
              disabled={p.stock <= 0}
              onClick={() => addToCart({ id: cartId, name: p.name, price: p.price, image: p.image }, qty)}
            >
              Shto në shportë
            </button>
          </div>

          <button
            type="button"
            className="lb-buy-now"
            disabled={p.stock <= 0}
            onClick={() => {
              addToCart({ id: cartId, name: p.name, price: p.price, image: p.image }, qty);

            }}
          >
            Bli tani
          </button>

          <div className="lb-product-divider" />
          <h4>Detajet e Produktit</h4>
          <p id="product-description" className="lb-product-desc">
            {p.desc || '—'}
          </p>
        </div>
      </section>

      <section id="product1" className="section-p1">
        <h2>Produkte të Ngjashme</h2>
        <p>Koleksioni i Ri</p>
        <div className="pro-container"></div>
      </section>
    </>
  );
}
