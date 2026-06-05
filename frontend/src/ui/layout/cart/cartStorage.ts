import axios from 'axios';
import { API_BASE, userAuthHeaders } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

let memoryCart: CartItem[] = [];

function emitCartChanged(items: CartItem[], source: 'add' | 'update' | 'write') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('lb:cart:changed', {
      detail: { items, source },
    }),
  );
}

function normalize(items: unknown[]): CartItem[] {
  return items
    .map((x) => {
      const row = x as {
        id?: unknown;
        name?: unknown;
        price?: unknown;
        image?: unknown;
        quantity?: unknown;
      };
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        price: Number(row.price ?? 0),
        image: String(row.image ?? ''),
        quantity: Math.max(1, Number(row.quantity ?? 1)),
      };
    })
    .filter((x) => x.id && x.name && Number.isFinite(x.price));
}

function hasUserSession() {
  return !!useAuthStore.getState().userToken;
}

async function pushCartToServer(items: CartItem[]) {
  if (!hasUserSession()) return;
  try {
    await axios.put(
      `${API_BASE}/carts/me`,
      { items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) },
      { headers: userAuthHeaders() },
    );
  } catch (error) {
    console.error('[cartStorage] Failed syncing cart to server', error);
  }
}

export function readCart(): CartItem[] {
  return [...memoryCart];
}

export function writeCart(items: CartItem[]) {
  memoryCart = normalize(items);
  emitCartChanged(memoryCart, 'write');
  void pushCartToServer(memoryCart);
}

export function addToCart(item: Omit<CartItem, 'quantity'>, qty = 1) {
  const cart = [...memoryCart];
  const existing = cart.find((c) => c.id === item.id);
  if (existing) existing.quantity += Math.max(1, qty);
  else cart.push({ ...item, quantity: Math.max(1, qty) });
  memoryCart = normalize(cart);
  void pushCartToServer(memoryCart);
  emitCartChanged(cart, 'add');
  return cart;
}

export function updateQuantity(id: string, qty: number) {
  const cart = [...memoryCart];
  const idx = cart.findIndex((c) => c.id === id);
  if (idx === -1) return cart;
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].quantity = qty;
  memoryCart = normalize(cart);
  void pushCartToServer(memoryCart);
  emitCartChanged(memoryCart, 'update');
  return memoryCart;
}

export async function hydrateCartForSession() {
  if (!hasUserSession()) {
    memoryCart = [];
    emitCartChanged(memoryCart, 'write');
    return;
  }
  try {
    const res = await axios.get(`${API_BASE}/carts/me`, { headers: userAuthHeaders() });
    const itemsRaw = Array.isArray(res.data?.items) ? res.data.items : [];
    memoryCart = normalize(
      itemsRaw.map((row: { productId: string; productName: string; unitPriceCents: number; imageUrl?: string; quantity: number }) => ({
        id: row.productId,
        name: row.productName,
        price: row.unitPriceCents / 100,
        image: row.imageUrl ?? '',
        quantity: row.quantity,
      })),
    );
    emitCartChanged(memoryCart, 'write');
  } catch (error) {
    console.error('[cartStorage] Failed hydrating cart from server', error);
    memoryCart = [];
    emitCartChanged(memoryCart, 'write');
  }
}

