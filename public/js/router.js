import { renderShop, closeModal } from './shop.js';
import { renderAdmin } from './admin.js';
import { closeCart } from './cart.js';
import { renderTrack } from './track.js';

export function route() {
  const hash = location.hash || '#/';
  const isAdmin = hash.startsWith('#/admin');
  const isTrack = hash.startsWith('#/track');

  document.querySelector('#view-shop').hidden = isAdmin || isTrack;
  document.querySelector('#view-admin').hidden = !isAdmin;
  const trackEl = document.querySelector('#view-track');
  if (trackEl) trackEl.hidden = !isTrack;
  document.querySelector('#siteFooter').hidden = isAdmin;

  document.querySelector('#navShop')?.classList.toggle('on', !isAdmin && !isTrack);
  document.querySelector('#navTrack')?.classList.toggle('on', isTrack);
  document.querySelector('#navAdmin')?.classList.toggle('on', isAdmin);

  closeCart();
  closeModal();

  if (isAdmin) renderAdmin();
  else if (isTrack) renderTrack();
  else renderShop();
}
