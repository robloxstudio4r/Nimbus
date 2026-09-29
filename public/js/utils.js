export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const money = c => '$' + ((Number(c) || 0) / 100).toFixed(2);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

export const fmtDate = ts => ts ? new Date(Number(ts)).toLocaleString(undefined, {
  month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'
}) : '—';

export const initials = name => String(name || '?').trim()
  .split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();

export const uid = (prefix = '') =>
  prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 20);

export const debounce = (fn, ms = 200) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export const readLS = (key, fallback = null) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
export const writeLS = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

let toastTimer;
export function toast(msg, kind = 'ok') {
  const el = $('#toast');
  if (!el) return;
  const icon = kind === 'error' ? '✕' : kind === 'warn' ? '!' : '✓';
  el.innerHTML = `<span>${icon}</span> ${esc(msg)}`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
