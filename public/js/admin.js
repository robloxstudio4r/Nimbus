import { store } from './store.js';
import { api } from './api.js';
import { CONFIG } from './config.js';
import { $, $$, money, esc, fmtDate, toast } from './utils.js';
import { loadProducts } from './shop.js';

const SHIPPING_STATUSES = [
  ['processing',       'Processing'],
  ['packed',           'Packed'],
  ['shipped',          'Shipped'],
  ['in_transit',       'In transit'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered',        'Delivered'],
  ['cancelled',        'Cancelled'],
];

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Royal Mail', 'Canada Post', 'Australia Post', 'Other'];

export function renderAdmin() {
  const view = $('#view-admin');
  $('#siteFooter').hidden = true;

  if (!store.token) return renderLogin(view);

  view.innerHTML = `
    <div class="admin-wrap">
      <aside class="admin-side">
        <div class="admin-title">DASHBOARD</div>
        ${[
          ['overview', 'Overview', '▦'],
          ['products', 'Products', '◫'],
          ['carts',    'Live carts', '⛁'],
          ['orders',   'Orders', '✎'],
        ].map(([k, l, ic]) =>
          `<button class="navbtn ${store.adminTab === k ? 'active' : ''}" data-tab="${k}"><span>${ic}</span>${l}</button>`).join('')}
        <button class="navbtn danger" data-logout><span>←</span>Sign out</button>
      </aside>
      <div class="admin-main" id="adminMain"><div class="empty">Loading…</div></div>
    </div>`;

  renderAdminMain();
}

function renderLogin(view) {
  view.innerHTML = `
    <div style="max-width:420px;margin:60px auto">
      <div class="panel" style="text-align:center">
        <div style="width:56px;height:56px;border-radius:16px;background:var(--surface-2);margin:0 auto 18px;display:grid;place-items:center;font-size:24px">🔐</div>
        <h3 style="font-size:22px">Admin access</h3>
        <p class="panel-sub">Enter the password to continue to the dashboard.</p>
        <form id="loginForm" style="text-align:left">
          <div class="field"><label>Password</label>
            <input type="password" name="password" required autocomplete="current-password" autofocus></div>
          <button class="btn" style="width:100%;margin-top:20px;padding:14px">Unlock dashboard</button>
        </form>
      </div>
    </div>`;

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const password = new FormData(e.target).get('password');
    try {
      const { token } = await api.login(password);
      store.token = token;
      sessionStorage.setItem(CONFIG.STORAGE.adminToken, token);
      renderAdmin();
    } catch (err) { toast(err.message, 'error'); }
  });
}

export function adminLogout() {
  store.token = null;
  store.currentOrderId = null;
  sessionStorage.removeItem(CONFIG.STORAGE.adminToken);
  renderAdmin();
}

export async function renderAdminMain() {
  const main = $('#adminMain');
  if (!main) return;
  if (store.currentOrderId) return renderOrderDetail(store.currentOrderId);

  main.innerHTML = `<div class="empty">Loading…</div>`;

  try {
    if (store.adminTab === 'overview') {
      const [{ stats }, { orders }] = await Promise.all([api.stats(), api.orders()]);
      main.innerHTML = `
        <div class="section-head" style="margin-bottom:24px">
          <div><h2 style="font-size:26px">Overview</h2><p>Your store at a glance.</p></div>
        </div>
        <div class="stats-grid">
          <div class="stat"><div class="k">Revenue</div><div class="v">${money(stats.revenue)}</div><div class="delta">All time</div></div>
          <div class="stat"><div class="k">Orders</div><div class="v">${stats.orders}</div><div class="delta">All time</div></div>
          <div class="stat"><div class="k">Open carts</div><div class="v">${stats.carts}</div><div class="delta">Live now</div></div>
          <div class="stat"><div class="k">Products</div><div class="v">${stats.products}</div><div class="delta">In catalog</div></div>
        </div>
        <div class="panel">
          <h3>Recent orders</h3>
          <p class="panel-sub">The latest purchases across your store.</p>
          ${orders.length ? `
            <table class="tbl">
              <thead><tr><th>Order</th><th>Customer</th><th>Shipping</th><th class="right">Total</th></tr></thead>
              <tbody>
                ${orders.slice(0, 8).map(o => `
                  <tr class="clickable" data-order="${esc(o.id)}">
                    <td><b>${esc(o.number)}</b><div class="sub">${fmtDate(o.created_at)}</div></td>
                    <td>${esc(o.customer_name)}<div class="sub">${esc(o.customer_email)}</div></td>
                    <td><span class="pill ${esc(o.shipping_status || 'processing')}">${esc((o.shipping_status || 'processing').replace(/_/g, ' '))}</span></td>
                    <td class="right"><b>${money(o.total)}</b></td>
                  </tr>`).join('')}
              </tbody>
            </table>` : `<div class="empty">No orders yet.</div>`}
        </div>`;
      return;
    }

    if (store.adminTab === 'products') {
      const { products } = await api.products();
      main.innerHTML = `
        <div class="section-head" style="margin-bottom:24px">
          <div><h2 style="font-size:26px">Products</h2><p>Manage your catalog.</p></div>
        </div>
        <div class="panel">
          <h3>Add a product</h3>
          <p class="panel-sub">New items appear in the shop instantly.</p>
          <form id="productForm">
            <div class="row2">
              <div class="field"><label>Name</label><input name="name" required placeholder="Aurora Hoodie"></div>
              <div class="field"><label>Price (USD)</label><input name="price" required type="number" step="0.01" min="0" placeholder="49.00"></div>
            </div>
            <div class="field"><label>Description</label><input name="description" placeholder="Heavyweight fleece, unisex fit"></div>
            <div class="row2">
              <div class="field"><label>Image URL (optional)</label><input name="image" placeholder="https://…"></div>
              <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="25"></div>
            </div>
            <button class="btn" style="margin-top:20px">Add product</button>
          </form>
        </div>
        <div class="panel">
          <h3>Catalog (${products.length})</h3>
          <p class="panel-sub">Everything currently for sale.</p>
          ${products.length ? `
            <table class="tbl">
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr></thead>
              <tbody>
                ${products.map(p => `
                  <tr>
                    <td><b>${esc(p.name)}</b><div class="sub">${esc(p.description || '')}</div></td>
                    <td>${money(p.price)}</td>
                    <td>${p.stock}</td>
                    <td class="right"><button class="btn danger sm" data-del-product="${esc(p.id)}">Delete</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>` : `<div class="empty">No products yet.</div>`}
        </div>`;
      $('#productForm').addEventListener('submit', addProduct);
      return;
    }

    if (store.adminTab === 'carts') {
      const { carts } = await api.carts();
      main.innerHTML = `
        <div class="section-head" style="margin-bottom:24px">
          <div><h2 style="font-size:26px">Live carts</h2><p>Every visitor's cart, updated in real time.</p></div>
        </div>
        <div class="panel">
          <h3>${carts.length} active cart${carts.length === 1 ? '' : 's'}</h3>
          <p class="panel-sub">Open carts can still convert. Fulfilled carts are from completed orders.</p>
          ${carts.length ? carts.map(c => `
            <div class="cart-card">
              <div class="ch">
                <div><b>${esc(c.id)}</b>
                  <div class="sub" style="color:var(--muted);font-size:12.5px">Updated ${fmtDate(c.updatedAt)} · ${c.count} item${c.count === 1 ? '' : 's'}</div></div>
                <div style="text-align:right">
                  <span class="pill ${c.status === 'open' ? 'open' : 'fulfilled'}">${esc(c.status)}</span>
                  <div style="font-weight:700;margin-top:4px">${money(c.subtotal)}</div>
                </div>
              </div>
              ${c.items.length ? c.items.map(i => `
                <div class="sumrow" style="font-size:13.5px;margin-top:4px">
                  <span class="muted">${esc(i.name)} × ${i.qty}</span>
                  <span>${money(i.price * i.qty)}</span>
                </div>`).join('') : `<div class="muted small">Empty cart</div>`}
            </div>`).join('') : `<div class="empty">No carts yet.</div>`}
        </div>`;
      return;
    }

    if (store.adminTab === 'orders') {
      const { orders } = await api.orders();
      main.innerHTML = `
        <div class="section-head" style="margin-bottom:24px">
          <div><h2 style="font-size:26px">Orders</h2><p>Every completed purchase.</p></div>
        </div>
        <div class="panel">
          <h3>${orders.length} order${orders.length === 1 ? '' : 's'}</h3>
          <p class="panel-sub">Click any order to see full details and manage shipping.</p>
          ${orders.length ? `
            <table class="tbl">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Shipping</th><th>Payment</th><th class="right">Total</th></tr></thead>
              <tbody>
                ${orders.map(o => `
                  <tr class="clickable" data-order="${esc(o.id)}">
                    <td><b>${esc(o.number)}</b><div class="sub">${fmtDate(o.created_at)}</div></td>
                    <td>${esc(o.customer_name)}<div class="sub">${esc(o.customer_email)}</div></td>
                    <td>${o.item_count}</td>
                    <td><span class="pill ${esc(o.shipping_status || 'processing')}">${esc((o.shipping_status || 'processing').replace(/_/g, ' '))}</span></td>
                    <td><span class="pill ${esc(o.status)}">${esc(o.status)}</span></td>
                    <td class="right"><b>${money(o.total)}</b></td>
                  </tr>`).join('')}
              </tbody>
            </table>` : `<div class="empty">No orders yet. Place a test order from the shop!</div>`}
        </div>`;
      return;
    }
  } catch (err) {
    if (err.status === 401) { adminLogout(); return toast('Session expired', 'warn'); }
    main.innerHTML = `<div class="panel"><div class="empty">${esc(err.message)}</div></div>`;
  }
}

async function addProduct(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    await api.addProduct({
      name: fd.get('name'),
      description: fd.get('description'),
      price: Math.round(parseFloat(fd.get('price') || '0') * 100),
      image: fd.get('image'),
      stock: parseInt(fd.get('stock') || '0', 10),
    });
    toast('Product added');
    await loadProducts();
    renderAdminMain();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Add product';
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api.deleteProduct(id);
    toast('Product deleted');
    await loadProducts();
    renderAdminMain();
  } catch (err) { toast(err.message, 'error'); }
}

async function renderOrderDetail(id) {
  const main = $('#adminMain');
  main.innerHTML = `<div class="empty">Loading order…</div>`;
  try {
    const { order: o } = await api.order(id);

    main.innerHTML = `
      <div class="od-top">
        <button class="btn ghost sm" data-back-orders>← Back to orders</button>
        <div style="flex:1"></div>
        ${o.status !== 'refunded' ? `<button class="btn danger sm" data-refund="${esc(o.id)}">Refund</button>` : ''}
      </div>

      <div class="od-amt">${money(o.total)} <span class="pill ${esc(o.status)}">${esc(o.status)}</span></div>
      <div class="muted" style="margin:6px 0 26px;font-size:13.5px">${esc(o.number)} · ${fmtDate(o.created_at)}</div>

      <div class="od-grid">
        <div>
          <div class="panel">
            <h3>Items</h3>
            <p class="panel-sub">What was purchased.</p>
            <table class="tbl">
              <tbody>
                ${o.items.map(i => `
                  <tr>
                    <td><b>${esc(i.name)}</b><div class="sub">${money(i.price)} × ${i.qty}</div></td>
                    <td class="right"><b>${money(i.price * i.qty)}</b></td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
              <div class="sumrow"><span class="muted">Subtotal</span><span>${money(o.subtotal)}</span></div>
              <div class="sumrow"><span class="muted">Shipping</span><span>${o.shipping ? money(o.shipping) : 'Free'}</span></div>
              <div class="sumrow"><span class="muted">Tax</span><span>${money(o.tax)}</span></div>
              <div class="sumrow total"><span>Total</span><span>${money(o.total)}</span></div>
            </div>
          </div>

          <div class="panel" id="shipPanel">
            <h3>Shipping & fulfillment</h3>
            <p class="panel-sub">Update the status — the customer sees this on the track page instantly.</p>

            <div class="ship-quick">
              <button class="btn sm outline" data-quick-ship="packed">Mark packed</button>
              <button class="btn sm outline" data-quick-ship="shipped">Mark shipped</button>
              <button class="btn sm outline" data-quick-ship="in_transit">In transit</button>
              <button class="btn sm outline" data-quick-ship="out_for_delivery">Out for delivery</button>
              <button class="btn sm" data-quick-ship="delivered">Delivered</button>
            </div>

            <form id="shipForm">
              <div class="row2">
                <div class="field">
                  <label>Shipping status</label>
                  <select name="shipping_status">
                    ${SHIPPING_STATUSES.map(([v, l]) =>
                      `<option value="${v}" ${o.shipping_status === v ? 'selected' : ''}>${l}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label>Carrier</label>
                  <select name="carrier">
                    <option value="">— None —</option>
                    ${CARRIERS.map(c =>
                      `<option value="${c}" ${o.carrier === c ? 'selected' : ''}>${c}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="row2">
                <div class="field">
                  <label>Tracking number</label>
                  <input name="tracking_number" value="${esc(o.tracking_number || '')}" placeholder="1Z999AA10123456784" autocomplete="off">
                </div>
                <div class="field">
                  <label>Estimated delivery</label>
                  <input name="estimated_delivery" type="date" value="${esc(o.estimated_delivery || '')}">
                </div>
              </div>
              <div class="field">
                <label>Note for the customer (optional)</label>
                <textarea name="shipping_notes" rows="2" placeholder="Delayed by weather — new ETA Friday.">${esc(o.shipping_notes || '')}</textarea>
              </div>
              <button class="btn brand" type="submit" style="margin-top:18px">Save shipping info</button>
            </form>
          </div>
        </div>

        <div>
          <div class="panel"><h3>Customer</h3>
            <div style="margin-top:4px">
              <div style="font-weight:600">${esc(o.customer_name)}</div>
              <div class="muted small">${esc(o.customer_email)}</div>
            </div>
          </div>
          <div class="panel"><h3>Payment</h3>
            <div>${esc(o.card_brand)} ···· ${esc(o.card_last4)}</div>
            <div class="muted small" style="margin-top:4px;font-family:ui-monospace,monospace">${esc(o.payment_intent)}</div>
          </div>
          <div class="panel"><h3>Ship to</h3>
            <div class="muted" style="white-space:pre-line;font-size:13.5px">${esc(o.shipping_address)}</div>
          </div>
          <div class="panel"><h3>Customer track link</h3>
            <p class="muted small" style="margin:0 0 8px">Send this to your customer so they can follow their order.</p>
            <code style="font-size:12px;word-break:break-all;color:var(--ink-2)">/#/track</code>
          </div>
        </div>
      </div>`;

    $('#shipForm').addEventListener('submit', saveShipping);
  } catch (err) {
    main.innerHTML = `<div class="panel"><div class="empty">${esc(err.message)}</div></div>`;
  }
}

async function saveShipping(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const fd = new FormData(form);
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await api.updateOrder(store.currentOrderId, {
      shipping_status:    fd.get('shipping_status'),
      carrier:            fd.get('carrier'),
      tracking_number:    fd.get('tracking_number'),
      estimated_delivery: fd.get('estimated_delivery'),
      shipping_notes:     fd.get('shipping_notes'),
    });
    toast('Shipping updated');
    renderOrderDetail(store.currentOrderId);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = 'Save shipping info';
  }
}

async function quickShip(status) {
  try {
    await api.updateOrder(store.currentOrderId, { shipping_status: status });
    toast('Marked: ' + status.replace(/_/g, ' '));
    renderOrderDetail(store.currentOrderId);
  } catch (err) { toast(err.message, 'error'); }
}

export const adminActions = {
  async setTab(tab) {
    store.adminTab = tab;
    store.currentOrderId = null;
    $$('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderAdminMain();
  },
  openOrder(id) { store.currentOrderId = id; renderOrderDetail(id); },
  backToOrders() { store.currentOrderId = null; renderAdminMain(); },
  deleteProduct,
  quickShip,
  refund(id) {
    if (confirm('Refund this order?')) {
      api.updateOrder(id, { status: 'refunded' }).then(() => {
        toast('Refunded');
        renderOrderDetail(id);
      });
    }
  },
};
