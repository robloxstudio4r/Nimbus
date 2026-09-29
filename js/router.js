import { store } from './store.js';
import { renderShop, closeModal } from './shop.js';
import { renderAdmin } from './admin.js';
import { closeCart } from './cart.js';

export function route() {
  const hash = location.hash || '#/';
  const isAdmin = hash.startsWith('#/admin');

  document.querySelector('#view-shop').hidden = isAdmin;
  document.querySelector('#view-admin').hidden = !isAdmin;
  document.querySelector('#siteFooter').hidden = isAdmin;
  document.querySelector('#navShop')?.classList.toggle('on', !isAdmin);
  document.querySelector('#navAdmin')?.classList.toggle('on', isAdmin);

  closeCart();
  closeModal();

  if (isAdmin) renderAdmin();
  else renderShop();
}
