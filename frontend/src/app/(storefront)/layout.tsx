import { StorefrontShell } from '@/components/layout/storefront-shell'

interface StorefrontLayoutProps {
  children: React.ReactNode
}

/** تخطيط المتجر: هيكل مشترك + صفحات المتجر */
export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
  return <StorefrontShell>{children}</StorefrontShell>
}
