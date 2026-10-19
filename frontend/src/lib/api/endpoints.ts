/**
 * جميع مسارات الـ API مركزية هنا.
 * لا تكتب روابط الـ API داخل المكونات مباشرة، بل استخدم هذه الثوابت.
 */
export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  products: {
    list: '/products',
    detail: (slug: string) => `/products/${slug}`,
    detailById: (id: string) => `/products/id/${id}`,
    tags: '/products/tags',
    categories: (slug: string) => `/categories/${slug}/products`,
  },
  categories: {
    list: '/categories',
    detail: (slug: string) => `/categories/${slug}`,
  },
  concerns: {
    list: '/concerns',
  },
  reviews: {
    byProduct: (slug: string) => `/products/${slug}/reviews`,
    create: (slug: string) => `/products/${slug}/reviews`,
    homepage: '/reviews/homepage',
    helpful: (id: string) => `/reviews/${id}/helpful`,
  },
  cart: {
    get: '/cart',
    addItem: '/cart/items',
    updateItem: (id: string) => `/cart/items/${id}`,
    removeItem: (id: string) => `/cart/items/${id}`,
  },
  wishlist: {
    get: '/wishlist',
    addItem: '/wishlist/items',
    removeItem: (productId: string) => `/wishlist/items/${productId}`,
  },
  coupons: {
    validate: '/coupons/validate',
  },
  bundles: {
    list: '/bundles',
    detail: (slug: string) => `/bundles/${slug}`,
  },
  journal: {
    list: '/journal',
    detail: (slug: string) => `/journal/${slug}`,
  },
  banners: {
    list: '/banners',
  },
  storefrontSections: {
    section: (key: string) => `/storefront/sections/${encodeURIComponent(key)}`,
  },
  storefrontPages: {
    page: (key: string) => `/storefront/pages/${encodeURIComponent(key)}`,
  },
  storefrontVideos: '/storefront/videos',
  customerTrust: '/storefront/customer-trust',
  orders: {
    list: '/orders',
    checkout: '/orders/checkout',
    createReferral: '/referrals',
    /** الـ backend يبحث برقم الطلب (`SL-...`) لا بالمعرّف الرقمي. */
    detail: (orderNumber: string) => `/orders/${orderNumber}`,
    /** تتبّع زائر بلا حساب — يتطلّب رقم الطلب + الموبايل. */
    track: (orderNumber: string) => `/orders/track/${orderNumber}`,
  },
  admin: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    storeSettings: '/admin/store-settings',
    storefrontPage: (key: string) => `/admin/storefront/pages/${encodeURIComponent(key)}`,
    uploadStorefrontPageImage: (key: string) => `/admin/storefront/pages/${encodeURIComponent(key)}/image`,
    storefrontVideos: '/admin/storefront/videos',
    uploadStorefrontVideo: '/admin/storefront/videos/upload',
    customerTrust: '/admin/storefront/customer-trust',
    uploadCustomerTrustImage: '/admin/storefront/customer-trust/image',
    products: '/admin/products',
    product: (id: string) => `/admin/products/${id}`,
    uploadProductImage: '/admin/products/upload',
    orders: '/admin/orders',
    order: (orderNumber: string) => `/admin/orders/${orderNumber}`,
    referrals: '/admin/referrals',
    accounting: '/admin/accounting',
    productCost: (id: string) => `/admin/products/${id}/cost`,
    coupons: '/admin/coupons',
    coupon: (id: string) => `/admin/coupons/${id}`,
    customers: '/admin/customers',
    customer: (id: string) => `/admin/customers/${id}`,
    categories: '/admin/categories',
    category: (id: string) => `/admin/categories/${id}`,
    moveCategory: (id: string) => `/admin/categories/${id}/move`,
    bundles: '/admin/bundles',
    bundle: (id: string) => `/admin/bundles/${id}`,
    moveBundle: (id: string) => `/admin/bundles/${id}/move`,
    journal: '/admin/journal',
    article: (id: string) => `/admin/journal/${id}`,
    uploadJournalImage: '/admin/journal/upload',
    banners: '/admin/banners',
    storefrontSection: (key: string) => `/admin/storefront/sections/${encodeURIComponent(key)}`,
    reviews: '/admin/reviews',
    reviewOverview: '/admin/reviews/overview',
    review: (id: string) => `/admin/reviews/${id}`,
    banner: (id: string) => `/admin/banners/${id}`,
    moveBanner: (id: string) => `/admin/banners/${id}/move`,
    uploadBanner: '/admin/banners/upload',
    analytics: {
      overview: '/admin/analytics/overview',
      funnel: '/admin/analytics/funnel',
      abandonedCarts: '/admin/analytics/abandoned-carts',
      visitors: '/admin/analytics/visitors',
      customerTimeline: (id: string) => `/admin/analytics/customers/${id}/timeline`,
      visitorTimeline: (id: string) => `/admin/analytics/visitors/${id}/timeline`,
      runAbandonment: '/admin/analytics/run-abandonment',
    },
    shipping: {
      sarieeSettings: '/admin/shipping/sariee/settings',
      sarieeOrders: '/admin/shipping/sariee/orders',
      createSarieeDraft: (orderNumber: string) =>
        `/admin/shipping/sariee/orders/${encodeURIComponent(orderNumber)}/draft`,
      activateSarieeOrder: (orderNumber: string) =>
        `/admin/shipping/sariee/orders/${encodeURIComponent(orderNumber)}/activate`,
    },
  },
  storeSettings: '/storefront/settings',
  profile: {
    get: '/profile',
    update: '/profile',
    changePassword: '/profile/password',
  },
} as const
