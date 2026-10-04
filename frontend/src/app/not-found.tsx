import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** صفحة 404 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-7xl font-semibold text-primary/30">404</p>
      <h1 className="font-display text-3xl font-semibold text-plum">الصفحة غير موجودة</h1>
      <p className="max-w-md text-sm text-muted">
        يبدو أن هذه الصفحة قد ابتعدت. لِنعدكِ إلى الإشراقة.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">العودة إلى الرئيسية</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">تصفح المنتجات</Link>
        </Button>
      </div>
    </div>
  )
}