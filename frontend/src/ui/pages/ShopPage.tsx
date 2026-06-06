import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { addToCart } from '../layout/cart/cartStorage';
import { legacyAsset } from '../lib/assets';
import { API_BASE } from '../lib/api';

const fallbackProducts: Product[] = [
  {
    id: 'p1',
    sku: 'DEMO-P1',
    name: 'Samsung Galaxy S24 Ultra',
    priceCents: 90000,
    images: [{ url: legacyAsset('img/telefonat/65.png') }],
    categories: [{ category: { name: 'Telefona' } }],
  },
  {
    id: 'p2',
    sku: 'DEMO-P2',
    name: 'Dahua PTZ-SD3A',
    priceCents: 41500,
    images: [{ url: legacyAsset('img/kamera/2.png') }],
    categories: [{ category: { name: 'Kamera' } }],
  },
  {
    id: 'p3',
    sku: 'DEMO-P3',
    name: 'Dahua Siren e Jashtme',
    priceCents: 6500,
    images: [{ url: legacyAsset('img/kamera/35.png') }],
    categories: [{ category: { name: 'Kamera' } }],
  },
  {
    id: 'n1',
    sku: 'DEMO-N1',
    name: 'Fonestar P100',
    priceCents: 12500,
    images: [{ url: legacyAsset('img/zerim/zerim/19.png') }],
    categories: [{ category: { name: 'Pajisje Zërimi' } }],
  },
];

type Product = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  images: { url: string }[];
  categories: { category: { name: string } }[];
  inventory?: { quantity: number } | null;
};

type ShopMode = 'shop' | 'telefona' | 'kamera' | 'audio' | 'aksesore';

function shopModeFromPath(pathname: string): ShopMode {
  if (pathname.startsWith('/telefona')) return 'telefona';
  if (pathname.startsWith('/kamera')) return 'kamera';
  if (pathname.startsWith('/audio')) return 'audio';
  if (pathname.startsWith('/aksesore')) return 'aksesore';
  return 'shop';
}

function headerIdForMode(mode: ShopMode): string {
  switch (mode) {
    case 'telefona':
      return 'page-header1';
    case 'kamera':
      return 'page-header2';
    case 'audio':
      return 'page-header3';
    case 'aksesore':
      return 'page-header4';
    default:
      return 'page-header';
  }
}

function forcedCategory(mode: ShopMode): string | undefined {
  switch (mode) {
    case 'telefona':
      return 'Telefona';
    case 'kamera':
      return 'Kamera';
    case 'audio':
      return 'Pajisje Zërimi';
    case 'aksesore':
      return 'Aksesorë';
    default:
      return undefined;
  }
}

export function ShopPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const mode = shopModeFromPath(location.pathname);
  const headerId = headerIdForMode(mode);
  const forced = forcedCategory(mode);
  const categoryFromQuery = params.get('category') ?? undefined;
  const category = forced ?? categoryFromQuery;

  const [items, setItems] = useState<Product[]>(fallbackProducts);

  useEffect(() => {
    const load = async () => {
      try {
        const pageSize = 250;
        const acc: Product[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await axios.get(`${API_BASE}/products`, {
            params: { category, page, pageSize },
            paramsSerializer: {
              serialize: (p) => {
                const e = new URLSearchParams();
                Object.entries(p).forEach(([k, v]) => {
                  if (v === undefined || v === null || v === '') return;
                  e.set(k, String(v));
                });
                return e.toString();
              },
            },
          });
          const d = res.data;
          const chunk: Product[] = Array.isArray(d)
            ? d
            : d && typeof d === 'object' && Array.isArray((d as { items?: unknown }).items)
              ? ((d as { items: Product[] }).items ?? [])
              : [];
          const tp =
            d && typeof d === 'object' && typeof (d as { totalPages?: unknown }).totalPages === 'number'
              ? (d as { totalPages: number }).totalPages
              : 1;
          acc.push(...chunk);
          totalPages = tp;
          page += 1;
        } while (page <= totalPages && page <= 20);
        setItems(acc);
      } catch (e) {
        console.error('[ShopPage] Dështoi ngarkimi i produkteve', e);
        setItems(
          category
            ? fallbackProducts.filter((p) => (p.categories?.[0]?.category?.name ?? '') === category)
            : fallbackProducts,
        );
      }
    };
    load();
  }, [category]);

  const newArrivalsActive = mode === 'shop' && !categoryFromQuery && !forced;

  return (
    <>
      <section id={headerId}></section>

      <section id="category-buttons" className="section-p1">
        <div className="category-container">
          <Link className={`category-btn ${newArrivalsActive ? 'active' : ''}`} to="/shop">
            New Arrivals
          </Link>
          <Link className={`category-btn ${mode === 'telefona' ? 'active' : ''}`} to="/telefona">
            Telefona
          </Link>
          <Link className={`category-btn ${mode === 'kamera' ? 'active' : ''}`} to="/kamera">
            Kamera
          </Link>
          <Link className={`category-btn ${mode === 'audio' ? 'active' : ''}`} to="/audio">
            Pajisje Zërimi
          </Link>
          <Link className={`category-btn ${mode === 'aksesore' ? 'active' : ''}`} to="/aksesore">
            Aksesorë
          </Link>
        </div>
      </section>

      <section id="product1" className="section-p1">
        <div className="pro-container">
          {items.map((p) => {
            const img = p.images?.[0]?.url || legacyAsset('img/logo.png');
            const cat = p.categories?.[0]?.category?.name ?? '';
            const price = (p.priceCents / 100).toFixed(2);
            const stock = p.inventory?.quantity ?? 0;
            return (
              <div className="pro" key={p.id}>
                <Link to={`/product/${p.id}`}>
                  <div className="lb-product-image-wrap">
                    <img src={img} alt={p.name} />
                    {stock <= 0 ? <span className="lb-stock-overlay">Out of Stock</span> : null}
                  </div>
                  <div className="des">
                    <span>{cat}</span>
                    <h5>{p.name}</h5>
                    <div className="star">
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                    </div>
                    <h4>{price} €</h4>
                  </div>
                </Link>
                <button
                  type="button"
                  className="add-to-cart"
                  disabled={stock <= 0}
                  onClick={() =>
                    addToCart({
                      id: p.id,
                      name: p.name,
                      price: Number(price),
                      image: img,
                    })
                  }
                >
                  <i className="fal fa-shopping-cart cart"></i>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section id="pagination" className="section-p1">
        <a href="#">1</a>
        <a href="#">2</a>
        <a href="#">
          <i className="fal fa-long-arrow-alt-right "></i>
        </a>
      </section>
    </>
  );
}
