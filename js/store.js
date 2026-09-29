import { CONFIG } from './config.js';
import { readLS, writeLS } from './utils.js';

export const store = {
  products: [],
  items: [],
  wishlist: readLS(CONFIG.STORAGE.wishlist, []),
  recent: readLS(CONFIG.STORAGE.recent, []),
  coupon: readLS(CONFIG.STORAGE.coupon, null),
  cartId: localStorage.getItem(CONFIG.STORAGE.cart) || null,
  token: sessionStorage.getItem(CONFIG.STORAGE.adminToken) || null,

  filter: 'all',
  search: '',
  sort: 'featured',

  adminTab: 'overview',
  currentOrderId: null,

  /* --- computed --- */
  cartLines() {
    return this.items.map(i => {
      const p = this.products.find(x => x.id === i.productId) || { name:'Item', price:0, image:'' };
      return { productId: i.productId, qty: i.qty, name: p.name, price: p.price, image: p.image };
    });
  },
  cartSubtotal() { return this.cartLines().reduce((s, l) => s + l.price * l.qty, 0); },
  cartCount()    { return this.items.reduce((s, i) => s + i.qty, 0); },

  discount() {
    if (!this.coupon) return 0;
    const c = CONFIG.COUPONS[this.coupon];
    if (!c) return 0;
    const sub = this.cartSubtotal();
    if (c.type === 'percent')  return Math.round(sub * c.value / 100);
    if (c.type === 'flat')     return Math.min(sub, c.value);
    return 0;
  },
  shippingFor(subtotal) {
    const freeViaCoupon = this.coupon && CONFIG.COUPONS[this.coupon]?.type === 'shipping';
    if (freeViaCoupon) return 0;
    if (subtotal === 0) return 0;
    return subtotal >= CONFIG.SHIPPING.freeThreshold ? 0 : CONFIG.SHIPPING.flat;
  },
  totals() {
    const sub = this.cartSubtotal();
    const disc = this.discount();
    const shipping = this.shippingFor(sub - disc);
    const taxable = Math.max(0, sub - disc);
    const tax = Math.round(taxable * CONFIG.TAX_RATE);
    return { sub, disc, shipping, tax, total: taxable + shipping + tax };
  },

  /* --- wishlist / recent --- */
  isWished(id) { return this.wishlist.includes(id); },
  toggleWish(id) {
    if (this.isWished(id)) this.wishlist = this.wishlist.filter(x => x !== id);
    else this.wishlist = [...this.wishlist, id];
    writeLS(CONFIG.STORAGE.wishlist, this.wishlist);
    return this.isWished(id);
  },

  pushRecent(id) {
    this.recent = [id, ...this.recent.filter(x => x !== id)].slice(0, 6);
    writeLS(CONFIG.STORAGE.recent, this.recent);
  },

  /* --- coupon --- */
  applyCoupon(code) {
    const key = String(code || '').trim().toUpperCase();
    if (!CONFIG.COUPONS[key]) return { ok: false, error: 'Invalid code' };
    this.coupon = key;
    writeLS(CONFIG.STORAGE.coupon, key);
    return { ok: true, label: CONFIG.COUPONS[key].label };
  },
  clearCoupon() {
    this.coupon = null;
    localStorage.removeItem(CONFIG.STORAGE.coupon);
  },
};
