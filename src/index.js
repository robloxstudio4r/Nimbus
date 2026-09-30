// Nimbus Store — Cloudflare Worker API + static asset passthrough

const DEFAULT_ADMIN_PASSWORD = '06142014Aa@';

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

const err = (message, status = 400) => json({ error: message }, { status });

const uid = (prefix = '') =>
  prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 20);

const orderNumber = () =>
  'ORD-' + (Math.floor(Math.random() * 900000) + 100000);

const cardBrand = (num) => {
  if (/^4/.test(num)) return 'Visa';
  if (/^5[1-5]/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'Amex';
  if (/^6/.test(num)) return 'Discover';
  return 'Card';
};

async function requireAuth(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const row = await env.DB
    .prepare('SELECT token FROM sessions WHERE token = ?')
    .bind(token)
    .first();
  return row ? token : null;
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;

  try {
    if (!env.DB) {
      return json({ error: 'Database not configured' }, { status: 503 });
    }

    /* ===== PUBLIC ===== */

    if (path === '/products' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT * FROM products ORDER BY created_at DESC')
        .all();
      return json({ products: results });
    }

    if (path === '/cart' && method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return json({ cart: null });
      const cart = await env.DB
        .prepare('SELECT * FROM carts WHERE id = ?')
        .bind(id)
        .first();
      if (!cart) return json({ cart: null });
      return json({
        cart: { id: cart.id, items: JSON.parse(cart.items), status: cart.status, updatedAt: cart.updated_at },
      });
    }

    if (path === '/cart' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const items = Array.isArray(body.items) ? body.items : [];
      const now = Date.now();
      let id = body.cartId;

      if (id) {
        const exists = await env.DB
          .prepare('SELECT id FROM carts WHERE id = ?').bind(id).first();
        if (exists) {
          await env.DB
            .prepare('UPDATE carts SET items = ?, updated_at = ? WHERE id = ?')
            .bind(JSON.stringify(items), now, id)
            .run();
        } else {
          id = null;
        }
      }
      if (!id) {
        id = uid('cart_');
        await env.DB
          .prepare('INSERT INTO carts (id, items, status, updated_at) VALUES (?, ?, ?, ?)')
          .bind(id, JSON.stringify(items), 'open', now)
          .run();
      }
      return json({ cart: { id, items, status: 'open', updatedAt: now } });
    }

    if (path === '/checkout' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { cartId, customer = {}, card = {} } = body;

      let items = [];
      if (cartId) {
        const cart = await env.DB
          .prepare('SELECT * FROM carts WHERE id = ?').bind(cartId).first();
        if (cart) items = JSON.parse(cart.items);
      }
      if (!items.length) return err('Cart is empty');

      const ids = items.map((i) => i.productId);
      const placeholders = ids.map(() => '?').join(',');
      const { results: products } = await env.DB
        .prepare(`SELECT * FROM products WHERE id IN (${placeholders})`)
        .bind(...ids)
        .all();
      const pmap = new Map(products.map((p) => [p.id, p]));

      const lines = items
        .map((i) => {
          const p = pmap.get(i.productId);
          if (!p) return null;
          return { productId: p.id, name: p.name, price: p.price, qty: i.qty };
        })
        .filter(Boolean);
      if (!lines.length) return err('No valid items in cart');

      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const shipping = subtotal >= 7500 ? 0 : 599;
      const tax = Math.round(subtotal * 0.08);
      const total = subtotal + shipping + tax;

      const num = String(card.number || '').replace(/\D/g, '');
      if (num.length < 15) return err('Invalid card number');

      const id = uid('ord_');
      const number = orderNumber();
      const now = Date.now();
      const shippingAddress = [
        customer.address, customer.city, customer.zip, customer.country,
      ].filter(Boolean).join(', ');
      const intent = 'pi_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      await env.DB
        .prepare(
          `INSERT INTO orders
            (id, number, cart_id, customer_name, customer_email, shipping_address,
             items, subtotal, shipping, tax, total, status,
             card_brand, card_last4, payment_intent, created_at,
             shipping_status, carrier, tracking_number, estimated_delivery, shipping_notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id, number, cartId || null,
          customer.name || '', customer.email || '', shippingAddress,
          JSON.stringify(lines), subtotal, shipping, tax, total, 'paid',
          cardBrand(num), num.slice(-4), intent, now,
          'processing', '', '', '', ''
        )
        .run();

      for (const l of lines) {
        await env.DB
          .prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
          .bind(l.qty, l.productId)
          .run();
      }

      if (cartId) {
        await env.DB
          .prepare('UPDATE carts SET status = ?, updated_at = ? WHERE id = ?')
          .bind('fulfilled', now, cartId)
          .run();
      }

      return json({
        order: {
          id, number, items: lines, subtotal, shipping, tax, total,
          status: 'paid', created_at: now,
          customer_name: customer.name || '',
          customer_email: customer.email || '',
          shipping_address: shippingAddress,
          card_brand: cardBrand(num),
          card_last4: num.slice(-4),
          payment_intent: intent,
          shipping_status: 'processing',
        },
      });
    }

    // Public order tracking (requires order number + matching email)
    if (path === '/track' && method === 'GET') {
      const number = (url.searchParams.get('number') || '').trim().toUpperCase();
      const email  = (url.searchParams.get('email')  || '').trim().toLowerCase();
      if (!number || !email) return err('Order number and email are required');

      const row = await env.DB
        .prepare('SELECT * FROM orders WHERE UPPER(number) = ?')
        .bind(number)
        .first();

      if (!row) return err('Order not found', 404);
      if ((row.customer_email || '').toLowerCase() !== email) {
        return err('Order not found', 404);
      }

      return json({
        order: {
          number: row.number,
          status: row.status,
          shipping_status: row.shipping_status || 'processing',
          carrier: row.carrier || '',
          tracking_number: row.tracking_number || '',
          estimated_delivery: row.estimated_delivery || '',
          shipping_notes: row.shipping_notes || '',
          items: JSON.parse(row.items),
          subtotal: row.subtotal,
          shipping: row.shipping,
          tax: row.tax,
          total: row.total,
          customer_name: row.customer_name,
          shipping_address: row.shipping_address,
          created_at: row.created_at,
        },
      });
    }

    if (path === '/admin/login' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const expected = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
      if (body.password !== expected) return err('Invalid password', 401);

      const token = uid('tok_') + uid('');
      await env.DB
        .prepare('INSERT INTO sessions (token, created_at) VALUES (?, ?)')
        .bind(token, Date.now())
        .run();
      return json({ token });
    }

    /* ===== AUTH REQUIRED ===== */
    const token = await requireAuth(request, env);
    if (!token) return err('Unauthorized', 401);

    if (path === '/products' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const id = uid('prod_');
      await env.DB
        .prepare(
          `INSERT INTO products (id, name, description, price, image, stock, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          String(body.name || 'Untitled').slice(0, 120),
          String(body.description || '').slice(0, 500),
          Math.max(0, parseInt(body.price, 10) || 0),
          String(body.image || '').slice(0, 500),
          Math.max(0, parseInt(body.stock, 10) || 0),
          Date.now()
        )
        .run();
      const product = await env.DB
        .prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
      return json({ product });
    }

    const productMatch = path.match(/^\/products\/([^/]+)$/);
    if (productMatch && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productMatch[1]).run();
      return json({ ok: true });
    }

    if (path === '/admin/stats' && method === 'GET') {
      const [revenue, ordersCount, cartsCount, productsCount] = await Promise.all([
        env.DB.prepare("SELECT COALESCE(SUM(total), 0) AS r FROM orders WHERE status != 'refunded'").first(),
        env.DB.prepare('SELECT COUNT(*) AS c FROM orders').first(),
        env.DB.prepare("SELECT COUNT(*) AS c FROM carts WHERE status = 'open'").first(),
        env.DB.prepare('SELECT COUNT(*) AS c FROM products').first(),
      ]);
      return json({
        stats: {
          revenue: revenue?.r || 0,
          orders: ordersCount?.c || 0,
          carts: cartsCount?.c || 0,
          products: productsCount?.c || 0,
        },
      });
    }

    if (path === '/admin/carts' && method === 'GET') {
      const { results: carts } = await env.DB
        .prepare('SELECT * FROM carts ORDER BY updated_at DESC LIMIT 100')
        .all();

      const ids = [...new Set(carts.flatMap((c) => JSON.parse(c.items).map((i) => i.productId)))];
      let pmap = new Map();
      if (ids.length) {
        const ph = ids.map(() => '?').join(',');
        const { results: prods } = await env.DB
          .prepare(`SELECT id, name, price FROM products WHERE id IN (${ph})`)
          .bind(...ids)
          .all();
        pmap = new Map(prods.map((p) => [p.id, p]));
      }

      const out = carts.map((c) => {
        const items = JSON.parse(c.items);
        const lines = items.map((i) => {
          const p = pmap.get(i.productId) || { name: 'Unknown item', price: 0 };
          return { name: p.name, price: p.price, qty: i.qty };
        });
        return {
          id: c.id, status: c.status, updatedAt: c.updated_at,
          count: items.reduce((s, i) => s + i.qty, 0),
          subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
          items: lines,
        };
      });
      return json({ carts: out });
    }

    if (path === '/orders' && method === 'GET') {
      const { results } = await env.DB
        .prepare(
          `SELECT id, number, customer_name, customer_email, total, status,
                  shipping_status, carrier, tracking_number, created_at,
                  (SELECT COALESCE(SUM(json_extract(value, '$.qty')), 0)
                   FROM json_each(orders.items)) AS item_count
           FROM orders
           ORDER BY created_at DESC`
        )
        .all();
      return json({ orders: results });
    }

    const orderMatch = path.match(/^\/orders\/([^/]+)$/);

    if (orderMatch && method === 'GET') {
      const row = await env.DB
        .prepare('SELECT * FROM orders WHERE id = ?').bind(orderMatch[1]).first();
      if (!row) return err('Order not found', 404);
      return json({ order: { ...row, items: JSON.parse(row.items) } });
    }

    if (orderMatch && method === 'PATCH') {
      const body = await request.json().catch(() => ({}));

      // Payment status
      if (body.status !== undefined) {
        const allowed = ['paid', 'fulfilled', 'refunded', 'pending'];
        if (!allowed.includes(body.status)) return err('Invalid status');
        await env.DB
          .prepare('UPDATE orders SET status = ? WHERE id = ?')
          .bind(body.status, orderMatch[1])
          .run();
      }

      // Shipping fields
      const shippingFields = ['shipping_status', 'carrier', 'tracking_number', 'estimated_delivery', 'shipping_notes'];
      for (const f of shippingFields) {
        if (body[f] !== undefined) {
          await env.DB
            .prepare(`UPDATE orders SET ${f} = ? WHERE id = ?`)
            .bind(String(body[f]).slice(0, 500), orderMatch[1])
            .run();
        }
      }

      return json({ ok: true });
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('API error:', e);
    return err(e.message || 'Server error', 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
