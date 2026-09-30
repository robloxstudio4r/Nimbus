import { CONFIG } from './config.js';
import { api } from './api.js';
import { $, esc, toast } from './utils.js';

export function renderContact() {
  const el = $('#view-contact');
  if (!el) return;

  el.innerHTML = `
    <section class="contact-page">
      <div class="contact-hero">
        <div class="eyebrow" style="margin:0 auto 20px;display:inline-flex">
          <span class="dot"></span> Get in touch
        </div>
        <h1 class="serif">We'd love to hear from you.</h1>
        <p class="muted">Questions, feedback, or just want to say hi? Drop us a line — we usually reply within 24 hours.</p>
      </div>

      <div class="contact-grid">
        <div class="contact-info">
          <div class="contact-card">
            <div class="contact-icon">✉️</div>
            <h3>Email us</h3>
            <p class="muted small">For anything at all — orders, returns, partnerships.</p>
            <a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}" class="contact-email">${esc(CONFIG.CONTACT_EMAIL)}</a>
          </div>

          <div class="contact-card">
            <div class="contact-icon">🚚</div>
            <h3>Order help</h3>
            <p class="muted small">Already ordered? Track your package in real time.</p>
            <a href="#/track" class="contact-link" data-nav-track>Track my order →</a>
          </div>

          <div class="contact-card">
            <div class="contact-icon">⏱️</div>
            <h3>Response time</h3>
            <p class="muted small">Mon–Fri · 9am–6pm CT<br>Weekends: slower but we get there.</p>
          </div>
        </div>

        <div class="contact-form-wrap">
          <h2 class="serif">Send us a message</h2>
          <p class="muted small" style="margin:4px 0 20px">All messages go straight to our inbox at <b>${esc(CONFIG.CONTACT_EMAIL)}</b>.</p>

          <form id="contactForm">
            <div class="row2">
              <div class="field"><label>Your name</label>
                <input name="name" required placeholder="Ada Lovelace" autocomplete="name"></div>
              <div class="field"><label>Email</label>
                <input name="email" type="email" required placeholder="ada@example.com" autocomplete="email"></div>
            </div>
            <div class="field">
              <label>Subject</label>
              <select name="subject">
                <option>General question</option>
                <option>Order help</option>
                <option>Returns & exchanges</option>
                <option>Shipping question</option>
                <option>Partnership / wholesale</option>
                <option>Press</option>
                <option>Other</option>
              </select>
            </div>
            <div class="field">
              <label>Message</label>
              <textarea name="message" rows="6" required placeholder="Tell us what's on your mind…"></textarea>
            </div>
            <button type="submit" class="btn brand" style="width:100%;padding:15px;margin-top:18px">
              Send message →
            </button>
            <p class="muted small" style="margin:12px 0 0;text-align:center">
              We'll never share your details. Promise.
            </p>
          </form>
        </div>
      </div>
    </section>`;
}

export async function submitContact(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const fd = new FormData(form);
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await api.contact({
      name: fd.get('name'),
      email: fd.get('email'),
      subject: fd.get('subject'),
      message: fd.get('message'),
    });
    showContactSuccess(fd.get('name'));
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Send message →';
  }
}

function showContactSuccess(name) {
  const el = $('#view-contact');
  el.innerHTML = `
    <section class="contact-page">
      <div class="contact-success">
        <div class="success-icon">✓</div>
        <h1 class="serif">Message sent!</h1>
        <p class="muted" style="max-width:440px;margin:8px auto 24px">
          Thanks ${esc(String(name || '').split(' ')[0] || 'friend')} — we got your message and
          will reply to you within 24 hours. For urgent questions, email us directly at
          <a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}" style="color:var(--brand);font-weight:600">${esc(CONFIG.CONTACT_EMAIL)}</a>.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="#/" class="btn" data-nav-home>Back to shop</a>
          <a href="#/track" class="btn outline" data-nav-track>Track an order</a>
        </div>
      </div>
    </section>`;
}
