import { store } from './store.js';
import { CONFIG } from './config.js';
import { $, toast, readLS, writeLS } from './utils.js';
import { api } from './api.js';
import { loadCart, addToCart, setQty, openCart, closeCart, updateCartBadge, renderCart } from './cart.js';
import { loadProducts, renderShop, openQuickView, closeModal } from './shop.js';
import { openCheckout } from './checkout.js';
import { renderAdmin, adminLogout, adminActions } from './admin.js';
import { renderTrack, submitTrack } from './track.js';
import { route } from './router.js';

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  writeLS(CONFIG.STORAGE.theme, mode);
}

/* ---------- click delegation ---------- */
document.addEventListener('click', async e => {
  const t = e.target;

  // Navigation
  if (t.closest('[data-nav-home]') || t.closest('[data-nav-shop]')) {
    location.hash = '#/'; return;
  }
  if (t.closest('[data-nav-track]')) { location.hash = '#/track'; return; }
  if (t.closest('[data-nav-admin]')) { location.hash = '#/admin'; return; }

  const scroll = t.closest('[data-scroll]');
  if (scroll) {
    const el = document.querySelector(scroll.dataset.scroll);
    el?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Theme
  if (t.closest('#themeToggle')) {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    return;
  }

  // Wishlist header
  if (t.closest('#wishBtn')) {
    store.filter = 'wish';
    if (location.hash !== '#/' && location.hash !== '') location.hash = '#/';
    renderShop();
    return;
  }

  // Search clear
  if (t.closest('#searchClear')) {
    store.search = '';
    $('#searchInput').value = '';
    $('#searchClear').hidden = true;
    renderShop();
    return;
  }

  // Cart actions
  const add = t.closest('[data-add]');
  if (add) { addToCart(add.dataset.add); return; }

  const inc = t.closest('[data-inc]');
  if (inc) {
    const line = store.items.find(i => i.productId === inc.dataset.inc);
    return setQty(inc.dataset.inc, (line ? line.qty : 0) + 1);
  }
  const dec = t.closest('[data-dec]');
  if (dec) {
    const line = store.items.find(i => i.productId === dec.dataset.dec);
    return setQty(dec.dataset.dec, (line ? line.qty : 0) - 1);
  }
  const del = t.closest('[data-del]');
  if (del) return setQty(del.dataset.del, 0);

  // Wishlist toggle
  const wish = t.closest('[data-wish]');
  if (wish) {
    e.stopPropagation();
    const on = store.toggleWish(wish.dataset.wish);
    toast(on ? 'Added to wishlist' : 'Removed from wishlist');
    renderShop();
    updateCartBadge();
    if ($('[data-modal]')) openQuickView(wish.dataset.wish);
    return;
  }

  // Quick view
  const qv = t.closest('[data-quickview]');
  if (qv) { openQuickView(qv.dataset.quickview); return; }

  // Filters / sort
  const filter = t.closest('[data-filter]');
  if (filter) { store.filter = filter.dataset.filter; renderShop(); return; }

  // Cart drawer
  if (t.closest('#cartBtn')) {
    $('#cartDrawer').classList.contains('open') ? closeCart() : openCart();
    return;
  }
  if (t.closest('[data-close-cart]')) return closeCart();

  // Checkout / modal
  if (t.closest('[data-checkout]')) return openCheckout();
  if (t.closest('[data-close-modal]')) return closeModal();

  // Coupon
  if (t.closest('[data-apply-coupon]')) {
    const input = $('#couponInput');
    const res = store.applyCoupon(input?.value);
    if (res.ok) { toast('Coupon applied: ' + res.label); renderCart(); }
    else toast(res.error || 'Invalid coupon', 'error');
    return;
  }
  if (t.closest('[data-clear-coupon]')) {
    store.clearCoupon(); renderCart(); return;
  }

  // Admin
  const tab = t.closest('[data-tab]');
  if (tab) return adminActions.setTab(tab.dataset.tab);
  if (t.closest('[data-logout]')) return adminLogout();

  const order = t.closest('[data-order]');
  if (order) return adminActions.openOrder(order.dataset.order);
  if (t.closest('[data-back-orders]')) return adminActions.backToOrders();

  const delP = t.closest('[data-del-product]');
  if (delP) return adminActions.deleteProduct(delP.dataset.delProduct);

  const ref = t.closest('[data-refund]');
  if (ref) return adminActions.refund(ref.dataset.refund);

  const quick = t.closest('[data-quick-ship]');
  if (quick) return adminActions.quickShip(quick.dataset.quickShip);
});

/* ---------- input ---------- */
document.addEventListener('input', e => {
  if (e.target.id === 'searchInput') {
    store.search = e.target.value.trim();
    $('#searchClear').hidden = !store.search;
    renderShop();
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'sortSelect') {
    store.sort = e.target.value;
    renderShop();
  }
});

/* ---------- submit ---------- */
document.addEventListener('submit', e => {
  if (e.target.matches('[data-newsletter]')) {
    e.preventDefault();
    toast('Thanks for subscribing!');
    e.target.reset();
    return;
  }
  if (e.target.id === 'trackForm') {
    e.preventDefault();
    submitTrack(e);
    return;
  }
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); }
  if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    $('#searchInput')?.focus();
  }
});

/* ---------- hash router ---------- */
window.addEventListener('hashchange', route);

/* ---------- boot ---------- */
(async function boot() {
  const savedTheme = readLS(CONFIG.STORAGE.theme, 'light');
  applyTheme(savedTheme);

  try {
    await loadProducts();
  } catch (e) {
    $('#view-shop').innerHTML = `<div class="panel"><div class="empty">
      Could not load products.<br><span class="small">${e.message}</span></div></div>`;
  }

  await loadCart();
  route();

  setTimeout(() => {
    const sel = $('#sortSelect');
    if (sel) sel.value = store.sort;
  }, 0);
})();
