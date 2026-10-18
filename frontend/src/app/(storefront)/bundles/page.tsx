import type { Metadata } from 'next'
import { BundlesPage } from './bundles-page'

export const metadata: Metadata = {
  title: 'باقات العناية',
  description:
    'وفّري مع باقات شيلايت وروتيناتها الكاملة للعناية بالبشرة والشعر.',
  alternates: { canonical: '/bundles' },
}

export default function Page() {
  return <BundlesPage />
}