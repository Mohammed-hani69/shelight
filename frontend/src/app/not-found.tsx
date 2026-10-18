import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** صفحة 404 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-7xl font-semibold text-primary/30">404</p>
      <h1 className="font-display text-3xl font-semibold text-plum">الصفحة دي مش موجودة</h1>
      <p className="max-w-md text-sm text-muted">
        شكل الصفحة دي تايهة. تعالي نرجعك لصفحتنا الرئيسية.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">ارجعي للرئيسية</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">تصفحي المنتجات</Link>
        </Button>
      </div>
    </div>
  )
}