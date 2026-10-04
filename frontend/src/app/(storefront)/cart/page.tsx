import type { Metadata } from 'next'
import { CartPage } from './cart-page'

export const metadata: Metadata = {
  title: 'حقيبتك',
  description: 'راجعي منتجات حقيبتك في شيلايت وأكملي الطلب بأمان.',
}

export default function Page() {
  return <CartPage />
}