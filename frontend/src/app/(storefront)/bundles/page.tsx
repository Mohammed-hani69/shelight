import type { Metadata } from 'next'
import { BundlesPage } from './bundles-page'

export const metadata: Metadata = {
  title: 'الباقات وطقوس العناية',
  description:
    'وفّري مع روتينات شيلايت الكاملة — عناية للبشرة والشعر وباقات شاملة بسعر أفضل.',
}

export default function Page() {
  return <BundlesPage />
}