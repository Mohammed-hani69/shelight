import type { Order } from '@/types/order'
import { productRepository } from '@/services/catalog-service'

const products = productRepository.bestsellers(3)

/** أوامر تجريبية لصفحة الحساب */
export const mockOrders: Order[] = [
  {
    id: 'o-1001',
    number: 'SL-2026-1001',
    status: 'delivered',
    items:
      products.slice(0, 2).map((p, i) => ({
        id: `${p.id}-${i}`,
        productId: p.id,
        name: p.name,
        image: p.images[0]?.url ?? '',
        price: p.price,
        quantity: 1,
      })) ?? [],
    subtotal: 0,
    discount: 100,
    shipping: 0,
    total: 0,
    shippingAddress: {
      fullName: 'عميلة شيلايت',
      phone: '+20 100 000 0000',
      city: 'القاهرة',
      address: '42 شارع النيل، جاردن سيتي',
    },
    placedAt: '2026-08-02T10:00:00Z',
  },
  {
    id: 'o-1002',
    number: 'SL-2026-1002',
    status: 'shipped',
    items:
      products.slice(1, 3).map((p, i) => ({
        id: `${p.id}-${i}`,
        productId: p.id,
        name: p.name,
        image: p.images[0]?.url ?? '',
        price: p.price,
        quantity: 2,
      })) ?? [],
    subtotal: 0,
    discount: 0,
    shipping: 60,
    total: 0,
    shippingAddress: {
      fullName: 'عميلة شيلايت',
      phone: '+20 100 000 0000',
      city: 'الإسكندرية',
      address: '12 طريق الكورنيش',
    },
    placedAt: '2026-08-20T09:30:00Z',
  },
]