import { store } from './store.js';
import { api } from './api.js';
import { CONFIG } from './config.js';
import { $, $$, money, esc, initials, toast, debounce } from './utils.js';
import { addToCart } from './cart.js';

export async function loadProducts() {
  const { products } = await api.products();
  store.products = products;
}

export function renderShop() {
  const el = $('#view-shop');
  if (!el) return;

  const products = visibleProducts();

  el.innerHTML = `
    ${renderHero()}
    ${renderTrust()}
    ${renderCatalog(products)}
    ${renderRecent()}
    ${renderTestimonials()}
    ${renderNewsletter()}
  `;
}

function visibleProducts() {
  let list = [...store.products];

  if (store.filter === 'new')  list = list.slice(0, 6);
  else if (store.filter === 'best') list = [...list].sort((a, b) => (b.stock||0) - (a.stock||0)).slice(0, 6);
  else if (store.filter === 'sale') list = list.filter(p => p.price > 3000).slice(0, 6);
  else if (store.filter === 'wish') list = list.filter(p => store.isWished(p.id));

  if (store.search) {
    const q = store.search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  if (store.sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
  if (store.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (store.sort === 'newest')     list.sort((a, b) => (b.created_at||0) - (a.created_at||0));

  return list;
}

function renderHero() {
  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="dot"></span> New drop · SS26</div>
        <h1>Everyday essentials,<br>made to <em>last</em>.</h1>
        <p>Premium materials, small-batch production, and honest pricing. Everything you need — nothing you don't.</p>
        <div class="hero-cta">
          <button class="btn brand" data-scroll="#shop">Shop the collection →</button>
          <button class="btn outline" data-scroll="#testi">Read reviews</button>
        </div>
        <div class="hero-meta">
          <div class="item"><span class="num">12k+</span><span class="lbl">Happy customers</span></div>
          <div class="item"><span class="num">4.9★</span><span class="lbl">Average rating</span></div>
          <div class="item"><span class="num">48h</span><span class="lbl">Fast dispatch</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="badge-float tl">
          <div class="ic">🌿</div>
          <div><div style="font-weight:700">Carbon neutral</div><div class="muted" style="font-size:11px;font-weight:500">On every order</div></div>
        </div>
        <div class="badge-float br">
          <div class="ic">★</div>
          <div><div style="font-weight:700">4.9 out of 5</div><div class="muted" style="font-size:11px;font-weight:500">1,204 reviews</div></div>
        </div>
      </div>
    </section>`;
}

function renderTrust() {
  return `
    <div class="trust">
      <div class="t"><div class="ic">🚚</div><div><b>Free shipping</b><span>On orders over $75</span></div></div>
      <div class="t"><div class="ic">↩</div><div><b>30-day returns</b><span>No questions asked</span></div></div>
      <div class="t"><div class="ic">🔒</div><div><b>Secure checkout</b><span>256-bit encryption</span></div></div>
      <div class="t"><div class="ic">💬</div><div><b>Real support</b><span>Humans, not bots</span></div></div>
    </div>`;
}

function renderCatalog(products) {
  return `
    <section class="section" id="shop">
      <div class="section-head">
        <div>
          <h2>${store.search ? `Results for "${esc(store.search)}"` : 'The collection'}</h2>
          <p>${store.search ? `${products.length} match${products.length === 1 ? '' : 'es'}` : 'Considered pieces, thoughtfully priced. Every item ships within 48 hours.'}</p>
        </div>
        <div class="toolbar">
          <div class="filters">
            ${[
              ['all','All'], ['new','New in'], ['best','Best sellers'], ['sale','On sale'],
              ['wish', `Wishlist${store.wishlist.length ? ` (${store.wishlist.length})` : ''}`],
            ].map(([k, l]) =>
              `<button class="filter ${store.filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
          </div>
          <select class="sort-select" id="sortSelect">
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
          </select>
        </div>
      </div>

      ${products.length ? `
        <div class="grid">
          ${products.map((p, idx) => productCard(p, idx)).join('')}
        </div>`
      : `<div class="empty"><div class="big">🔍</div>No products found.${store.search ? ' Try a different search.' : ''}</div>`}
    </section>`;
}

function productCard(p, idx) {
  const [rating, count] = CONFIG.FAKE_RATINGS[idx % CONFIG.FAKE_RATINGS.length];
  const isSale = p.price > 3000;
  const was = isSale ? Math.round(p.price * 1.25) : null;
  const wished = store.isWished(p.id);
  const stock = p.stock || 0;
  const stockLabel = stock === 0 ? 'Sold out' : stock < 10 ? `Only ${stock} left` : `${stock} in stock`;
  const stockClass = stock === 0 ? 'out' : stock < 10 ? 'low' : '';

  return `
    <article class="card" data-card="${esc(p.id)}">
      <div class="thumb">
        ${idx === 0 ? `<span class="tag sale">Bestseller</span>` :
          idx === 1 ? `<span class="tag">New</span>` :
          isSale ? `<span class="tag sale">Sale</span>` : ''}
        <button class="wish-toggle ${wished ? 'on' : ''}" data-wish="${esc(p.id)}" title="Wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>
          </svg>
        </button>
        ${p.image
          ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
          : esc(initials(p.name))}
        <button class="quick" data-add="${esc(p.id)}" ${stock === 0 ? 'disabled' : ''}>
          ${stock === 0 ? 'Sold out' : `Add to bag — ${money(p.price)}`}
        </button>
      </div>
      <div class="p-body">
        <h3 data-quickview="${esc(p.id)}">${esc(p.name)}</h3>
        <p class="desc">${esc(p.description || 'A considered everyday essential.')}</p>
        <div class="p-foot">
          <span class="price">${was ? `<span class="was">${money(was)}</span>` : ''}${money(p.price)}</span>
          <span class="rating"><span class="stars">★★★★★</span> ${rating}</span>
        </div>
        <span class="stock-badge ${stockClass}">${stockLabel}</span>
      </div>
    </article>`;
}

function renderRecent() {
  if (!store.recent.length) return '';
  const items = store.recent
    .map(id => store.products.find(p => p.id === id))
    .filter(Boolean);
  if (!items.length) return '';

  return `
    <section class="recent">
      <div class="section-head">
        <div><h2>Recently viewed</h2><p>Pick up where you left off.</p></div>
      </div>
      <div class="recent-grid">
        ${items.map(p => `
          <div class="recent-card" data-quickview="${esc(p.id)}">
            <div class="thumb">${p.image
              ? `<img src="${esc(p.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`
              : esc(initials(p.name))}</div>
            <b>${esc(p.name)}</b>
            <span class="price">${money(p.price)}</span>
          </div>`).join('')}
      </div>
    </section>`;
}

function renderTestimonials() {
  return `
    <section class="testi-section" id="testi">
      <div style="text-align:center;max-width:640px;margin:0 auto">
        <div class="eyebrow" style="margin-bottom:14px"><span class="dot"></span> Loved by thousands</div>
        <h2 class="serif" style="font-size:clamp(28px,3.6vw,40px);letter-spacing:-.03em;margin:0 0 10px">Real people. Real reviews.</h2>
        <p class="muted" style="margin:0">Over 12,000 five-star reviews and counting.</p>
      </div>
      <div class="testi-grid">
        ${[
          ['“The quality is insane for the price. I\'ve worn my hoodie every single day for a month and it still looks brand new.”','Sarah K.','Verified buyer'],
          ['“Fast shipping, beautiful packaging, and the fit is perfect. Already ordered two more.”','Marcus T.','Verified buyer'],
          ['“Finally a brand that actually cares about materials. The cotton is so soft and the colors are gorgeous.”','Priya R.','Verified buyer'],
        ].map(([quote, name, tag]) => `
          <div class="testi">
            <div class="stars">★★★★★</div>
            <p>${esc(quote)}</p>
            <div class="who">
              <div class="av">${esc(initials(name))}</div>
              <div><b>${esc(name)}</b><span>${esc(tag)}</span></div>
            </div>
          </div>`).join('')}
      </div>
    </section>`;
}

function renderNewsletter() {
  return `
    <section class="newsletter">
      <h2>Get 10% off your first order.</h2>
      <p>Join the list for early access to drops, restocks, and members-only pricing.</p>
      <form class="news-form" data-newsletter>
        <input type="email" required placeholder="your@email.com">
        <button type="submit">Subscribe</button>
      </form>
    </section>`;
}

/* ---------- quick view ---------- */
export function openQuickView(id) {
  const p = store.products.find(x => x.id === id);
  if (!p) return;
  store.pushRecent(id);

  const [rating, count] = CONFIG.FAKE_RATINGS[0];
  const wished = store.isWished(p.id);

  $('#modalRoot').innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal wide" data-modal>
        <div class="qv">
          <div class="qv-img">${p.image
            ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">`
            : esc(initials(p.name))}</div>
          <div class="qv-body">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
              <div class="eyebrow" style="margin:0"><span class="dot"></span> ${p.stock > 0 ? 'In stock' : 'Sold out'}</div>
              <button class="icon-btn" data-close-modal style="width:32px;height:32px">×</button>
            </div>
            <h2>${esc(p.name)}</h2>
            <div class="rating"><span class="stars">★★★★★</span> ${rating} · ${count} reviews</div>
            <div class="price">${money(p.price)}</div>
            <p class="desc">${esc(p.description || 'A considered everyday essential, made to last.')}</p>
            <div class="actions">
              <button class="btn" style="flex:1" data-add="${esc(p.id)}" ${p.stock === 0 ? 'disabled' : ''}>
                ${p.stock === 0 ? 'Sold out' : 'Add to bag'}
              </button>
              <button class="btn outline" data-wish="${esc(p.id)}" title="Wishlist">
                ${wished ? '♥ Saved' : '♡ Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  $('[data-overlay]')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

export function closeModal() { $('#modalRoot').innerHTML = ''; }
