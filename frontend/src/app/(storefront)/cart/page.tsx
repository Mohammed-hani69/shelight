import type { Metadata } from 'next'
import { CartPage } from './cart-page'

export const metadata: Metadata = {
  title: 'سلتك',
  description: 'راجعي المنتجات اللي في سلتك وكمّلي طلبك بأمان.',
}

export default function Page() {
  return <CartPage />
}