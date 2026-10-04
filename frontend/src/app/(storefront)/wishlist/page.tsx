import type { Metadata } from 'next'
import { WishlistPage } from './wishlist-page'

export const metadata: Metadata = {
  title: 'المفضلة',
  description:
    'منتجات شيلايت المحفوظة — انقليها إلى حقيبتك متى كنتِ مستعدة.',
}

export default function Page() {
  return <WishlistPage />
}