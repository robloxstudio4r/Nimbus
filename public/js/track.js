import { api } from './api.js';
import { $, money, esc, fmtDate, toast } from './utils.js';

const STEPS = [
  ['processing',     'Order confirmed',  'We received your order and payment.'],
  ['packed',         'Packed',           'Your items have been picked and packed.'],
  ['shipped',        'Shipped',          'Handed to the carrier.'],
  ['in_transit',     'In transit',       'On the way to you.'],
  ['out_for_delivery','Out for delivery','Arriving today.'],
  ['delivered',      'Delivered',        'Enjoy your order!'],
];

const ORDER_INDEX = {
  processing: 0,
  packed: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

export function renderTrack() {
  const el = $('#view-track');
  if (!el) return;

  el.innerHTML = `
    <section class="track-page">
      <div class="track-hero">
        <div class="eyebrow" style="margin:0 auto 20px;display:inline-flex">
          <span class="dot"></span> Order tracking
        </div>
        <h1 class="serif">Where's my order?</h1>
        <p class="muted">Enter your order number and the email you used at checkout.</p>
      </div>

      <form class="track-form" id="trackForm">
        <div class="track-field">
          <label>Order number</label>
          <input name="number" required placeholder="ORD-123456" autocomplete="off">
        </div>
        <div class="track-field">
          <label>Email</label>
          <input name="email" type="email" required placeholder="you@example.com" autocomplete="email">
        </div>
        <button class="btn brand" type="submit">Track order →</button>
      </form>

      <div id="trackResult"></div>
    </section>`;
}

export async function submitTrack(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const fd = new FormData(form);
  const number = String(fd.get('number') || '').trim();
  const email  = String(fd.get('email')  || '').trim();

  btn.disabled = true;
  btn.textContent = 'Looking up…';

  try {
    const { order } = await api.trackOrder(number, email);
    renderTrackResult(order);
  } catch (err) {
    $('#trackResult').innerHTML = `
      <div class="track-error">
        <div class="big">🔍</div>
        <h3>Order not found</h3>
        <p class="muted small">Double-check your order number and email. Both must match the details on your receipt.</p>
      </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Track order →';
  }
}

function renderTrackResult(order) {
  const idx = ORDER_INDEX[order.shipping_status] ?? 0;
  const isCancelled = order.shipping_status === 'cancelled';

  const timeline = STEPS.map(([key, label, desc], i) => {
    const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
    return `
      <div class="track-step ${state}">
        <div class="track-dot">${state === 'done' ? '✓' : i + 1}</div>
        <div class="track-info">
          <b>${esc(label)}</b>
          <span>${esc(desc)}</span>
        </div>
      </div>`;
  }).join('');

  $('#trackResult').innerHTML = `
    <div class="track-card">
      <div class="track-head">
        <div>
          <div class="muted small">Order</div>
          <h2 class="serif">${esc(order.number)}</h2>
          <div class="muted small">Placed ${fmtDate(order.created_at)}</div>
        </div>
        <div style="text-align:right">
          <span class="pill ${esc(order.shipping_status)}">${esc(order.shipping_status.replace(/_/g,' '))}</span>
          <div class="track-total">${money(order.total)}</div>
        </div>
      </div>

      ${isCancelled ? `
        <div class="track-cancelled">
          This order was cancelled. Contact support if you have questions.
        </div>` : `
        <div class="track-timeline">${timeline}</div>
      `}

      ${order.carrier || order.tracking_number ? `
        <div class="track-shipinfo">
          ${order.carrier ? `
            <div class="track-shiprow">
              <span class="muted small">Carrier</span>
              <b>${esc(order.carrier)}</b>
            </div>` : ''}
          ${order.tracking_number ? `
            <div class="track-shiprow">
              <span class="muted small">Tracking number</span>
              <b style="font-family:ui-monospace,monospace">${esc(order.tracking_number)}</b>
            </div>` : ''}
          ${order.estimated_delivery ? `
            <div class="track-shiprow">
              <span class="muted small">Estimated delivery</span>
              <b>${esc(order.estimated_delivery)}</b>
            </div>` : ''}
        </div>` : ''}

      ${order.shipping_notes ? `
        <div class="track-note">
          <div class="muted small" style="margin-bottom:4px">Note from the seller</div>
          ${esc(order.shipping_notes)}
        </div>` : ''}

      <div class="track-section">
        <h4>Items</h4>
        <table class="tbl" style="font-size:14px">
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>${esc(i.name)} <span class="muted">× ${i.qty}</span></td>
                <td class="right">${money(i.price * i.qty)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:12px">
          <div class="sumrow"><span class="muted">Subtotal</span><span>${money(order.subtotal)}</span></div>
          <div class="sumrow"><span class="muted">Shipping</span><span>${order.shipping ? money(order.shipping) : 'Free'}</span></div>
          <div class="sumrow"><span class="muted">Tax</span><span>${money(order.tax)}</span></div>
          <div class="sumrow total"><span>Total</span><span>${money(order.total)}</span></div>
        </div>
      </div>

      <div class="track-section">
        <h4>Shipping to</h4>
        <p class="muted" style="margin:0;font-size:14px">${esc(order.shipping_address)}</p>
      </div>
    </div>`;
}
