export interface NavLink {
  /** مفتاح قاموس الترجمة */
  labelKey: 'home' | 'shop' | 'skinCare' | 'hairCare' | 'eyeCare' | 'nailCare' | 'kidsCare' | 'journal'
  children?: {
    labelKey:
      | 'allProducts'
      | 'bundles'
      | 'newArrivals'
      | 'bestSellers'
    href: string
  }[]
  href: string
}

/** هيكل روابط القائمة — مصدر واحد يمثل نمط Avens-style IA مع هوية أصلية */
export const navLinks: NavLink[] = [
  { labelKey: 'home', href: '/' },
  {
    labelKey: 'shop',
    href: '/shop',
    children: [
      { labelKey: 'allProducts', href: '/shop' },
      { labelKey: 'bundles', href: '/bundles' },
      { labelKey: 'newArrivals', href: '/shop?sort=newest' },
      { labelKey: 'bestSellers', href: '/shop?sort=popularity' },
    ],
  },
  { labelKey: 'skinCare', href: '/categories/skin-care' },
  { labelKey: 'hairCare', href: '/categories/hair-care' },
  { labelKey: 'eyeCare', href: '/categories/eye-care' },
  { labelKey: 'nailCare', href: '/categories/nail-care' },
  { labelKey: 'kidsCare', href: '/categories/kids-care' },
  { labelKey: 'journal', href: '/journal' },
]