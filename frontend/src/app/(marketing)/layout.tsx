import { StorefrontShell } from '@/components/layout/storefront-shell'

interface MarketingLayoutProps {
  children: React.ReactNode
}

/** تخطيط الصفحات التسويقية: نفس هيكل المتجر حتى يظل التنقل متطابقاً */
export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return <StorefrontShell>{children}</StorefrontShell>
}
