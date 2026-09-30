import { store } from './store.js';
import { api } from './api.js';
import { $, money, esc, toast } from './utils.js';
import { syncCart, loadCart, closeCart } from './cart.js';
import { closeModal } from './shop.js';

export function openCheckout() {
  if (!store.items.length) return toast('Your bag is empty', 'warn');
  const t = store.totals();

  $('#modalRoot').innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal" data-modal>
        <div class="modal-head">
          <h2>Checkout</h2>
          <button class="icon-btn" data-close-modal style="width:32px;height:32px;border:0;background:var(--surface-2)">×</button>
        </div>
        <p class="sub">Complete your order — total due <b style="color:var(--ink)">${money(t.total)}</b></p>

        <form id="checkoutForm">
          <div class="field"><label>Full name</label>
            <input name="name" required placeholder="Ada Lovelace" autocomplete="name"></div>
          <div class="field"><label>Email</label>
            <input name="email" type="email" required placeholder="ada@example.com" autocomplete="email"></div>
          <div class="field"><label>Shipping address</label>
            <input name="address" required placeholder="123 Analytical Way" autocomplete="street-address"></div>
          <div class="row2">
            <div class="field"><label>City</label><input name="city" required placeholder="London"></div>
            <div class="field"><label>ZIP</label><input name="zip" required placeholder="SW1A 1AA"></div>
          </div>
          <div class="field"><label>Country</label>
            <input name="country" required placeholder="United Kingdom"></div>

          <div class="cardbox">
            <div class="field">
              <label style="display:flex;justify-content:space-between;align-items:center">
                <span>Card number</span><span class="card-brand" id="cardBrand">CARD</span>
              </label>
              <input name="card" id="cardNumber" inputmode="numeric" required
                     placeholder="4242 4242 4242 4242" maxlength="19" autocomplete="cc-number">
            </div>
            <div class="row2">
              <div class="field"><label>Expiry</label>
                <input name="exp" id="cardExp" required placeholder="MM / YY" maxlength="7" autocomplete="cc-exp"></div>
              <div class="field"><label>CVC</label>
                <input name="cvc" id="cardCvc" required placeholder="123" maxlength="4" inputmode="numeric" autocomplete="cc-csc"></div>
            </div>
          </div>

          <button type="submit" class="btn" style="width:100%;margin-top:22px;padding:15px">
            Pay ${money(t.total)} →
          </button>
          <p class="muted small" style="margin:12px 0 0;text-align:center">🔒 Payments are encrypted end-to-end</p>
        </form>
      </div>
    </div>`;

  $('#cardNumber').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = d.replace(/(.{4})/g, '$1 ').trim();
    $('#cardBrand').textContent =
      d[0] === '4' ? 'VISA' :
      /^5[1-5]/.test(d) ? 'MASTERCARD' :
      /^3[47]/.test(d) ? 'AMEX' :
      /^6/.test(d) ? 'DISCOVER' : 'CARD';
  });
  $('#cardExp').addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = d.length > 2 ? d.slice(0,2) + ' / ' + d.slice(2) : d;
  });
  $('#cardCvc').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  });

  $('#checkoutForm').addEventListener('submit', submitCheckout);
  $('[data-overlay]').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

async function submitCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const fd = new FormData(form);
  const cardNumber = String(fd.get('card') || '').replace(/\D/g, '');
  if (cardNumber.length < 15) return toast('Please enter a valid card number', 'error');

  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    await syncCart();
    const { order } = await api.checkout({
      cartId: store.cartId,
      customer: {
        name: fd.get('name'), email: fd.get('email'),
        address: fd.get('address'), city: fd.get('city'),
        zip: fd.get('zip'), country: fd.get('country'),
      },
      card: { number: cardNumber, exp: fd.get('exp'), cvc: fd.get('cvc') },
    });

    store.items = [];
    store.cartId = null;
    store.clearCoupon();
    localStorage.removeItem('nimbus_cart_id');
    await loadCart();
    closeCart();
    showOrderSuccess(order);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Pay';
  }
}

function showOrderSuccess(order) {
  $('#modalRoot').innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal" style="text-align:center">
        <div class="success-icon">✓</div>
        <h2>Order confirmed!</h2>
        <p class="sub">Thanks ${esc(order.customer_name?.split(' ')[0] || 'friend')} — a receipt is on its way to ${esc(order.customer_email)}.</p>
        <div class="receipt" style="text-align:left">
          <div class="rrow"><span class="muted">Order</span><b>${esc(order.number)}</b></div>
          ${order.items.map(i => `
            <div class="rrow"><span>${esc(i.name)} <span class="muted">× ${i.qty}</span></span>
              <span>${money(i.price * i.qty)}</span></div>`).join('')}
          <div class="rrow"><span>Total paid</span><span>${money(order.total)}</span></div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:14px">
          <button class="btn outline" style="flex:1" data-close-modal>Keep shopping</button>
          <a class="btn brand" style="flex:1;text-decoration:none" href="#/track" data-close-modal>Track order →</a>
        </div>
        <p class="muted small" style="margin:0">
          Save your order number <b style="color:var(--ink)">${esc(order.number)}</b> — you'll need it to track your order.
        </p>
      </div>
    </div>`;
}
