// Real API when a backend is available (Cloudflare Worker).
// Falls back to a localStorage-backed mock when there isn't one.

import { CONFIG } from './config.js';
import { uid, readLS, writeLS } from './utils.js';

const LS = {
  products: 'nimbus_mock_products',
  carts:    'nimbus_mock_carts',
  orders:   'nimbus_mock_orders',
  sessions: 'nimbus_mock_sessions',
};

let MODE = null;

const SEED = [
  { id:'prod_aurora_hoodie', name:'Aurora Hoodie',     description:'Heavyweight fleece, unisex fit.',      price:4900, image:'', stock:25, created_at: Date.now() - 86400000 * 1 },
  { id:'prod_slate_tee',     name:'Slate Tee',         description:'Pima cotton, pre-shrunk.',             price:2400, image:'', stock:40, created_at: Date.now() - 86400000 * 2 },
  { id:'prod_nimbus_cap',    name:'Nimbus Cap',        description:'Six-panel, adjustable strap.',         price:2800, image:'', stock:30, created_at: Date.now() - 86400000 * 3 },
  { id:'prod_drift_bottle',  name:'Drift Bottle',      description:'Insulated 18oz stainless steel.',      price:3200, image:'', stock:22, created_at: Date.now() - 86400000 * 4 },
  { id:'prod_echo_socks',    name:'Echo Socks (3pk)',  description:'Cushioned crew socks.',                price:1800, image:'', stock:60, created_at: Date.now() - 86400000 * 5 },
  { id:'prod_halo_tote',     name:'Halo Tote',         description:'Waxed canvas everyday carry.',         price:3600, image:'', stock:18, created_at: Date.now() - 86400000 * 6 },
  { id:'prod_field_jacket',  name:'Field Jacket',      description:'Water-resistant cotton shell.',        price:12800, image:'', stock:9,  created_at: Date.now() - 86400000 * 7 },
  { id:'prod_merino_beanie', name:'Merino Beanie',     description:'Ribbed knit, extra fine merino.',      price:2900, image:'', stock:34, created_at: Date.now() - 86400000 * 8 },
];

function mockInit() {
  if (!readLS(LS.products)) writeLS(LS.products, SEED);
  if (!readLS(LS.carts))    writeLS(LS.carts, []);
  if (!readLS(LS.orders))   writeLS(LS.orders, []);
  if (!readLS(LS.sessions)) writeLS(LS.sessions, []);
}

async function detectMode() {
  if (MODE) return MODE;
  try {
    const r = await fetch('/api/products', { method: 'GET' });
    const ct = r.headers.get('content-type') || '';
    MODE = (r.ok && ct.includes('application/json')) ? 'real' : 'mock';
  } catch { MODE = 'mock'; }
  if (MODE === 'mock') mockInit();
  return MODE;
}

async function real(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = sessionStorage.getItem(CONFIG.STORAGE.adminToken);
  if (auth && token) headers['authorization'] = 'Bearer ' + token;

  const res = await fetch('/api' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e = new Error(data.error || `Request failed (${res.status})`);
    e.status = res.status; throw e;
  }
  return data;
}

const mock = {
  async products() { return { products: readLS(LS.products, []) }; },

  async addProduct(body) {
    const products = readLS(LS.products, []);
    const product = {
      id: uid('prod_'),
      name: body.name || 'Untitled',
      description: body.description || '',
      price: body.price || 0,
      image: body.image || '',
      stock: body.stock || 0,
      created_at: Date.now(),
    };
    products.unshift(product);
    writeLS(LS.products, products);
    return { product };
  },

  async deleteProduct(id) {
    writeLS(LS.products, readLS(LS.products, []).filter(p => p.id !== id));
    return { ok: true };
  },

  async getCart(id) {
    const carts = readLS(LS.carts, []);
    const cart = carts.find(c => c.id === id);
    return { cart: cart ? { id: cart.id, items: cart.items, status: cart.status, updatedAt: cart.updatedAt } : null };
  },

  async saveCart(cartId, items) {
    const carts = readLS(LS.carts, []);
    const now = Date.now();
    let cart = cartId ? carts.find(c => c.id === cartId) : null;
    if (cart) { cart.items = items; cart.updatedAt = now; }
    else { cart = { id: uid('cart_'), items, status: 'open', updatedAt: now }; carts.unshift(cart); }
    writeLS(LS.carts, carts.slice(0, 200));
    return { cart: { id: cart.id, items: cart.items, status: cart.status, updatedAt: cart.updatedAt } };
  },

  async checkout({ cartId, customer = {}, card = {} }) {
    const carts = readLS(LS.carts, []);
    const cart = cartId ? carts.find(c => c.id === cartId) : null;
    const items = cart ? cart.items : [];

    const products = readLS(LS.products, []);
    const pmap = new Map(products.map(p => [p.id, p]));
    const lines = items.map(i => {
      const p = pmap.get(i.productId);
      if (!p) return null;
      return { productId: p.id, name: p.name, price: p.price, qty: i.qty };
    }).filter(Boolean);
    if (!lines.length) throw new Error('Cart is empty');

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shipping = subtotal >= CONFIG.SHIPPING.freeThreshold ? 0 : CONFIG.SHIPPING.flat;
    const tax = Math.round(subtotal * CONFIG.TAX_RATE);
    const total = subtotal + shipping + tax;

    const num = String(card.number || '').replace(/\D/g, '');
    if (num.length < 15) throw new Error('Invalid card number');
    const brand = num[0] === '4' ? 'Visa'
      : /^5[1-5]/.test(num) ? 'Mastercard'
      : /^3[47]/.test(num) ? 'Amex'
      : /^6/.test(num) ? 'Discover' : 'Card';

    const order = {
      id: uid('ord_'),
      number: 'ORD-' + (Math.floor(Math.random() * 900000) + 100000),
      cart_id: cartId || null,
      customer_name: customer.name || '',
      customer_email: customer.email || '',
      shipping_address: [customer.address, customer.city, customer.zip, customer.country].filter(Boolean).join(', '),
      items: lines,
      subtotal, shipping, tax, total,
      status: 'paid',
      card_brand: brand,
      card_last4: num.slice(-4),
      payment_intent: 'pi_' + uid(),
      created_at: Date.now(),
    };

    const orders = readLS(LS.orders, []);
    orders.unshift(order);
    writeLS(LS.orders, orders);

    for (const l of lines) {
      const p = pmap.get(l.productId);
      if (p) p.stock = Math.max(0, p.stock - l.qty);
    }
    writeLS(LS.products, products);

    if (cart) { cart.status = 'fulfilled'; cart.updatedAt = Date.now(); writeLS(LS.carts, carts); }

    return { order };
  },

  async login(password) {
    if (password !== CONFIG.ADMIN_PASSWORD) throw new Error('Invalid password');
    const sessions = readLS(LS.sessions, []);
    const token = uid('tok_') + uid();
    sessions.push({ token, created_at: Date.now() });
    writeLS(LS.sessions, sessions);
    return { token };
  },

  async stats() {
    const orders = readLS(LS.orders, []);
    const carts = readLS(LS.carts, []);
    const products = readLS(LS.products, []);
    return { stats: {
      revenue: orders.filter(o => o.status !== 'refunded').reduce((s, o) => s + o.total, 0),
      orders: orders.length,
      carts: carts.filter(c => c.status === 'open').length,
      products: products.length,
    }};
  },

  async carts() {
    const carts = readLS(LS.carts, []);
    const products = readLS(LS.products, []);
    const pmap = new Map(products.map(p => [p.id, p]));
    return { carts: carts.map(c => {
      const lines = c.items.map(i => {
        const p = pmap.get(i.productId) || { name: 'Unknown', price: 0 };
        return { name: p.name, price: p.price, qty: i.qty };
      });
      return {
        id: c.id, status: c.status, updatedAt: c.updatedAt,
        count: c.items.reduce((s, i) => s + i.qty, 0),
        subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
        items: lines,
      };
    })};
  },

  async orders() {
    return { orders: readLS(LS.orders, []).map(o => ({
      id: o.id, number: o.number,
      customer_name: o.customer_name, customer_email: o.customer_email,
      total: o.total, status: o.status, created_at: o.created_at,
      item_count: o.items.reduce((s, i) => s + i.qty, 0),
    }))};
  },

  async order(id) {
    const o = readLS(LS.orders, []).find(x => x.id === id);
    if (!o) throw new Error('Order not found');
    return { order: o };
  },

  async updateOrder(id, status) {
    const orders = readLS(LS.orders, []);
    const o = orders.find(x => x.id === id);
    if (!o) throw new Error('Order not found');
    o.status = status;
    writeLS(LS.orders, orders);
    return { ok: true };
  },
};

export const api = {
  async products() {
    const mode = await detectMode();
    return mode === 'real' ? real('/products') : mock.products();
  },
  async addProduct(body) {
    const mode = await detectMode();
    return mode === 'real' ? real('/products', { method:'POST', auth:true, body }) : mock.addProduct(body);
  },
  async deleteProduct(id) {
    const mode = await detectMode();
    return mode === 'real'
      ? real('/products/' + encodeURIComponent(id), { method:'DELETE', auth:true })
      : mock.deleteProduct(id);
  },
  async getCart(id) {
    const mode = await detectMode();
    return mode === 'real' ? real('/cart?id=' + encodeURIComponent(id)) : mock.getCart(id);
  },
  async saveCart(cartId, items) {
    const mode = await detectMode();
    return mode === 'real'
      ? real('/cart', { method:'POST', body: { cartId, items } })
      : mock.saveCart(cartId, items);
  },
  async checkout(body) {
    const mode = await detectMode();
    return mode === 'real' ? real('/checkout', { method:'POST', body }) : mock.checkout(body);
  },
  async login(password) {
    const mode = await detectMode();
    return mode === 'real' ? real('/admin/login', { method:'POST', body:{ password } }) : mock.login(password);
  },
  async stats() {
    const mode = await detectMode();
    return mode === 'real' ? real('/admin/stats', { auth:true }) : mock.stats();
  },
  async carts() {
    const mode = await detectMode();
    return mode === 'real' ? real('/admin/carts', { auth:true }) : mock.carts();
  },
  async orders() {
    const mode = await detectMode();
    return mode === 'real' ? real('/orders', { auth:true }) : mock.orders();
  },
  async order(id) {
    const mode = await detectMode();
    return mode === 'real' ? real('/orders/' + encodeURIComponent(id), { auth:true }) : mock.order(id);
  },
  async updateOrder(id, status) {
    const mode = await detectMode();
    return mode === 'real'
      ? real('/orders/' + encodeURIComponent(id), { method:'PATCH', auth:true, body:{ status } })
      : mock.updateOrder(id, status);
  },
  mode() { return MODE; },
};
