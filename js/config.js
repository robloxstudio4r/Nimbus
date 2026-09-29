export const CONFIG = {
  STORAGE: {
    cart: 'nimbus_cart_id',
    cartItems: 'nimbus_cart_items',
    wishlist: 'nimbus_wishlist',
    recent: 'nimbus_recent',
    theme: 'nimbus_theme',
    adminToken: 'nimbus_admin_token',
    coupon: 'nimbus_coupon',
  },
  SHIPPING: { flat: 599, freeThreshold: 7500 },
  TAX_RATE: 0.08,
  ADMIN_PASSWORD: '06142014Aa@',   // only used in mock mode
  COUPONS: {
    SAVE10:  { type: 'percent', value: 10, label: '10% off' },
    WELCOME: { type: 'percent', value: 15, label: '15% off' },
    FREESHIP:{ type: 'shipping', value: 0, label: 'Free shipping' },
    TAKE500: { type: 'flat', value: 500, label: '$5 off' },
  },
  FAKE_RATINGS: [
    ['4.9','128'], ['4.8','92'], ['4.7','204'], ['4.9','76'],
    ['4.8','143'], ['4.9','311'], ['4.7','88'], ['5.0','52'],
  ],
};
