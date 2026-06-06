import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { addToCart } from '../layout/cart/cartStorage';
import { legacyAsset } from '../lib/assets';
import { API_BASE } from '../lib/api';

type Card = { id: string; cat: string; name: string; price: number; image: string; stock: number };

const fallbackBestsellers: Card[] = [
  { id: 'p1', cat: 'Telefona', name: 'Samsung Galaxy S24 Ultra', price: 900, image: legacyAsset('img/telefonat/65.png'), stock: 10 },
  { id: 'p2', cat: 'Kamera', name: 'Dahua PTZ-SD3A', price: 415, image: legacyAsset('img/kamera/2.png'), stock: 6 },
  { id: 'p3', cat: 'Kamera', name: 'Dahua Siren e Jashtme', price: 65, image: legacyAsset('img/kamera/35.png'), stock: 0 },
  { id: 'p4', cat: 'Pajisje Zërimi', name: 'Yamaha YHT-4950', price: 500, image: legacyAsset('img/zerim/zerim/22.png'), stock: 12 },
];

const fallbackNew: Card[] = [
  { id: 'n1', cat: 'Pajisje Zërimi', name: 'Fonestar P100', price: 125, image: legacyAsset('img/zerim/zerim/19.png'), stock: 7 },
  { id: 'n2', cat: 'Pajisje Zërimi', name: 'Fonestar Speaker muri', price: 45, image: legacyAsset('img/zerim/zerim/6.png'), stock: 4 },
  { id: 'n3', cat: 'Telefona', name: 'Iphone 16 Green', price: 750, image: legacyAsset('img/telefonat/21.png'), stock: 5 },
  { id: 'n4', cat: 'Telefona', name: 'Samsung Galaxy Flip 6', price: 1200, image: legacyAsset('img/telefonat/73.png'), stock: 0 },
];

/** Strukturë 1:1 me `index.html`; produktet nga API kur backend punon (ID reale për checkout). */
export function HomePage() {
  const [bestsellers, setBestsellers] = useState<Card[]>(fallbackBestsellers);
  const [newArrivals, setNewArrivals] = useState<Card[]>(fallbackNew);

  useEffect(() => {
    const mapItem = (p: {
      id: string;
      name: string;
      priceCents: number;
      images: { url: string }[];
      categories: { category: { name: string } }[];
      inventory?: { quantity: number } | null;
    }): Card => ({
      id: p.id,
      cat: p.categories?.[0]?.category?.name ?? '',
      name: p.name,
      price: p.priceCents / 100,
      image: p.images?.[0]?.url || legacyAsset('img/logo.png'),
      stock: p.inventory?.quantity ?? 0,
    });

    axios
      .get(`${API_BASE}/products`, { params: { pageSize: 24, sort: 'newest' } })
      .then((res) => {
        const items = res.data.items as typeof res.data.items;
        if (!items?.length) return;
        setBestsellers(items.slice(0, 4).map(mapItem));
        const rest = items.slice(4, 8);
        setNewArrivals(rest.length >= 4 ? rest.map(mapItem) : items.slice(0, 4).map(mapItem));
      })
      .catch(() => {
        /* mbaj fallback */
      });
  }, []);

  return (
    <>
      <section id="hero"></section>

      <section id="product1" className="section-p1">
        <h2>Më të shiturat</h2>
        <div className="pro-container">
          {bestsellers.map((p) => (
            <div className="pro" key={p.id}>
              <Link to={`/product/${p.id}`}>
                <div className="lb-product-image-wrap">
                  <img src={p.image} alt={p.name} />
                  {p.stock <= 0 ? <span className="lb-stock-overlay">Out of Stock</span> : null}
                </div>
                <div className="des">
                  <span>{p.cat}</span>
                  <h5>{p.name}</h5>
                  <div className="star">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                  </div>
                  <h4>{p.price} €</h4>
                </div>
              </Link>
              <button
                type="button"
                className="add-to-cart"
                disabled={p.stock <= 0}
                onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, image: p.image })}
              >
                <i className="fal fa-shopping-cart cart"></i>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="product1" className="section-p1">
        <h2>Produktet e reja</h2>
        <div className="pro-container">
          {newArrivals.map((p) => (
            <div className="pro" key={`new-${p.id}`}>
              <Link to={`/product/${p.id}`}>
                <div className="lb-product-image-wrap">
                  <img src={p.image} alt={p.name} />
                  {p.stock <= 0 ? <span className="lb-stock-overlay">Out of Stock</span> : null}
                </div>
                <div className="des">
                  <span>{p.cat}</span>
                  <h5>{p.name}</h5>
                  <div className="star">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                  </div>
                  <h4>{p.price} €</h4>
                </div>
              </Link>
              <button
                type="button"
                className="add-to-cart"
                disabled={p.stock <= 0}
                onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, image: p.image })}
              >
                <i className="fal fa-shopping-cart cart"></i>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="banner" className="section-m1"></section>
    </>
  );
}
