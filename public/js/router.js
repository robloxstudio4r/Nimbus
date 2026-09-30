import { renderShop, closeModal } from './shop.js';
import { renderAdmin } from './admin.js';
import { renderTrack } from './track.js';
import { renderContact } from './contact.js';
import { renderAbout } from './about.js';
import { closeCart } from './cart.js';

export function route() {
  const hash = location.hash || '#/';
  const isAdmin   = hash.startsWith('#/admin');
  const isTrack   = hash.startsWith('#/track');
  const isContact = hash.startsWith('#/contact');
  const isAbout   = hash.startsWith('#/about');

  document.querySelector('#view-shop').hidden    = isAdmin || isTrack || isContact || isAbout;
  document.querySelector('#view-admin').hidden   = !isAdmin;
  const trackEl   = document.querySelector('#view-track');
  const contactEl = document.querySelector('#view-contact');
  const aboutEl   = document.querySelector('#view-about');
  if (trackEl)   trackEl.hidden   = !isTrack;
  if (contactEl) contactEl.hidden = !isContact;
  if (aboutEl)   aboutEl.hidden   = !isAbout;
  document.querySelector('#siteFooter').hidden = isAdmin;

  document.querySelector('#navShop')?.classList.toggle('on',    !isAdmin && !isTrack && !isContact && !isAbout);
  document.querySelector('#navAbout')?.classList.toggle('on',   isAbout);
  document.querySelector('#navTrack')?.classList.toggle('on',   isTrack);
  document.querySelector('#navContact')?.classList.toggle('on', isContact);
  document.querySelector('#navAdmin')?.classList.toggle('on',   isAdmin);

  closeCart();
  closeModal();

  if (isAdmin)        renderAdmin();
  else if (isAbout)   renderAbout();
  else if (isTrack)   renderTrack();
  else if (isContact) renderContact();
  else                renderShop();
}
