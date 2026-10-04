"""زراعة بيانات تجريبية — تُطابق عينات الواجهة لتسهيل ربط الـ API لاحقاً.

الاستخدام:
    flask --app run.py seed
أو مباشرة:
    python -m app.seeds
"""
from __future__ import annotations

import shutil
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from flask import current_app

from app.config import BASE_DIR
from app.core.security import hash_password
from app.core.utils import utcnow
from app.extensions import db
from app.models import (
    Banner,
    Bundle,
    BundleItem,
    Category,
    Concern,
    Coupon,
    Customer,
    JournalArticle,
    Product,
    ProductImage,
    Review,
)

# صور الواجهة المحلية التي تعرضها الرئيسية افتراضياً — تُنسخ إلى مجلد الرفع
# لتُدار كبنرات حقيقية من اللوحة.
FRONTEND_IMAGES = BASE_DIR.parent / "frontend" / "public" / "images"

# صور Unsplash مطابقة لما تستخدمه الواجهة حالياً
SERUM_IMG = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&h=800&q=70"
TEXTURE_IMG = "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&h=800&q=70"
CLEANSER_IMG = "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&h=800&q=70"
HAIR_IMG = "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=800&h=800&q=70"
EYE_IMG = "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&h=800&q=70"
NAIL_IMG = "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&h=800&q=70"
KIDS_IMG = "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&h=800&q=70"
TONER_IMG = "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&h=800&q=70"

CATEGORIES: list[dict] = [
    {
        "slug": "skin-care",
        "name_en": "Skin Care",
        "name_ar": "العناية بالبشرة",
        "description_en": "Clinically inspired cleansers, serums and moisturizers that restore your natural glow.",
        "description_ar": "غسولات وسيرومات ومرطبات مستوحاة من العيادات لاستعادة إشراقة طبيعية.",
        "image_url": CLEANSER_IMG,
        "sort_order": 1,
        "is_featured": True,
        "children": [
            {"slug": "cleansers", "name_en": "Cleansers", "name_ar": "الغسولات"},
            {"slug": "serums", "name_en": "Serums", "name_ar": "السيرومات"},
            {"slug": "moisturizers", "name_en": "Moisturizers", "name_ar": "المرطبات"},
        ],
    },
    {
        "slug": "hair-care",
        "name_en": "Hair Care",
        "name_ar": "العناية بالشعر",
        "description_en": "Nourishing masks and oils for healthy, luminous hair.",
        "description_ar": "ماسكات وزيوت مغذية لشعر صحي ولامع.",
        "image_url": HAIR_IMG,
        "sort_order": 2,
        "is_featured": True,
    },
    {
        "slug": "eye-care",
        "name_en": "Eye Care",
        "name_ar": "العناية بالعين",
        "description_en": "Targeted eye creams to brighten and de-puff.",
        "description_ar": "كريمات عين مركّزة لتفتيح وإزالة الانتفاخ.",
        "image_url": EYE_IMG,
        "sort_order": 3,
        "is_featured": True,
    },
    {
        "slug": "nail-care",
        "name_en": "Nail Care",
        "name_ar": "العناية بالأظافر",
        "description_en": "Stronger, healthier nails with strengthening oils.",
        "description_ar": "أظافر أقوى وأكثر صحة مع زيوت مقوية.",
        "image_url": NAIL_IMG,
        "sort_order": 4,
    },
    {
        "slug": "kids-care",
        "name_en": "Kids Care",
        "name_ar": "العناية بالأطفال",
        "description_en": "Gentle, dermatologist-tested care for delicate young skin.",
        "description_ar": "عناية لطيفة ومختبرة من أطباء الجلدية لبشرة الأطفال الحساسة.",
        "image_url": KIDS_IMG,
        "sort_order": 5,
    },
]

CONCERNS: list[dict] = [
    {"slug": "hydration", "name_en": "Hydration", "name_ar": "ترطيب"},
    {"slug": "glow", "name_en": "Brightening", "name_ar": "تفتيح"},
    {"slug": "serum", "name_en": "Blemish Care", "name_ar": "علاج الشوائب"},
    {"slug": "keratin", "name_en": "Hair Repair", "name_ar": "إصلاح الشعر"},
    {"slug": "sensitive", "name_en": "Sensitive Skin", "name_ar": "بشرة حساسة"},
    {"slug": "body", "name_en": "Daily Glow", "name_ar": "إشراقة يومية"},
]

# (slug, sku, name_en, name_ar, price, compare_at, stock, cat, tags, flags, desc_en, desc_ar, img)
PRODUCTS: list[dict] = [
    {
        "slug": "luminous-glow-serum",
        "sku": "SL-GLOW-30",
        "name_en": "Luminous Glow Serum",
        "name_ar": "سيروم الإشراقة",
        "price": "890.00",
        "compare_at_price": "1140.00",
        "stock": 24,
        "category": "skin-care",
        "tags": "serum,vitamin-c,glow",
        "is_featured": True,
        "is_bestseller": True,
        "short_description_en": "A lightweight vitamin C and niacinamide serum that evens tone and boosts radiance.",
        "short_description_ar": "سيروم فيتامين سي ونياسيناميد يوحّد اللون ويمنح الإشراقة.",
        "description_en": "A lightweight vitamin C and niacinamide serum that evens tone and boosts radiance for a lit-from-within glow.",
        "description_ar": "سيروم خفيف بفيتامين سي والنياسيناميد يوحّد اللون ويحفز التوهج من الداخل.",
        "benefits": ["Brightens dull skin", "Evens skin tone", "Boosts hydration", "Softens fine lines"],
        "ingredients": ["Vitamin C 10%", "Niacinamide 5%", "Hyaluronic Acid", "Ferulic Acid"],
        "how_to_use": ["Apply 3-4 drops to cleansed skin each morning.", "Follow with moisturizer and SPF."],
        "suitable_for": ["All skin types", "Dull or tired skin", "Uneven tone"],
        "faqs": [
            {"question": "Can I use it with retinol?", "answer": "We recommend alternating AM/PM to avoid irritation."},
            {"question": "Is it fragrance free?", "answer": "Yes, our glow serum is formulated without added fragrance."},
        ],
        "variants": [
            {"id": "v-001", "name": "30ml", "sku": "SL-GLOW-30", "price": 890, "compareAtPrice": 1140, "stock": 24},
            {"id": "v-002", "name": "50ml", "sku": "SL-GLOW-50", "price": 1290, "compareAtPrice": 1540, "stock": 12},
        ],
        "images": [
            {"url": SERUM_IMG, "alt_en": "Luminous Glow Serum bottle", "alt_ar": "زجاجة سيروم الإشراقة"},
            {"url": TEXTURE_IMG, "alt_en": "Serum texture application", "alt_ar": "تطبيق نسيج السيروم"},
        ],
        "concerns": ["glow", "serum", "hydration"],
    },
    {
        "slug": "radiant-cream-cleanser",
        "sku": "SL-CLEAN-150",
        "name_en": "Radiant Cream Cleanser",
        "name_ar": "غسول كريمي مشرق",
        "price": "420.00",
        "stock": 60,
        "category": "skin-care",
        "tags": "cleanser,gentle,sensitive",
        "is_featured": False,
        "is_bestseller": True,
        "short_description_en": "A gentle, sulphate-free cream cleanser that removes impurities without stripping your skin barrier.",
        "short_description_ar": "غسول كريمي لطيف بدون سلفات ينظف دون إضعاف حاجز البشرة.",
        "description_en": "A gentle, sulphate-free cream cleanser that removes impurities without stripping your skin barrier.",
        "description_ar": "غسول كريمي لطيف خالٍ من السلفات يزيل الشوائب دون إجهاد حاجز البشرة.",
        "benefits": ["Removes makeup & SPF", "Maintains moisture barrier", "Soothes irritation"],
        "ingredients": ["Glycerin", "Panthenol", "Aloe Vera", "Gentle Surfactants"],
        "how_to_use": ["Massage onto damp skin.", "Rinse with lukewarm water. Use AM & PM."],
        "suitable_for": ["Sensitive skin", "Dry skin", "Daily use"],
        "faqs": [{"question": "Is it safe for sensitive skin?", "answer": "Yes, it is fragrance-free and dermatologist-tested."}],
        "variants": [{"id": "v-003", "name": "150ml", "sku": "SL-CLEAN-150", "price": 420, "compareAtPrice": None, "stock": 60}],
        "images": [{"url": CLEANSER_IMG, "alt_en": "Radiant Cream Cleanser tube", "alt_ar": "أنبوب الغسول الكريمي"}],
        "concerns": ["sensitive"],
    },
    {
        "slug": "hydro-plump-moisturizer",
        "sku": "SL-HYDRO-50",
        "name_en": "Hydro Plump Moisturizer",
        "name_ar": "مرطب الهيدرو بلومب",
        "price": "650.00",
        "compare_at_price": "780.00",
        "stock": 5,
        "category": "skin-care",
        "tags": "moisturizer,hydration,barrier",
        "is_featured": True,
        "is_new": True,
        "short_description_en": "A rich yet fast-absorbing moisturizer with hyaluronic acid and ceramides for 72-hour hydration.",
        "short_description_ar": "مرطب غني سريع الامتصاص بحمض الهيالورونيك والسيراميد لترطيب 72 ساعة.",
        "description_en": "A rich yet fast-absorbing moisturizer with hyaluronic acid and ceramides for 72-hour hydration.",
        "description_ar": "مرطب غني وسريع الامتصاص بحمض الهيالورونيك وسيراميد لترطيب يدوم 72 ساعة.",
        "benefits": ["72h hydration", "Strengthens skin barrier", "Non-greasy finish"],
        "ingredients": ["Hyaluronic Acid", "Ceramides", "Squalane", "Vitamin E"],
        "how_to_use": ["Apply a pea-sized amount morning and night over serum."],
        "suitable_for": ["Dry skin", "Normal skin", "Dehydrated skin"],
        "faqs": [{"question": "Can it be used under makeup?", "answer": "Yes, it absorbs quickly and layers well."}],
        "variants": [{"id": "v-004", "name": "50ml", "sku": "SL-HYDRO-50", "price": 650, "compareAtPrice": 780, "stock": 5}],
        "images": [{"url": TEXTURE_IMG, "alt_en": "Hydro Plump Moisturizer jar", "alt_ar": "علبة المرطب"}],
        "concerns": ["hydration"],
    },
    {
        "slug": "silken-hair-mask",
        "sku": "SL-MASK-250",
        "name_en": "Silken Hair Mask",
        "name_ar": "ماسك الشعر الحريري",
        "price": "540.00",
        "stock": 32,
        "category": "hair-care",
        "tags": "hair,mask,keratin",
        "is_featured": False,
        "is_bestseller": True,
        "short_description_en": "A reparative keratin mask that restores elasticity and leaves hair soft, smooth and frizz-free.",
        "short_description_ar": "ماسك كيراتين مجدد يمنح الشعر نعومة ولمعاناً دون تطاير.",
        "description_en": "A reparative keratin mask that restores elasticity and leaves hair soft, smooth and frizz-free.",
        "description_ar": "ماسك كيراتين يعيد مرونة الشعر ويمنحه النعومة واللمعان ويمنع التطاير.",
        "benefits": ["Repairs damage", "Reduces frizz", "Adds shine & softness"],
        "ingredients": ["Keratin", "Argan Oil", "Shea Butter", "Panthenol"],
        "how_to_use": ["Apply to damp hair from mid-lengths.", "Leave 5-10 minutes, then rinse."],
        "suitable_for": ["Dry hair", "Colored hair", "Damaged hair"],
        "faqs": [{"question": "How often should I use it?", "answer": "1-2 times per week for best results."}],
        "variants": [{"id": "v-005", "name": "250ml", "sku": "SL-MASK-250", "price": 540, "compareAtPrice": None, "stock": 32}],
        "images": [{"url": HAIR_IMG, "alt_en": "Silken Hair Mask jar", "alt_ar": "علبة ماسك الشعر"}],
        "concerns": ["keratin"],
    },
    {
        "slug": "eye-bright-cream",
        "sku": "SL-EYE-15",
        "name_en": "Eye Bright Cream",
        "name_ar": "كريم العين المشرق",
        "price": "720.00",
        "compare_at_price": "860.00",
        "stock": 20,
        "category": "eye-care",
        "tags": "eye,caffeine,brightening",
        "is_featured": False,
        "is_bestseller": True,
        "short_description_en": "A cooling, caffeine-infused eye cream that de-puffs, brightens dark circles and smooths fine lines.",
        "short_description_ar": "كريم عين بكافيين يزيل الانتفاخ ويفتح الهالات وينعم الخطوط.",
        "description_en": "A cooling, caffeine-infused eye cream that de-puffs, brightens dark circles and smooths fine lines.",
        "description_ar": "كريم عين منعش بالكافيين يزيل الانتفاخ ويفتح الهالات الداكنة وينعم الخطوط الدقيقة.",
        "benefits": ["Reduces puffiness", "Brightens dark circles", "Smooths fine lines"],
        "ingredients": ["Caffeine", "Peptides", "Vitamin K", "Hyaluronic Acid"],
        "how_to_use": ["Gently tap a rice-grain amount under eyes AM & PM."],
        "suitable_for": ["Puffy eyes", "Dark circles", "Fine lines"],
        "faqs": [{"question": "Is it ophthalmologist tested?", "answer": "Yes, it is safe for the delicate eye area."}],
        "variants": [{"id": "v-006", "name": "15ml", "sku": "SL-EYE-15", "price": 720, "compareAtPrice": 860, "stock": 20}],
        "images": [{"url": EYE_IMG, "alt_en": "Eye Bright Cream tube", "alt_ar": "أنبوب كريم العين"}],
        "concerns": ["glow"],
    },
    {
        "slug": "nail-strength-elixir",
        "sku": "SL-NAIL-15",
        "name_en": "Nail Strength Elixir",
        "name_ar": "إكسير تقوية الأظافر",
        "price": "280.00",
        "stock": 45,
        "category": "nail-care",
        "tags": "nail,strengthen,cuticle",
        "is_featured": False,
        "short_description_en": "A vitamin-enriched cuticle and nail oil that strengthens nails and softens cuticles.",
        "short_description_ar": "زيت فيتامينات للأظافر والجلد المحيط يقوي الأظافر وينعم البشرة.",
        "description_en": "A vitamin-enriched cuticle and nail oil that strengthens nails and softens cuticles.",
        "description_ar": "زيت أظافر غني بالفيتامينات يقوّي الأظافر ويلطّف الجلد المحيط.",
        "benefits": ["Strengthens nails", "Softens cuticles", "Adds healthy shine"],
        "ingredients": ["Vitamin E", "Jojoba Oil", "Biotin", "Almond Oil"],
        "how_to_use": ["Massage a few drops into nails and cuticles daily."],
        "suitable_for": ["Weak nails", "Brittle nails", "Dry cuticles"],
        "faqs": [{"question": "Can I use it with gel polish?", "answer": "Yes, apply to surrounding skin and cuticles."}],
        "variants": [{"id": "v-007", "name": "15ml", "sku": "SL-NAIL-15", "price": 280, "compareAtPrice": None, "stock": 45}],
        "images": [{"url": NAIL_IMG, "alt_en": "Nail Strength Elixir dropper", "alt_ar": "قطارة إكسير الأظافر"}],
        "concerns": [],
    },
    {
        "slug": "gentle-kids-balm",
        "sku": "SL-KIDS-100",
        "name_en": "Gentle Kids Balm",
        "name_ar": "بلسم لطيف للأطفال",
        "price": "320.00",
        "stock": 70,
        "category": "kids-care",
        "tags": "kids,balm,soothing",
        "is_featured": False,
        "is_new": True,
        "short_description_en": "A dermatologist-tested, hypoallergenic balm that soothes and protects delicate young skin.",
        "short_description_ar": "بلسم هيبوالرجينيك يلطف ويحمي بشرة الأطفال الحساسة.",
        "description_en": "A dermatologist-tested, hypoallergenic balm that soothes and protects delicate young skin.",
        "description_ar": "بلسم لطيف مختبر من أطباء الجلدية يلطف ويحمي البشرة الصغيرة الحساسة.",
        "benefits": ["Soothing", "Hypoallergenic", "Fragrance free"],
        "ingredients": ["Calendula", "Shea Butter", "Zinc Oxide", "Chamomile"],
        "how_to_use": ["Apply to clean, dry skin as needed. Reapply after bathing."],
        "suitable_for": ["Babies", "Toddlers", "Sensitive skin"],
        "faqs": [{"question": "Is it tear-free?", "answer": "Yes, it is gentle and sting-free on delicate skin."}],
        "variants": [{"id": "v-008", "name": "100ml", "sku": "SL-KIDS-100", "price": 320, "compareAtPrice": None, "stock": 70}],
        "images": [{"url": KIDS_IMG, "alt_en": "Gentle Kids Balm tin", "alt_ar": "علبة بلسم الأطفال"}],
        "concerns": ["sensitive"],
    },
    {
        "slug": "dew-drop-toner",
        "sku": "SL-TONER-200",
        "name_en": "Dew Drop Toner",
        "name_ar": "تونر الندى",
        "price": "390.00",
        "stock": 40,
        "category": "skin-care",
        "tags": "toner,hydrating,pores",
        "is_featured": False,
        "short_description_en": "An alcohol-free, hydrating toner with green tea and rose water to prep skin and refine pores.",
        "short_description_ar": "تونر مرطب خالٍ من الكحول بالشاي الأخضر وماء الورد لتحضير البشرة.",
        "description_en": "An alcohol-free, hydrating toner with green tea and rose water to prep skin and refine pores.",
        "description_ar": "تونر مرطب خالٍ من الكحول بالشاي الأخضر وماء الورد لتجهيز البشرة وتقليص المسام.",
        "benefits": ["Refines pores", "Balances pH", "Hydrates instantly"],
        "ingredients": ["Green Tea Extract", "Rose Water", "Hyaluronic Acid"],
        "how_to_use": ["Sweep over cleansed skin with a cotton pad or pat directly."],
        "suitable_for": ["All skin types", "Oily skin", "Dull skin"],
        "faqs": [{"question": "Does it contain alcohol?", "answer": "No, it is completely alcohol-free."}],
        "variants": [{"id": "v-009", "name": "200ml", "sku": "SL-TONER-200", "price": 390, "compareAtPrice": None, "stock": 40}],
        "images": [{"url": TONER_IMG, "alt_en": "Dew Drop Toner bottle", "alt_ar": "زجاجة تونر الندى"}],
        "concerns": ["hydration"],
    },
    {
        "slug": "velvet-body-oil",
        "sku": "SL-BODYOIL-100",
        "name_en": "Velvet Body Oil",
        "name_ar": "زيت الجسم المخملي",
        "price": "480.00",
        "stock": 4,
        "category": "skin-care",
        "tags": "body,oil,glow",
        "is_featured": False,
        "is_new": True,
        "short_description_en": "A fast-absorbing, glow-giving body oil with squalane and apricot kernel for soft, silky skin.",
        "short_description_ar": "زيت جسم سريع الامتصاص بسكوالين وزيت المشمش لبشرة ناعمة ولامعة.",
        "description_en": "A fast-absorbing, glow-giving body oil with squalane and apricot kernel for soft, silky skin.",
        "description_ar": "زيت جسم سريع الامتصاص بمنح الإشراقة مع سكوالين وزيت نواة المشمش لبشرة ناعمة حريرية.",
        "benefits": ["Instant glow", "Deep nourishment", "Fast absorbing"],
        "ingredients": ["Squalane", "Apricot Kernel Oil", "Vitamin E", "Jojoba"],
        "how_to_use": ["Massage onto damp skin after shower."],
        "suitable_for": ["Dry skin", "All body", "Glow lovers"],
        "faqs": [{"question": "Does it stain clothing?", "answer": "No, it absorbs quickly without residue."}],
        "variants": [{"id": "v-010", "name": "100ml", "sku": "SL-BODYOIL-100", "price": 480, "compareAtPrice": None, "stock": 4}],
        "images": [{"url": TEXTURE_IMG, "alt_en": "Velvet Body Oil bottle", "alt_ar": "زجاجة زيت الجسم"}],
        "concerns": ["body"],
    },
]

# توزيع تقييمات لكل منتج بحيث تعكس الأرقام تقريباً ما تعرضه الواجهة
REVIEW_RATINGS = {
    "luminous-glow-serum": [5, 5, 4, 5, 5],
    "radiant-cream-cleanser": [5, 4, 5, 5, 4],
    "hydro-plump-moisturizer": [4, 5, 5, 4, 5],
    "silken-hair-mask": [5, 5, 5, 5, 4],
    "eye-bright-cream": [5, 4, 5, 5, 4],
    "nail-strength-elixir": [4, 5, 4, 5, 4],
    "gentle-kids-balm": [5, 5, 4, 5, 5],
    "dew-drop-toner": [4, 5, 4, 5, 5],
    "velvet-body-oil": [5, 5, 4, 5, 4],
}

DEMO_CUSTOMER = {
    "email": "demo@shelight.com",
    "password": "password123",
    "first_name": "Sara",
    "last_name": "Light",
}

DEMO_ADMIN = {
    "email": "admin@shelight.com",
    "password": "admin12345",
    "first_name": "Admin",
    "last_name": "SHE LIGHT",
}

COUPONS = [
    {
        "code": "SHELIGHT10",
        "discount_type": "percent",
        "value": "10.00",
        "min_spend": "500.00",
        "usage_limit": 100,
    },
    {
        "code": "WELCOME150",
        "discount_type": "fixed",
        "value": "150.00",
        "min_spend": "1000.00",
        "usage_limit": 50,
    },
]

# الطقوس الجاهزة. نكتب `price` فقط (السعر المخفَّض)، بينما `compare_at_price`
# يُحسب من أسعار أعضائه الفعلية حتى لا ينحرف عن الواقع. ويولّد كل طقس كود خصم
# ثابتاً بقيمة التوفير تماماً، فيحصل العميل على السعر المعلن عند الطلب.
BUNDLES: list[dict] = [
    {
        "slug": "luminous-daily-routine",
        "coupon_code": "BUNDLE-LUMINOUS",
        "name_en": "Luminous Daily Routine",
        "name_ar": "الروتين اليومي المضيء",
        "description_en": "Your complete morning ritual: a gentle cleanser, a brightening serum and a rich moisturizer.",
        "description_ar": "طقسك الصباحي الكامل: منظف لطيف، سيروم مضيء ومرطب غني.",
        "image_url": "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&h=900&q=70",
        "badge_en": "Best value",
        "badge_ar": "أفضل قيمة",
        "price": "1499.00",
        "rating": 4.9,
        "review_count": 187,
        "products": [
            {"slug": "radiant-cream-cleanser", "quantity": 1},
            {"slug": "luminous-glow-serum", "quantity": 1},
            {"slug": "hydro-plump-moisturizer", "quantity": 1},
        ],
    },
    {
        "slug": "bright-eye-duo",
        "coupon_code": "BUNDLE-EYE",
        "name_en": "Bright Eye Duo",
        "name_ar": "ثنائي العيون المشرق",
        "description_en": "De-puff and brighten with a caffeine eye cream paired with a gentle vitamin C booster.",
        "description_ar": "قلل الانتفاخ وأضيء نظرتك مع كريم العيون بالكافيين إلى جانب معزز فيتامين C اللطيف.",
        "image_url": "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&h=900&q=70",
        "badge_en": "Duo set",
        "badge_ar": "طقم ثنائي",
        "price": "1190.00",
        "rating": 4.8,
        "review_count": 96,
        "products": [
            {"slug": "eye-bright-cream", "quantity": 1},
            {"slug": "luminous-glow-serum", "quantity": 1},
        ],
    },
    {
        "slug": "silky-roots-to-tips",
        "coupon_code": "BUNDLE-HAIR",
        "name_en": "Silky Roots to Tips",
        "name_ar": "حرير من الجذور حتى الأطراف",
        "description_en": "Repair and shine: the keratin hair mask paired with a nourishing body oil for head-to-toe softness.",
        "description_ar": "إصلاح ولمعان: ماسك الشعر الكيراتين مع زيت جسم مغذٍ لياقة ناعمة من الجذور حتى الأطراف.",
        "image_url": "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&h=900&q=70",
        "badge_en": "Care ritual",
        "badge_ar": "طقس العناية",
        "price": "850.00",
        "rating": 4.7,
        "review_count": 64,
        "products": [
            {"slug": "silken-hair-mask", "quantity": 1},
            {"slug": "velvet-body-oil", "quantity": 1},
        ],
    },
]


# بنرات الرئيسية الافتراضية (هيرو + إديتوريال) — تطابق صور الواجهة الحالية
# حتى تظهر في لوحة التحكم ويمكن حذفها واستبدالها.
BANNERS: list[dict] = [
    {"section": "HERO", "source": "hero/hero-1.webp", "link_url": "/products/luminous-glow-serum", "sort_order": 0},
    {"section": "HERO", "source": "hero/hero-2.webp", "link_url": "/categories/skin-care", "sort_order": 1},
    {"section": "HERO", "source": "hero/hero-3.webp", "link_url": "/categories/hair-care", "sort_order": 2},
    {"section": "HERO", "source": "hero/hero-4.webp", "link_url": "/bundles", "sort_order": 3},
    {"section": "HERO", "source": "hero/hero-5.webp", "link_url": "/about", "sort_order": 4},
    {"section": "EDITORIAL", "source": "editorial/editorial-1.webp", "link_url": "/bundles", "sort_order": 0},
]


JOURNAL_POSTS: list[dict] = [
    {
        "slug": "building-your-morning-skin-routine",
        "title_en": "Building Your Morning Skin Routine",
        "title_ar": "بناء روتينك الصباحي للبشرة",
        "excerpt_en": "A dermatologist-inspired guide to layering cleanser, serum and SPF for a balanced start to every day.",
        "excerpt_ar": "دليل مستوحى من أطباء الجلدية لطبقات المنظف والسيروم وواقي الشمس لبداية متوازنة لكل يوم.",
        "content_en": [
            "A great morning routine is less about products and more about consistency. Start with a gentle cleanser to lift overnight buildup, then move into a targeted serum while skin is still slightly damp.",
            "Finish with a moisturizer to seal in hydration, and never skip SPF — even on cloudy Cairo days.",
        ],
        "content_ar": [
            "الروتين الصباحي الرائع أقل ارتباطاً بالمنتجات وأكثر بالانتظام. ابدئي بمنظف لطيف لإزالة تراكم الليل، ثم انتقلي إلى سيروم مستهدف بينما بشرتك لا تزال رطبة قليلاً.",
            "اختتمي بمرطب ليثبّت الترطيب، ولا تنسي واقي الشمس أبداً — حتى في الأيام الغائمة في القاهرة.",
        ],
        "category": "العناية بالبشرة",
        "author": "فريق شيلايت",
        "read_time": "قراءة 4 دقائق",
        "publish_date": "2026-07-20",
        "image_url": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&h=600&q=70",
        "is_featured": True,
    },
    {
        "slug": "hair-repair-101-keratin-and-beyond",
        "title_en": "Hair Repair 101: Keratin and Beyond",
        "title_ar": "إصلاح الشعر 101: الكيراتين وأكثر",
        "excerpt_en": "Understand how keratin, argan oil and heat protection work together to rebuild damaged strands.",
        "excerpt_ar": "افهمي كيف يعمل الكيراتين وزيت الأرغان والحماية من الحرارة معاً لإعادة بناء الشعيرات التالفة.",
        "content_en": [
            "Heat styling and chemical treatments strip moisture from hair fibres. Repair masks rich in keratin and fatty acids help rebuild the inner structure.",
            "Use the mask once or twice a week, focusing on mid-lengths and ends, and always pair it with a heat protectant when styling.",
        ],
        "content_ar": [
            "التصفيف بالحرارة والعلاجات الكيميائية تسحب الرطوبة من ألياف الشعر. تساعد الماسكات المصلّحة الغنية بالكيراتين والأحماض الدهنية في إعادة بناء البنية الداخلية.",
            "استخدمي الماسك مرة أو مرتين أسبوعياً مع التركيز على الأطوال والأطراف، واقرنيه دائماً بطبقة حماية من الحرارة عند التصفيف.",
        ],
        "category": "العناية بالشعر",
        "author": "فريق شيلايت",
        "read_time": "قراءة 5 دقائق",
        "publish_date": "2026-07-01",
        "image_url": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=900&h=600&q=70",
        "is_featured": False,
    },
    {
        "slug": "the-science-of-vitamin-c",
        "title_en": "The Science of Vitamin C",
        "title_ar": "علم فيتامين C",
        "excerpt_en": "Why stable vitamin C outperforms cheap alternatives — and how to introduce it to your routine.",
        "excerpt_ar": "لماذا يتفوق فيتامين C المستقر على البدائل الرخيصة — وكيف تقدمينه إلى روتينك.",
        "content_en": [
            "Vitamin C is one of the most researched antioxidants in skincare. It neutralises free radicals and supports collagen production for firmer, brighter skin.",
            "Look for stable formulas at 10% or higher, and introduce it gradually to give your skin time to build tolerance.",
        ],
        "content_ar": [
            "فيتامين C من أكثر مضادات الأكسدة بحثاً في العناية بالبشرة. فهو يحيد الجذور الحرة ويدعم إنتاج الكولاجين لبشرة أشد وأكثر إشراقاً.",
            "ابحثي عن تركيبات مستقرة بتركيز 10% أو أكثر، وأدخليه تدريجياً لتمنحي بشرتك فرصة بناء التحمل.",
        ],
        "category": "المكونات",
        "author": "فريق شيلايت",
        "read_time": "قراءة 3 دقائق",
        "publish_date": "2026-06-18",
        "image_url": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&h=600&q=70",
        "is_featured": False,
    },
]


def _bundle_members_total(bundle: dict, price_by_slug: dict[str, Decimal]) -> Decimal:
    """مجموع أسعار أعضاء الطقس بالكمميات — هو سعر الشراء منفردين."""
    return sum(
        price_by_slug[member["slug"]] * member["quantity"] for member in bundle["products"]
    )


def bundle_coupons(price_by_slug: dict[str, Decimal]) -> list[dict]:
    """كود خصم لكل طقس: مبلغ ثابت = التوفير، وحد أدنى = سعر الأعضاء."""
    coupons: list[dict] = []
    for bundle in BUNDLES:
        savings = _bundle_members_total(bundle, price_by_slug) - Decimal(bundle["price"])
        if savings <= 0:
            continue
        coupons.append(
            {
                "code": bundle["coupon_code"],
                "discount_type": "fixed",
                "value": str(savings),
                "min_spend": str(_bundle_members_total(bundle, price_by_slug)),
                "usage_limit": None,
                "valid_until_days": None,
            }
        )
    return coupons


def seed_banners() -> int:
    """يزرع بنرات الرئيسية الافتراضية كسجلات قابلة للإدارة.

    ينسخ صور الواجهة المحلية إلى مجلد الرفع ليعمل مسار `/uploads` كما في
    البنرات المرفوعة. الدالة idempotent: تتخطى أي بنر له نفس الصورة والقسم.
    تُرجع عدد البنرات المُضافة (دون commit — على المستدعي الالتزام).
    """
    upload_dir = Path(current_app.config["UPLOAD_FOLDER"]) / "banners"
    upload_dir.mkdir(parents=True, exist_ok=True)

    created = 0
    for item in BANNERS:
        source = FRONTEND_IMAGES / item["source"]
        image_url = f"/uploads/banners/{source.name}"
        exists = Banner.query.filter_by(
            section=item["section"], image_url=image_url
        ).first()
        if exists:
            continue
        target = upload_dir / source.name
        if not target.exists() and source.is_file():
            shutil.copyfile(source, target)
        if not target.exists():
            # لا نزرع سجلاً بلا صورة فعلية.
            continue
        db.session.add(
            Banner(
                section=item["section"],
                image_url=image_url,
                link_url=item.get("link_url"),
                sort_order=item.get("sort_order", 0),
                is_active=True,
            )
        )
        created += 1
    return created


def seed_all() -> None:
    """يزرع كل البيانات التجريبية — يحتاج سياق تطبيق ("app context")."""
    concern_by_slug: dict[str, Concern] = {}

    for item in CONCERNS:
        concern = Concern(slug=item["slug"], name_en=item["name_en"], name_ar=item["name_ar"])
        db.session.add(concern)
        concern_by_slug[item["slug"]] = concern

    category_by_slug: dict[str, Category] = {}
    category_children: dict[str, list[dict]] = {}
    for item in CATEGORIES:
        category = Category(
            slug=item["slug"],
            name_en=item["name_en"],
            name_ar=item["name_ar"],
            description_en=item.get("description_en", ""),
            description_ar=item.get("description_ar", ""),
            image_url=item.get("image_url"),
            sort_order=item.get("sort_order", 0),
            is_featured=item.get("is_featured", False),
        )
        db.session.add(category)
        category_by_slug[item["slug"]] = category
        category_children[item["slug"]] = item.get("children", [])

    db.session.flush()

    for parent_slug, children in category_children.items():
        parent = category_by_slug[parent_slug]
        for index, child in enumerate(children):
            db.session.add(
                Category(
                    parent_id=parent.id,
                    slug=child["slug"],
                    name_en=child["name_en"],
                    name_ar=child["name_ar"],
                    sort_order=index,
                )
            )

    products_by_slug: dict[str, Product] = {}
    for item in PRODUCTS:
        product = Product(
            slug=item["slug"],
            sku=item["sku"],
            name_en=item["name_en"],
            name_ar=item["name_ar"],
            short_description_en=item.get("short_description_en", ""),
            short_description_ar=item.get("short_description_ar", ""),
            description_en=item.get("description_en", ""),
            description_ar=item.get("description_ar", ""),
            price=Decimal(item["price"]),
            compare_at_price=Decimal(item["compare_at_price"]) if item.get("compare_at_price") else None,
            stock=item["stock"],
            tags=item["tags"],
            benefits=item.get("benefits", []),
            ingredients=item.get("ingredients", []),
            how_to_use=item.get("how_to_use", []),
            suitable_for=item.get("suitable_for", []),
            faqs=item.get("faqs", []),
            variants=item.get("variants", []),
            category_id=category_by_slug[item["category"]].id,
            is_featured=item.get("is_featured", False),
            is_bestseller=item.get("is_bestseller", False),
            is_new=item.get("is_new", False),
        )
        for index, image in enumerate(item.get("images", [])):
            product.images.append(
                ProductImage(
                    url=image["url"],
                    alt_en=image.get("alt_en", ""),
                    alt_ar=image.get("alt_ar", ""),
                    sort_order=index,
                )
            )
        product.concerns = [concern_by_slug[slug] for slug in item.get("concerns", [])]
        db.session.add(product)
        products_by_slug[item["slug"]] = product

    customer = Customer(
        email=DEMO_CUSTOMER["email"],
        first_name=DEMO_CUSTOMER["first_name"],
        last_name=DEMO_CUSTOMER["last_name"],
        password_hash=hash_password(DEMO_CUSTOMER["password"]),
        newsletter=True,
    )
    db.session.add(customer)

    admin = Customer(
        email=DEMO_ADMIN["email"],
        first_name=DEMO_ADMIN["first_name"],
        last_name=DEMO_ADMIN["last_name"],
        password_hash=hash_password(DEMO_ADMIN["password"]),
        is_admin=True,
    )
    db.session.add(admin)
    db.session.flush()

    for slug, ratings in REVIEW_RATINGS.items():
        product = products_by_slug[slug]
        for index, rating in enumerate(ratings):
            db.session.add(
                Review(
                    product_id=product.id,
                    customer_id=customer.id if index == 0 else None,
                    author_name=DEMO_CUSTOMER["first_name"] if index == 0 else "Verified Buyer",
                    rating=rating,
                    title="Loved every bit",
                    body="Really impressed with how quickly I noticed a difference in my skin. Will be buying again!",
                    is_verified=index == 0,
                    helpful_count=3 + index,
                )
            )

    now = utcnow()
    price_by_slug = {item["slug"]: Decimal(item["price"]) for item in PRODUCTS}

    for index, item in enumerate(COUPONS + bundle_coupons(price_by_slug), start=1):
        days = item.get("valid_until_days", 30)
        db.session.add(
            Coupon(
                code=item["code"],
                discount_type=item["discount_type"],
                value=Decimal(item["value"]),
                min_spend=Decimal(item["min_spend"]),
                usage_limit=item["usage_limit"],
                valid_from=now - timedelta(days=1),
                valid_until=(now + timedelta(days=days)) if days is not None else None,
            )
        )

    for index, item in enumerate(BUNDLES, start=1):
        bundle = Bundle(
            slug=item["slug"],
            name_en=item["name_en"],
            name_ar=item["name_ar"],
            description_en=item["description_en"],
            description_ar=item["description_ar"],
            image_url=item["image_url"],
            badge_en=item.get("badge_en"),
            badge_ar=item.get("badge_ar"),
            price=Decimal(item["price"]),
            compare_at_price=_bundle_members_total(item, price_by_slug),
            coupon_code=item["coupon_code"],
            rating=item["rating"],
            review_count=item["review_count"],
            sort_order=item.get("sort_order", index),
        )
        for position, member in enumerate(item["products"]):
            bundle.items.append(
                BundleItem(
                    product_id=products_by_slug[member["slug"]].id,
                    quantity=member["quantity"],
                    position=position,
                )
            )
        db.session.add(bundle)

    for post in JOURNAL_POSTS:
        db.session.add(
            JournalArticle(
                slug=post["slug"],
                title_en=post["title_en"],
                title_ar=post["title_ar"],
                excerpt_en=post["excerpt_en"],
                excerpt_ar=post["excerpt_ar"],
                content_en=post["content_en"],
                content_ar=post["content_ar"],
                category=post["category"],
                author=post["author"],
                read_time=post["read_time"],
                publish_date=date.fromisoformat(post["publish_date"]),
                image_url=post["image_url"],
                is_featured=post.get("is_featured", False),
                is_published=post.get("is_published", True),
            )
        )

    db.session.commit()


def main() -> None:
    """إعادة إنشاء قاعدة بيانات التطوير وزراعتها بالكامل."""
    from app import create_app

    app = create_app("development")
    with app.app_context():
        db.drop_all()
        db.create_all()
        seed_all()
        seed_banners()
        db.session.commit()
        print("تمت إعادة إنشاء قاعدة البيانات وزراعتها بنجاح.")


if __name__ == "__main__":
    main()