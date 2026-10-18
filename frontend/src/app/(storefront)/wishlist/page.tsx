import type { Metadata } from 'next'
import { WishlistPage } from './wishlist-page'

export const metadata: Metadata = {
  title: 'حاجاتك المفضلة',
  description:
    'المنتجات اللي حفظتيها في المفضلة. ضيفيها لسلتك وقت ما تحبي.',
}

export default function Page() {
  return <WishlistPage />
}