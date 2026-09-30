import { api } from './api.js';
import { CONFIG } from './config.js';
import { $, esc } from './utils.js';

let cachedAbout = null;

export async function renderAbout() {
  const el = $('#view-about');
  if (!el) return;

  // Loading state
  el.innerHTML = `<div class="about-loading"><div class="skeleton skeleton-line" style="height:40px;width:60%;margin:80px auto 20px"></div><div class="skeleton skeleton-line" style="height:20px;width:40%;margin:0 auto"></div></div>`;

  try {
    if (!cachedAbout) {
      const { about } = await api.about();
      cachedAbout = about;
    }
  } catch (e) {
    el.innerHTML = `<div class="panel"><div class="empty">Could not load page.<br><span class="small">${esc(e.message)}</span></div></div>`;
    return;
  }

  const a = cachedAbout;
  const paragraphs = String(a.story || '').split(/\n\s*\n/).filter(Boolean);
  const values = Array.isArray(a.values) ? a.values.filter(v => v && (v.title || v.body)) : [];

  el.innerHTML = `
    <section class="about-page">
      <div class="about-hero">
        <div class="eyebrow" style="margin:0 auto 22px;display:inline-flex">
          <span class="dot"></span> About Nimbus
        </div>
        <h1 class="serif">${esc(a.title || 'Our story')}</h1>
        ${a.subtitle ? `<p class="about-sub">${esc(a.subtitle)}</p>` : ''}
      </div>

      ${paragraphs.length ? `
        <div class="about-story">
          ${paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}
        </div>` : ''}

      ${values.length ? `
        <div class="about-values">
          <div class="about-values-head">
            <h2 class="serif">What we stand for</h2>
            <p class="muted">The principles behind every order.</p>
          </div>
          <div class="about-values-grid">
            ${values.map((v, i) => `
              <div class="about-value">
                <div class="about-value-num">${String(i + 1).padStart(2, '0')}</div>
                <h3>${esc(v.title || '')}</h3>
                <p class="muted">${esc(v.body || '')}</p>
              </div>`).join('')}
          </div>
        </div>` : ''}

      <div class="about-cta">
        <div class="about-cta-inner">
          <h2 class="serif">Questions? We'd love to hear from you.</h2>
          <p class="muted">Reach us at <a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}" style="color:var(--brand);font-weight:600">${esc(CONFIG.CONTACT_EMAIL)}</a> or drop a message below.</p>
          <div class="about-cta-buttons">
            <a href="#/contact" class="btn brand" data-nav-contact>Get in touch →</a>
            <a href="#/" class="btn outline" data-nav-shop>Shop the collection</a>
          </div>
        </div>
      </div>
    </section>`;
}

// Bust the cache after the admin saves new content
export function invalidateAboutCache() {
  cachedAbout = null;
}
