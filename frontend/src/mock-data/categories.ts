import type { Category } from '@/types/product'

/**
 * بيانات الفئات (Mock).
 * عند ربط الـ Flask API، يُستبدل هذا الملف بخدمة الـ API دون تغيير الـ UI.
 */
export const categories: Category[] = [
  {
    id: 'cat-skin',
    slug: 'skin-care',
    name: 'العناية بالبشرة',
    description:
      'منظفات وسيرومات ومرطبات مستوحاة سريرياً تعيد لكِ إشراقتك الطبيعية.',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=70',
    products: [],
    children: [
      { id: 'cat-cleanser', slug: 'cleansers', name: 'المنظفات', products: [] },
      { id: 'cat-serum', slug: 'serums', name: 'السيرومات', products: [] },
      { id: 'cat-moist', slug: 'moisturizers', name: 'المرطبات', products: [] },
    ],
  },
  {
    id: 'cat-hair',
    slug: 'hair-care',
    name: 'العناية بالشعر',
    description: 'شامبوهات وماسكات وزيت مغذية لشعر صحي ولامع.',
    image:
      'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&q=70',
    products: [],
  },
  {
    id: 'cat-eye',
    slug: 'eye-care',
    name: 'العناية بالعين',
    description: 'كريمات وعلاجات مركزة للعين لتفتيح وتقليل الانتفاخ.',
    image:
      'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=70',
    products: [],
  },
  {
    id: 'cat-nail',
    slug: 'nail-care',
    name: 'العناية بالأظافر',
    description: 'أظافر أقوى وأكثر صحة مع زيوت وعلاجات مقوّية.',
    image:
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=70',
    products: [],
  },
  {
    id: 'cat-kids',
    slug: 'kids-care',
    name: 'عناية الأطفال',
    description: 'عناية لطيفة مختبرة من أطباء الجلدية لبشرة الأطفال الحساسة.',
    image:
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=70',
    products: [],
  },
]
