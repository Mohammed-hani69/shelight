import { Header } from '@/components/navigation/header'
import { MobileAppBar } from '@/components/navigation/mobile-app-bar'
import { Footer } from '@/components/layout/footer'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { SearchDialog } from '@/components/navigation/search-dialog'
import { SiteSplash } from '@/components/layout/site-splash'
import { OffersPopup } from '@/components/marketing/offers-popup'
import { WhatsAppFloat } from '@/components/navigation/whatsapp-float'

interface StorefrontShellProps {
  children: React.ReactNode
}

/**
 * الهيكل المشترك لكل صفحات الموقع: هيدر + محتوى + فوتر + السلة + البحث + شريط الموبايل.
 * تخطيطا `(storefront)` و`(marketing)` يستخدمان نفس الهيكل حتى لا يختلفان في أي تعديل.
 *
 * الحشوة السفلية تساوي ارتفاع شريط الموبايل + مسافة أمان، لأنّه `fixed`
 * ولا يأخذ مكاناً في تدفّق المستند.
 */
export function StorefrontShell({ children }: StorefrontShellProps) {
  return (
    <div className="flex min-h-screen flex-col pb-[calc(var(--app-bar-height)+1.25rem)] lg:pb-0">
      <SiteSplash />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchDialog />
      <MobileAppBar />
      <OffersPopup />
      <WhatsAppFloat />
    </div>
  )
}
