import { test, expect } from '@playwright/test'

/** التدفق الحرج: تصفح → سلعة → سلة → إتمام الطلب */
test('customer can browse, add to cart and reach checkout', async ({ page }) => {
  await page.goto('/')

  // نفتح صفحة أول منتج من قسم best sellers
  await page.getByRole('heading', { name: 'Best Sellers' }).first().waitFor()
  await page.locator('a[href^="/products/"]').first().click()

  await page.getByRole('heading', { name: 'Luminous Glow Serum' }).waitFor()

  // إضافة للسلة تفتح الدرج تلقائياً
  await page.getByRole('button', { name: /Add to Cart/i }).first().click()
  await expect(page.getByText("You're")).toBeVisible()

  // ننتقل إلى السلة الكاملة ثم الدفع
  await page.getByRole('link', { name: 'View full cart' }).click()
  await expect(page.getByText('Order Summary')).toBeVisible()
  await page.getByRole('link', { name: 'Checkout' }).click()
  await expect(page.getByText('Shipping Details')).toBeVisible()
})