import { store } from './store.js';
import { api } from './api.js';
import { CONFIG } from './config.js';
import { $, money, esc, initials, toast } from './utils.js';

export function updateCartBadge() {
  const el = $('#cartCount');
  if (el) el.textContent = store.cartCount();
  const w = $('#wishCount');
  if (w) {
    const n = store.wishlist.length;
    w.hidden = n === 0;
    w.textContent = n;
  }
}

export function openCart()  { $('#cartDrawer').classList.add('open'); }
export function closeCart() { $('#cartDrawer').classList.remove('open'); }

export async function addToCart(productId) {
  const line = store.items.find(i => i.productId === productId);
  if (line) line.qty = Math.min(99, line.qty + 1);
  else store.items.push({ productId, qty: 1 });
  updateCartBadge(); renderCart(); openCart();
  await syncCart();
}

export function setQty(productId, qty) {
  const line = store.items.find(i => i.productId === productId);
  if (!line) return;
  line.qty = Math.max(0, Math.min(99, qty));
  if (line.qty === 0) store.items = store.items.filter(i => i.productId !== productId);
  updateCartBadge(); renderCart();
  syncCart();
}

export async function loadCart() {
  try {
    if (store.cartId) {
      const { cart } = await api.getCart(store.cartId);
      if (cart) {
        store.items = cart.items.map(i => ({ productId: i.productId, qty: i.qty }));
        updateCartBadge(); renderCart(); return;
      }
    }
    const { cart } = await api.saveCart(null, []);
    store.cartId = cart.id;
    localStorage.setItem(CONFIG.STORAGE.cart, cart.id);
    store.items = [];
  } catch (e) { console.error(e); }
  updateCartBadge(); renderCart();
}

export async function syncCart() {
  try {
    const { cart } = await api.saveCart(store.cartId, store.items);
    store.cartId = cart.id;
    localStorage.setItem(CONFIG.STORAGE.cart, cart.id);
    store.items = cart.items.map(i => ({ productId: i.productId, qty: i.qty }));
    updateCartBadge(); renderCart();
  } catch (e) { toast(e.message, 'error'); }
}

export function renderCart() {
  const lines = store.cartLines();
  const t = store.totals();
  const freeShipThreshold = CONFIG.SHIPPING.freeThreshold;
  const progress = Math.min(100, (t.sub / freeShipThreshold) * 100);
  const remaining = Math.max(0, freeShipThreshold - t.sub);

  $('#cartDrawer').innerHTML = `
    <div class="drawer-head">
      <h2>Your bag (${store.cartCount()})</h2>
      <button class="close" data-close-cart>&times;</button>
    </div>

    ${lines.length ? `
      <div class="ship-bar">
        ${remaining > 0
          ? `Add <b>${money(remaining)}</b> more for free shipping`
          : `<b>✓ Free shipping unlocked</b>`}
        <div class="ship-track"><div class="ship-fill" style="width:${progress}%"></div></div>
      </div>` : ''}

    <div class="drawer-body">
      ${lines.length ? lines.map(l => `
        <div class="line">
          <div class="thumb">${l.image
            ? `<img src="${esc(l.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`
            : esc(initials(l.name))}</div>
          <div class="info">
            <b>${esc(l.name)}</b>
            <span class="price">${money(l.price)}</span>
            <div class="qty" style="margin-top:8px">
              <button data-dec="${esc(l.productId)}">−</button>
              <span>${l.qty}</span>
              <button data-inc="${esc(l.productId)}">+</button>
            </div>
          </div>
          <div class="right-col">
            <div class="line-total">${money(l.price * l.qty)}</div>
            <button class="remove" data-del="${esc(l.productId)}">Remove</button>
          </div>
        </div>`).join('')
      : `<div class="empty"><div class="big">🛍️</div>Your bag is empty.<br><a href="#/" style="color:var(--brand);font-weight:600" data-close-cart>Start shopping →</a></div>`}
    </div>

    ${lines.length ? `
      <div class="drawer-foot">
        <div class="sumrow"><span>Subtotal</span><span>${money(t.sub)}</span></div>
        ${t.disc ? `<div class="sumrow" style="color:var(--good)"><span>Discount</span><span>−${money(t.disc)}</span></div>` : ''}
        <div class="sumrow"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></div>
        <div class="sumrow"><span>Estimated tax</span><span>${money(t.tax)}</span></div>
        <div class="sumrow total"><span>Total</span><span>${money(t.total)}</span></div>

        ${store.coupon
          ? `<div class="coupon-pill">✓ ${esc(CONFIG.COUPONS[store.coupon]?.label || store.coupon)}
               <button data-clear-coupon>&times;</button></div>`
          : `<div class="coupon-row">
               <input id="couponInput" placeholder="Promo code" autocomplete="off">
               <button data-apply-coupon>Apply</button>
             </div>`}

        <button class="btn" data-checkout>Checkout →</button>
        <div class="trust-mini">
          <span>🔒 Secure</span><span>↩ 30-day returns</span><span>🚚 Fast ship</span>
        </div>
      </div>` : ''}`;
}
