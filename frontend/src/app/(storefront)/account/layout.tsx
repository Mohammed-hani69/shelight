import { AuthGuard } from '@/features/auth/components/auth-guard'
import { AccountNav } from '@/features/account/components/account-nav'

/** تخطيط الحساب: شريط جانبي + محتوى + حارس دخول */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="container-shelight grid gap-8 py-10 lg:grid-cols-[220px_1fr] md:py-14">
        <aside>
          <h1 className="mb-4 hidden font-display text-2xl font-semibold text-plum lg:block">
            حسابي
          </h1>
          <AccountNav />
        </aside>
        <div>{children}</div>
      </div>
    </AuthGuard>
  )
}