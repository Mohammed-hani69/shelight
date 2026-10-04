import type { Metadata } from 'next'
import { CheckoutForm } from './checkout-form'

export const metadata: Metadata = {
  title: 'إتمام الطلب',
  description: 'أكمل طلبك من شيلايت بأمان.',
  robots: { index: false },
}

export default function CheckoutPage() {
  return (
    <div className="container-shelight py-8 md:py-12">
      <CheckoutForm />
    </div>
  )
}