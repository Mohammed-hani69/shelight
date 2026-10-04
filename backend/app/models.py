"""طبقة الموارد المشتركة — نماذج قاعدة البيانات.

الطرق المعتمدة:
- SQLAlchemy 2.0 بأسلوب Mapped/mapped_column.
- تخزين النصوص بالعربية والإنجليزية معاً، وتختار الواجهة اللغة المناسبة.
- الأسعار تُخزَّن عبر Numeric(10, 2) بالجنيه المصري (LE).
- الحقول الغنية (benefits/ingredients/faqs/variants…) تُخزَّن كـ JSON
  لتطابق عقد بيانات الواجهة الحالية دون الحاجة لتغييرها عند ربط الـ API.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import utcnow
from app.extensions import db


class TimestampMixin:
    """يضيف created_at و updated_at تلقائياً لكل نموذج يستخدمه."""

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


# جدول ارتباط متعدد إلى متعدد: منتجات ↔ اهتمامات
product_concerns = db.Table(
    "product_concerns",
    db.Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    db.Column("concern_id", ForeignKey("concerns.id", ondelete="CASCADE"), primary_key=True),
)


# ---------------------------------------------------------------------------
# الكتالوج
# ---------------------------------------------------------------------------


class Category(db.Model):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    description_ar: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    parent: Mapped[Category | None] = relationship(
        remote_side=[id], back_populates="children"
    )
    children: Mapped[list[Category]] = relationship(
        back_populates="parent", order_by="Category.sort_order"
    )
    products: Mapped[list[Product]] = relationship(back_populates="category")


class Product(TimestampMixin, db.Model):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_ar: Mapped[str] = mapped_column(String(200), nullable=False)
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)
    short_description_ar: Mapped[str] = mapped_column(Text, nullable=False, default="")
    short_description_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description_ar: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # وسوم مفصولة بفاصلة: serum, vitamin-c, glow …
    tags: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # حقول غنية تُعرض في صفحة المنتج — JSON لتطابق شكل الواجهة
    benefits: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ingredients: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    how_to_use: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    suitable_for: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    faqs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    variants: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        # تصفية المتجر بالفئة مع المنتجات النشطة: بلا هذا الفهرس تفحص
        # قاعدة البيانات كل المنتجات في كل طلب.
        Index("ix_products_category_active", "category_id", "is_active"),
    )

    category: Mapped[Category | None] = relationship(back_populates="products")
    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    concerns: Mapped[list[Concern]] = relationship(
        secondary=product_concerns, back_populates="products"
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="Review.created_at.desc()"
    )

    @property
    def primary_image_url(self) -> str:
        """أول صورة — المصدر الوحيد لروابط الصور في السلاسل."""
        return self.images[0].url if self.images else ""


class ProductImage(db.Model):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_ar: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    alt_en: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped[Product] = relationship(back_populates="images")


class Concern(db.Model):
    __tablename__ = "concerns"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    name_ar: Mapped[str] = mapped_column(String(120), nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)

    products: Mapped[list[Product]] = relationship(
        secondary=product_concerns, back_populates="concerns"
    )


# ---------------------------------------------------------------------------
# المراجعات والعملاء
# ---------------------------------------------------------------------------


class Review(db.Model):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    product: Mapped[Product] = relationship(back_populates="reviews")
    customer: Mapped[Customer | None] = relationship(back_populates="reviews")


class Customer(db.Model):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, nullable=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # صيغة موحّدة للهاتف (بلا صفر بادئ أو كود دولة) لمطابقة الهوية.
    normalized_phone: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    governorate: Mapped[str | None] = mapped_column(String(120), nullable=True)
    birthday: Mapped[date | None] = mapped_column(Date, nullable=True)
    newsletter: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    reviews: Mapped[list[Review]] = relationship(back_populates="customer")
    orders: Mapped[list[Order]] = relationship(back_populates="customer")
    cart_items: Mapped[list[CartItem]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    wishlist_items: Mapped[list[WishlistItem]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# السلة وقائمة الأمنيات
# ---------------------------------------------------------------------------


class CartItem(db.Model):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("owner_id", "product_id", name="uq_cart_owner_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="cart_items")
    product: Mapped[Product] = relationship()


class WishlistItem(db.Model):
    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint("customer_id", "product_id", name="uq_wishlist_customer_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="wishlist_items")
    product: Mapped[Product] = relationship()


# ---------------------------------------------------------------------------
# الطلبات والكوبونات
# ---------------------------------------------------------------------------


class Coupon(db.Model):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    discount_type: Mapped[str] = mapped_column(String(10), nullable=False)  # percent | fixed
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_spend: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    usage_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Order(TimestampMixin, db.Model):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    guest_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(30), default="cod", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    shipping_provider: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    shipping_provider_order_id: Mapped[str | None] = mapped_column(
        String(120), nullable=True, index=True
    )
    tracking_number: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    shipping_status: Mapped[str | None] = mapped_column(String(40), nullable=True, default="pending")
    shipping_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    shipping_last_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    shipping_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    shipping_address: Mapped[str] = mapped_column(String(300), nullable=False)
    shipping_city: Mapped[str] = mapped_column(String(120), nullable=False)
    shipping_governorate: Mapped[str] = mapped_column(String(120), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")

    __table_args__ = (
        # "طلباتي" ترتّب الأحدث أولاً وتُقرأ برقم الطلب — فهرس مركّب
        # يخدم الاثنين، وcustomer_id وحده غير مفهرس في SQLITE.
        Index("ix_orders_customer_created", "customer_id", "created_at"),
    )

    customer: Mapped[Customer | None] = relationship(back_populates="orders")
    items: Mapped[list[OrderItem]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class ShippingProviderSettings(TimestampMixin, db.Model):
    """إعدادات موحّدة لكل مزوّد شحن، مع تخزين آمن في قاعدة البيانات."""

    __tablename__ = "shipping_provider_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    environment: Mapped[str] = mapped_column(String(20), default="sandbox", nullable=False)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_id_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_pickup_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_delivery_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    default_package_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    default_shipping_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)


BostaSettings = ShippingProviderSettings


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # لقطات ثابتة كي يبقى تاريخ الطلب سليماً بعد تغيّر بيانات المنتج
    product_name_en: Mapped[str] = mapped_column(String(200), nullable=False)
    product_name_ar: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    product_slug: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    order: Mapped[Order] = relationship(back_populates="items")


# ---------------------------------------------------------------------------
# الباقات (Routines / Bundles)
# ---------------------------------------------------------------------------


class Bundle(TimestampMixin, db.Model):
    """طقم منتجات جاهز بسعر أقل من شراء أعضائه منفردين.

    `coupon_code` هو جسر الخصم: عند طلب الطقم تُضاف أعضاؤه للسلة وتُطبَّق
    كود الخصم الخاص به فيحصل العميل على `price` المعلن بدل مجموع الأسعار.
    """

    __tablename__ = "bundles"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    name_en: Mapped[str] = mapped_column(String(200), nullable=False)
    name_ar: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    description_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description_ar: Mapped[str] = mapped_column(Text, nullable=False, default="")
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    badge_en: Mapped[str | None] = mapped_column(String(80), nullable=True)
    badge_ar: Mapped[str | None] = mapped_column(String(80), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    compare_at_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    items: Mapped[list["BundleItem"]] = relationship(
        back_populates="bundle",
        cascade="all, delete-orphan",
        order_by="BundleItem.position",
    )


class BundleItem(db.Model):
    """عضو واحد في الباقة — المنتج والكمية المطلوبة."""

    __tablename__ = "bundle_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    bundle_id: Mapped[int] = mapped_column(
        ForeignKey("bundles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    bundle: Mapped[Bundle] = relationship(back_populates="items")
    product: Mapped[Product] = relationship()


# ---------------------------------------------------------------------------
# المدونة / المقالات (Journal)
# ---------------------------------------------------------------------------


class JournalArticle(TimestampMixin, db.Model):
    """مقال واحد في مدونة شيلايت — محتوى بفقرات (JSON) بالعربية والإنجليزية.

    `is_published` يتحكم في الظهور على الموقع، و`is_featured` يرفع المقال
    إلى بطاقة «المقال المميز» أعلى صفحة المدونة.
    """

    __tablename__ = "journal_articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    title_en: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    title_ar: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    excerpt_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    excerpt_ar: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_en: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    content_ar: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    category: Mapped[str] = mapped_column(String(120), nullable=False, default="المدونة")
    author: Mapped[str] = mapped_column(String(120), nullable=False, default="فريق شيلايت")
    read_time: Mapped[str] = mapped_column(String(60), nullable=False, default="قراءة 5 دقائق")
    publish_date: Mapped[date] = mapped_column(Date, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ---------------------------------------------------------------------------
# تتبّع رحلة العميل (First-Party Journey Tracking)
#
# معرّف الزائر UUID من طرف أول يولّده المتصفح ويخزّنه محلياً، ويُرسل في
# ترويسة X-Anonymous-Id. لا يعتمد التعريف على عنوان IP إطلاقاً.
# ---------------------------------------------------------------------------


class AnonymousVisitor(TimestampMixin, db.Model):
    """زائر مجهول — يتحوّل لاحقاً إلى عميل عند تسجيل الدخول/إنشاء حساب."""

    __tablename__ = "anonymous_visitors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    first_landing_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    first_referrer: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    first_utm_source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    first_utm_medium: Mapped[str | None] = mapped_column(String(200), nullable=True)
    first_utm_campaign: Mapped[str | None] = mapped_column(String(200), nullable=True)
    last_device_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    last_user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sessions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    events_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    customer: Mapped[Customer | None] = relationship()


class VisitSession(TimestampMixin, db.Model):
    """جلسة زيارة متصلة — تجميع زمني لأحداث الزائر نفسه."""

    __tablename__ = "visit_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    visitor_id: Mapped[str] = mapped_column(
        ForeignKey("anonymous_visitors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    entry_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(200), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(200), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    page_views: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_bounce: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    visitor: Mapped[AnonymousVisitor] = relationship()


class TrackingEvent(db.Model):
    """حدث واحد في الرحلة — الوحدة الأساسية. `event_id` يمنع التكرار."""

    __tablename__ = "tracking_events"
    __table_args__ = (
        Index("ix_tracking_events_name_time", "name", "event_timestamp"),
        Index("ix_tracking_events_visitor_time", "visitor_id", "event_timestamp"),
        Index("ix_tracking_events_session_time", "session_id", "event_timestamp"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )
    received_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    page_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    properties: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class JourneyCart(TimestampMixin, db.Model):
    """إسقاط تحليلي لسلة الزائر — منفصل تماماً عن السلة المعاملاتية.

    الحالات: ACTIVE → ABANDONED → (RECOVERED | CONVERTED)، مع EXPIRED للتخلص
    من السلال القديمة. لا يشارك أي منطق مع `cart_items`.
    """

    __tablename__ = "journey_carts"
    __table_args__ = (
        Index("ix_journey_carts_status_activity", "status", "last_activity_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    visitor_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False, index=True)
    currency: Mapped[str] = mapped_column(String(3), default="EGP", nullable=False)
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    first_item_added_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )
    abandoned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recovered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )

    items: Mapped[list["JourneyCartItem"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan"
    )


class JourneyCartItem(db.Model):
    """سطر في السلة التحليلية — يسجّل الإضافة/الإزالة لأغراض القياس."""

    __tablename__ = "journey_cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    journey_cart_id: Mapped[int] = mapped_column(
        ForeignKey("journey_carts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    product_slug: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    cart: Mapped[JourneyCart] = relationship(back_populates="items")


class CheckoutSession(db.Model):
    """جلسة إتمام شراء — تتتبّع المراحل وتُغلق بالنجاح أو الفشل."""

    __tablename__ = "checkout_sessions"
    __table_args__ = (
        Index("ix_checkout_sessions_status_activity", "status", "last_activity_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    checkout_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="IN_PROGRESS", nullable=False, index=True
    )
    step: Mapped[str] = mapped_column(String(30), default="cart", nullable=False)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    coupon_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    shipping: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    properties: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


# ---------------------------------------------------------------------------
# العملاء المحتملون (Lead Capture بلا بريد إلكتروني)
# ---------------------------------------------------------------------------


class ContactLead(TimestampMixin, db.Model):
    """عميل محتمل تُلتقط هويته تدريجياً أثناء الدفع — بلا بريد إلكتروني.

    - الضيف يُربط عبر `visitor_id` + `normalized_phone`.
    - المسجّل يُربط عبر `customer_id`.
    - `normalized_phone` فريد لمنع تكرار العملاء المحتملين بالهاتف.
    """

    __tablename__ = "contact_leads"
    __table_args__ = (
        Index("ix_contact_leads_visitor_activity", "visitor_id", "last_activity_at"),
        # فريد لمنع تكرار عميل محتمل لنفس الزائر/الجلسة عند تسابق الطلبات.
        Index(
            "uq_contact_leads_visitor_checkout",
            "visitor_id",
            "checkout_key",
            unique=True,
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    visitor_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    checkout_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    primary_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    normalized_phone: Mapped[str | None] = mapped_column(
        String(32), nullable=True, unique=True, index=True
    )
    secondary_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    governorate: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # PARTIAL (بيانات ناقصة) → COMPLETE (اسم + هاتف + عنوان) → CONVERTED.
    status: Mapped[str] = mapped_column(String(20), default="PARTIAL", nullable=False)
    # NONE → CONTACTED → RECOVERED (تُدار يدوياً من لوحة الأدمن لاحقاً).
    recovery_status: Mapped[str] = mapped_column(String(20), default="NONE", nullable=False)
    contact_eligible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, nullable=False, index=True
    )
    abandoned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    customer: Mapped[Customer | None] = relationship()


# ---------------------------------------------------------------------------
# بنرات الموقع (إدارة محتوى بسيطة)
# ---------------------------------------------------------------------------


class Banner(TimestampMixin, db.Model):
    """بنر قابل للإدارة من اللوحة — صورة + رابط + ترتيب + إظهار/إخفاء.

    - `section` = HERO (أعلى الرئيسية) أو EDITORIAL (وسط الرئيسية).
    - `image_url` إمّا مسار مرفوع (`/uploads/banners/...`) أو رابط خارجي.
    """

    __tablename__ = "banners"
    __table_args__ = (Index("ix_banners_section_order", "section", "sort_order"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    section: Mapped[str] = mapped_column(String(20), default="HERO", nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mobile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ---------------------------------------------------------------------------
# أحداث الـ webhooks الواردة من مزوّدي الشحن
# ---------------------------------------------------------------------------


class WebhookEvent(db.Model):
    """سجل حدث وارد من مزوّد شحن — الغرض منه **منع المعالجة المكرّرة**.

    المزوّد قد يعيد إرسال نفس الحدث أكثر من مرة (إعادة محاولة، انقطاع الشبكة).
    مفتاح `event_id` الفريد يجعل التكرار مستحيلاً: الإدراج الثاني يفشل بقيد
    ``UNIQUE`` فيُعتبر الطلب مكرراً ولا يُعاد تنفيذ أي تغيير على البيانات.

    `event_id` مشتقّ من محتوى الحدث نفسه (مزوّد + معرّف الشحنة + كود الحالة
    + الطابع الزمني) لأن Bosta لا ترسل معرّفاً فريداً للحدث.
    """

    __tablename__ = "webhook_events"
    __table_args__ = (
        Index("ix_webhook_events_provider_created", "provider", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # معرّف حتمي مشتق من محتوى الحدث => نفس الحدث يعطي نفس المعرّف.
    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    event_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # تفاصيل مختارة من payload للبحث والاستقصاء (بلا أي بيانات شخصية).
    provider_event_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    tracking_number: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    provider_state_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_state_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    internal_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # نتيجة المعالجة: processed | duplicate | unknown_shipment | unknown_status | failed
    outcome: Mapped[str] = mapped_column(String(32), default="pending", nullable=False, index=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    order: Mapped[Order | None] = relationship()
