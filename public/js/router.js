import { renderShop, closeModal } from './shop.js';
import { renderAdmin } from './admin.js';
import { renderTrack } from './track.js';
import { renderContact } from './contact.js';
import { closeCart } from './cart.js';

export function route() {
  const hash = location.hash || '#/';
  const isAdmin   = hash.startsWith('#/admin');
  const isTrack   = hash.startsWith('#/track');
  const isContact = hash.startsWith('#/contact');

  document.querySelector('#view-shop').hidden    = isAdmin || isTrack || isContact;
  document.querySelector('#view-admin').hidden   = !isAdmin;
  const trackEl   = document.querySelector('#view-track');
  const contactEl = document.querySelector('#view-contact');
  if (trackEl)   trackEl.hidden   = !isTrack;
  if (contactEl) contactEl.hidden = !isContact;
  document.querySelector('#siteFooter').hidden = isAdmin;

  document.querySelector('#navShop')?.classList.toggle('on',    !isAdmin && !isTrack && !isContact);
  document.querySelector('#navTrack')?.classList.toggle('on',   isTrack);
  document.querySelector('#navContact')?.classList.toggle('on', isContact);
  document.querySelector('#navAdmin')?.classList.toggle('on',   isAdmin);

  closeCart();
  closeModal();

  if (isAdmin)        renderAdmin();
  else if (isTrack)   renderTrack();
  else if (isContact) renderContact();
  else                renderShop();
}
