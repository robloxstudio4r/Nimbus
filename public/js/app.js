import { store } from './store.js';
import { CONFIG } from './config.js';
import { $, toast, readLS, writeLS } from './utils.js';
import { api } from './api.js';
import { loadCart, addToCart, setQty, openCart, closeCart, updateCartBadge, renderCart } from './cart.js';
import { loadProducts, renderShop, openQuickView, closeModal } from './shop.js';
import { openCheckout } from './checkout.js';
import { renderAdmin, adminLogout, adminActions } from './admin.js';
import { renderTrack, submitTrack } from './track.js';
import { submitContact } from './contact.js';
import { route } from './router.js';

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  writeLS(CONFIG.STORAGE.theme, mode);
}

/* ---------- click delegation ---------- */
document.addEventListener('click', async e => {
  const t = e.target;

  if (t.closest('[data-nav-home]') || t.closest('[data-nav-shop]')) {
    location.hash = '#/'; return;
  }
  if (t.closest('[data-nav-track]'))   { location.hash = '#/track';   return; }
  if (t.closest('[data-nav-contact]')) { location.hash = '#/contact'; return; }
  if (t.closest('[data-nav-admin]'))   { location.hash = '#/admin';   return; }

  const scroll = t.closest('[data-scroll]');
  if (scroll) {
    const el = document.querySelector(scroll.dataset.scroll);
    el?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (t.closest('#themeToggle')) {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
    return;
  }

  if (t.closest('#wishBtn')) {
    store.filter = 'wish';
    if (location.hash !== '#/' && location.hash !== '') location.hash = '#/';
    renderShop();
    return;
  }

  if (t.closest('#searchClear')) {
    store.search = '';
    $('#searchInput').value = '';
    $('#searchClear').hidden = true;
    renderShop();
    return;
  }

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

  const qv = t.closest('[data-quickview]');
  if (qv) { openQuickView(qv.dataset.quickview); return; }

  const filter = t.closest('[data-filter]');
  if (filter) { store.filter = filter.dataset.filter; renderShop(); return; }

  if (t.closest('#cartBtn')) {
    $('#cartDrawer').classList.contains('open') ? closeCart() : openCart();
    return;
  }
  if (t.closest('[data-close-cart]')) return closeCart();

  if (t.closest('[data-checkout]')) return openCheckout();
  if (t.closest('[data-close-modal]')) return closeModal();

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

  /* --- admin actions --- */
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

  const delSub = t.closest('[data-del-subscriber]');
  if (delSub) return adminActions.deleteSubscriber(delSub.dataset.delSubscriber);

  const delMsg = t.closest('[data-del-message]');
  if (delMsg) return adminActions.deleteMessage(delMsg.dataset.delMessage);

  const markRead = t.closest('[data-message-status]');
  if (markRead) return adminActions.updateMessageStatus(
    markRead.dataset.msgId, markRead.dataset.messageStatus
  );

  const viewMsg = t.closest('[data-view-message]');
  if (viewMsg) return adminActions.viewMessage(viewMsg.dataset.viewMessage);
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
    handleNewsletter(e);
    return;
  }
  if (e.target.id === 'trackForm') {
    e.preventDefault();
    submitTrack(e);
    return;
  }
  if (e.target.id === 'contactForm') {
    e.preventDefault();
    submitContact(e);
    return;
  }
});

async function handleNewsletter(e) {
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  const email = String(fd.get('email') || '').trim();

  btn.disabled = true;
  btn.textContent = 'Subscribing…';

  try {
    const res = await api.subscribe({ name, email });
    toast(res.alreadySubscribed ? "You're already on the list!" : 'Thanks for subscribing!');
    form.reset();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  }
}

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
