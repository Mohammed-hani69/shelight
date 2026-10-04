"""منطق لوحة التحكم — لا يُستدعى إلا عبر @admin_required في الـ routes."""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.core.pagination import paginate
from app.extensions import db
from app.models import (
    Bundle,
    BundleItem,
    Category,
    Concern,
    Coupon,
    Customer,
    JournalArticle,
    Order,
    Product,
    ProductImage,
)
from app.modules.admin.schemas import category_admin_payload


# ---------------------------------------------------------------------------
# ملخص اللوحة
# ---------------------------------------------------------------------------


def dashboard_summary() -> dict:
    """أرقام سريعة للوحة: مبيعات، طلبات، مخزون، عملاء."""
    revenue = db.session.execute(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status != "cancelled")
    ).scalar_one()
    return {
        "ordersCount": db.session.execute(select(func.count(Order.id))).scalar_one(),
        "pendingOrders": db.session.execute(
            select(func.count(Order.id)).where(Order.status == "pending")
        ).scalar_one(),
        "revenue": float(revenue),
        "productsCount": db.session.execute(
            select(func.count(Product.id)).where(Product.is_active.is_(True))
        ).scalar_one(),
        "lowStockCount": db.session.execute(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True), Product.stock <= 5
            )
        ).scalar_one(),
        "customersCount": db.session.execute(select(func.count(Customer.id))).scalar_one(),
    }


# ---------------------------------------------------------------------------
# المنتجات
# ---------------------------------------------------------------------------


def list_admin_products(filters: dict) -> tuple[list[Product], dict]:
    """كل المنتجات (نشطة وغير نشطة) مع مرشحات البحث والفئة."""
    query = select(Product)

    category_slug = filters.get("category_slug")
    if category_slug:
        query = query.where(Product.category.has(slug=category_slug))

    search = (filters.get("search") or "").strip()
    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Product.name_en).like(pattern),
                func.lower(Product.name_ar).like(pattern),
                func.lower(Product.slug).like(pattern),
            )
        )

    query = query.order_by(Product.created_at.desc())
    return paginate(query, filters.get("page_size", 12))


def _resolve_category(category_slug: str | None) -> Category | None:
    if not category_slug:
        return None
    category = Category.query.filter_by(slug=category_slug).first()
    if category is None:
        raise ApiError(f"الفئة {category_slug} غير موجودة", status_code=422, code="bad_category")
    return category


def create_product(data: dict) -> Product:
    """ينشئ منتجاً كاملاً مع صوره واهتماماته وفئته."""
    if Product.query.filter_by(slug=data["slug"]).first():
        raise ApiError("رقم تعريف المنتج مستخدم مسبقاً", status_code=409, code="slug_taken")
    if Product.query.filter_by(sku=data["sku"]).first():
        raise ApiError("رمز SKU مستخدم مسبقاً", status_code=409, code="sku_taken")

    return _save_product(Product(), data)


def update_product(product: Product, data: dict) -> Product:
    """تحديث منتج — يحدّث الحقول القابلة للتعديل بذكاء."""
    if data.get("slug"):
        duplicate = Product.query.filter(Product.slug == data["slug"], Product.id != product.id).first()
        if duplicate:
            raise ApiError("رقم تعريف المنتج مستخدم مسبقاً", status_code=409, code="slug_taken")
    if data.get("sku"):
        duplicate = Product.query.filter(Product.sku == data["sku"], Product.id != product.id).first()
        if duplicate:
            raise ApiError("رمز SKU مستخدم مسبقاً", status_code=409, code="sku_taken")

    return _save_product(product, data)


def _save_product(product: Product, data: dict) -> Product:
    """يطبّق بيانات ProductWriteSchema على المنتج (ينشئ أو يحدّث)."""
    product.slug = data["slug"]
    product.sku = data["sku"]
    product.name_en = data["name_en"]
    product.name_ar = data.get("name_ar", "")
    product.short_description_en = data.get("short_description_en", "")
    product.short_description_ar = data.get("short_description_ar", "")
    product.description_en = data.get("description_en", "")
    product.description_ar = data.get("description_ar", "")
    product.price = Decimal(data["price"])
    product.compare_at_price = (
        Decimal(data["compare_at_price"]) if data.get("compare_at_price") else None
    )
    product.stock = data.get("stock", 0)
    product.tags = ",".join(data.get("tags", []))
    product.benefits = data.get("benefits", [])
    product.ingredients = data.get("ingredients", [])
    product.how_to_use = data.get("how_to_use", [])
    product.suitable_for = data.get("suitable_for", [])
    product.faqs = data.get("faqs", [])
    product.variants = data.get("variants", [])
    product.is_featured = data.get("is_featured", False)
    product.is_bestseller = data.get("is_bestseller", False)
    product.is_new = data.get("is_new", False)
    product.is_active = data.get("is_active", True)

    # نُضيف المنتج للجلسة قبل ربط العلاقات حتى يحافظ SQLAlchemy على
    # المزامنة الخلفية دون تحذير SAWarning عن كائن خارج الجلسة.
    db.session.add(product)

    category = _resolve_category(data.get("category_slug"))
    product.category = category

    # مزامنة الصور
    product.images.clear()
    for index, image in enumerate(data.get("images", [])):
        product.images.append(
            ProductImage(
                url=image["url"],
                alt_en=image.get("alt_en", ""),
                alt_ar=image.get("alt_ar", ""),
                sort_order=index,
            )
        )

    # مزامنة الاهتمامات
    concern_slugs = data.get("concerns", [])
    if concern_slugs:
        concerns = Concern.query.filter(Concern.slug.in_(concern_slugs)).all()
        product.concerns = concerns

    db.session.commit()
    return product


# ---------------------------------------------------------------------------
# الطلبات
# ---------------------------------------------------------------------------


def list_orders(status: str | None = None) -> tuple[list[Order], dict]:
    # نحمّل العناصر والعميل مسبقاً لأن `OrderOut` يقرأهما لكل صف.
    query = select(Order).options(
        selectinload(Order.items), selectinload(Order.customer)
    )
    if status:
        query = query.where(Order.status == status)
    query = query.order_by(Order.created_at.desc())
    return paginate(query, 12)


def get_order(order_number: str) -> Order:
    order = Order.query.filter_by(order_number=order_number.strip().upper()).first()
    if order is None:
        raise ApiError("الطلب غير موجود", status_code=404)
    return order


# ربط حقول نموذج الشحن بأعمدة الطلب المسطّحة.
_ORDER_SHIPPING_FIELDS = {
    "firstName": "shipping_first_name",
    "lastName": "shipping_last_name",
    "phone": "shipping_phone",
    "address": "shipping_address",
    "city": "shipping_city",
    "governorate": "shipping_governorate",
    "notes": "notes",
}


def update_order(order: Order, data: dict) -> Order:
    """تحكّم كامل بالطلب من اللوحة: الحالة، الدفع، طريقة الدفع، وبيانات الشحن.

    الحقول كلها اختيارية — يُطبَّق ما أُرسل فقط، فلا يمسّ التعديل الجزئي
    بقية بيانات الطلب.
    """
    if data.get("status"):
        order.status = data["status"]
    if data.get("payment_status"):
        order.payment_status = data["payment_status"]
    if data.get("payment_method"):
        order.payment_method = data["payment_method"]

    shipping = data.get("shipping") or {}
    for field, attr in _ORDER_SHIPPING_FIELDS.items():
        if field in shipping:
            setattr(order, attr, shipping[field])

    db.session.commit()
    return order


# ---------------------------------------------------------------------------
# الكوبونات
# ---------------------------------------------------------------------------


def list_coupons() -> list[Coupon]:
    return (
        db.session.execute(select(Coupon).order_by(Coupon.id.desc())).scalars().all()
    )


def create_coupon(data: dict) -> Coupon:
    code = data["code"].strip().upper()
    if Coupon.query.filter_by(code=code).first():
        raise ApiError("رمز الخصم مستخدم مسبقاً", status_code=409, code="coupon_taken")
    coupon = _apply_coupon_data(Coupon(code=code), data)
    db.session.add(coupon)
    db.session.commit()
    return coupon


def update_coupon(coupon: Coupon, data: dict) -> Coupon:
    if data.get("code"):
        code = data["code"].strip().upper()
        duplicate = Coupon.query.filter(Coupon.code == code, Coupon.id != coupon.id).first()
        if duplicate:
            raise ApiError("رمز الخصم مستخدم مسبقاً", status_code=409, code="coupon_taken")
        coupon.code = code
    coupon = _apply_coupon_data(coupon, data)
    db.session.commit()
    return coupon


def _apply_coupon_data(coupon: Coupon, data: dict) -> Coupon:
    if data.get("discount_type"):
        coupon.discount_type = data["discount_type"]
    if data.get("value"):
        coupon.value = Decimal(data["value"])
    if data.get("min_spend") is not None:
        coupon.min_spend = Decimal(data["min_spend"])
    if "usage_limit" in data:
        coupon.usage_limit = data.get("usage_limit")
    if "valid_from" in data:
        coupon.valid_from = data.get("valid_from")
    if "valid_until" in data:
        coupon.valid_until = data.get("valid_until")
    if "is_active" in data:
        coupon.is_active = data.get("is_active", True)
    return coupon


def delete_coupon(coupon: Coupon) -> None:
    db.session.delete(coupon)
    db.session.commit()


# ---------------------------------------------------------------------------
# العملاء
# ---------------------------------------------------------------------------


def list_customers(search: str | None = None) -> tuple[list[Customer], dict]:
    query = select(Customer)
    search = (search or "").strip()
    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Customer.email).like(pattern),
                func.lower(Customer.first_name).like(pattern),
            )
        )
    query = query.order_by(Customer.created_at.desc())
    return paginate(query, 20)


def update_customer(customer: Customer, data: dict) -> Customer:
    if "is_active" in data:
        customer.is_active = data.get("is_active")
    if "loyalty_points" in data:
        customer.loyalty_points = data.get("loyalty_points")
    db.session.commit()
    return customer


# ---------------------------------------------------------------------------
# الفئات / الأقسام
# ---------------------------------------------------------------------------


def list_admin_categories() -> list[Category]:
    """كل الفئات (نشطة وغير نشطة) — الجذور بترتيبها ثم الأبناء حسب sort_order."""
    return (
        db.session.execute(
            select(Category)
            .where(Category.parent_id.is_(None))
            .options(selectinload(Category.children))
            .order_by(Category.sort_order)
        )
        .scalars()
        .unique()
        .all()
    )


def _products_count_map() -> dict[int, int]:
    """عدد المنتجات لكل فئة دفعة واحدة (بدل N+1 لكل صف)."""
    rows = db.session.execute(
        select(Product.category_id, func.count(Product.id)).group_by(Product.category_id)
    ).all()
    return {category_id: count for category_id, count in rows if category_id is not None}


def category_admin_tree() -> list[dict]:
    """شجرة الفئات مع الأبناء بشكل متكرر وعدد المنتجات — لإعادة البناء في اللوحة."""
    counts = _products_count_map()
    # نغرس العدد في استعلام واحد عبر دالة متكررة على الكائنات المحملة.
    cache: dict[int, dict] = {}

    def walk(category: Category) -> dict:
        payload = category_admin_payload(category, counts.get(category.id, 0))
        payload["children"] = [walk(child) for child in category.children]
        cache[category.id] = payload
        return payload

    return [walk(root) for root in list_admin_categories()]


def get_category_or_404(category_id: int) -> Category:
    category = db.session.get(Category, category_id)
    if category is None:
        raise ApiError("الفئة غير موجودة", status_code=404)
    return category


def _resolve_parent(data: dict) -> Category | None:
    """يحلّ الفئة الأب من slug إن وُجد — الجذور لا تملك أباً."""
    parent_slug = data.get("parent_slug")
    if not parent_slug:
        return None
    parent = Category.query.filter_by(slug=parent_slug).first()
    if parent is None:
        raise ApiError("الفئة الأب غير موجودة", status_code=422, code="bad_parent")
    if parent.parent_id is not None:
        raise ApiError("لا يمكن أن يكون الأب نفسه فرعاً (مستوى واحد فقط)", status_code=422)
    return parent


def create_category(data: dict) -> Category:
    slug = data["slug"]
    if Category.query.filter_by(slug=slug).first():
        raise ApiError("اسم الفئة (slug) مستخدم مسبقاً", status_code=409, code="slug_taken")
    parent = _resolve_parent(data)
    category = Category(
        parent_id=parent.id if parent else None,
        slug=slug,
        name_ar=data.get("name_ar", ""),
        name_en=data["name_en"],
        description_ar=data.get("description_ar", ""),
        description_en=data.get("description_en", ""),
        image_url=data.get("image_url"),
        sort_order=data.get("sort_order", 0),
        is_featured=data.get("is_featured", False),
        is_active=data.get("is_active", True),
    )
    db.session.add(category)
    db.session.commit()
    return category


def update_category(category: Category, data: dict) -> Category:
    if data.get("slug"):
        duplicate = Category.query.filter(Category.slug == data["slug"], Category.id != category.id).first()
        if duplicate:
            raise ApiError("اسم الفئة (slug) مستخدم مسبقاً", status_code=409, code="slug_taken")

    # الفئة الأب — نسمح بتغييرها أو إزالتها عن طريق إرسال parentSlug = null.
    if data.get("parent_slug") is not None:
        parent = Category.query.filter_by(slug=data["parent_slug"]).first()
        if parent is None:
            raise ApiError("الفئة الأب غير موجودة", status_code=422, code="bad_parent")
        if parent.id == category.id:
            raise ApiError("لا يمكن أن تكون الفئة أباً لنفسها", status_code=422)
        if parent.parent_id is not None:
            raise ApiError("لا يمكن أن يكون الأب نفسه فرعاً (مستوى واحد فقط)", status_code=422)
        category.parent_id = parent.id
    elif "parent_slug" in data:
        category.parent_id = None

    for field, attr in [
        ("slug", "slug"),
        ("name_ar", "name_ar"),
        ("name_en", "name_en"),
        ("description_ar", "description_ar"),
        ("description_en", "description_en"),
        ("is_featured", "is_featured"),
        ("is_active", "is_active"),
        ("sort_order", "sort_order"),
    ]:
        if field in data:
            setattr(category, attr, data[field])

    if data.get("image_url") is not None:
        category.image_url = data["image_url"]
    elif "image_url" in data:
        category.image_url = None

    db.session.commit()
    return category


def delete_category(category: Category) -> None:
    """إخفاء الفئة منطقياً — يبقى السجل محفوظاً حتى لا تنكسر الطلبات السابقة."""
    category.is_active = False
    db.session.commit()


def move_category(category: Category, direction: str) -> list[Category]:
    """نقل السهم لأعلى/أسفل بين إخوته في نفس المستوى بترتيب sort_order."""
    siblings = (
        db.session.execute(
            select(Category)
            .where(Category.parent_id == category.parent_id)  # None == None يعمل على SQLite
            .order_by(Category.sort_order, Category.id)
        )
        .scalars()
        .all()
    )
    index = next((i for i, item in enumerate(siblings) if item.id == category.id), None)
    if index is None:
        raise ApiError("الفئة غير موجودة", status_code=404)
    target = index - 1 if direction == "up" else index + 1
    if target < 0 or target >= len(siblings):
        return siblings  # في الطرف — لا شيء يتحرك
    category.sort_order, siblings[target].sort_order = (
        siblings[target].sort_order,
        category.sort_order,
    )
    db.session.commit()
    return siblings


# ---------------------------------------------------------------------------
# الباقات (الطقوس الجاهزة)
# ---------------------------------------------------------------------------


def list_admin_bundles() -> list[Bundle]:
    """كل الباقات (نشطة ومخفية) مع أعضائها ومنتجاتهم — لإعادة عرضها وتحريرها."""
    query = select(Bundle).options(
        selectinload(Bundle.items).selectinload(BundleItem.product)
    )
    return list(db.session.execute(query.order_by(Bundle.sort_order, Bundle.id)).scalars().unique().all())


def get_bundle_or_404(bundle_id: int) -> Bundle:
    bundle = _bundle_with_items(bundle_id)
    if bundle is None:
        raise ApiError("الباقة غير موجودة", status_code=404)
    return bundle


def _bundle_with_items(bundle_id: int) -> Bundle | None:
    query = (
        select(Bundle)
        .where(Bundle.id == bundle_id)
        .options(selectinload(Bundle.items).selectinload(BundleItem.product))
    )
    return db.session.execute(query).scalars().unique().first()


def _resolve_bundle_rows(data: dict) -> list[tuple[Product, int]]:
    """يحلّ أعضاء الباقة من slugs ويتحقق من صحة الكميات."""
    rows: list[tuple[Product, int]] = []
    for entry in data.get("items", []):
        product = Product.query.filter_by(slug=entry["slug"]).first()
        if product is None:
            raise ApiError(f"المنتج {entry['slug']} غير موجود", status_code=422, code="bad_product")
        rows.append((product, max(1, int(entry.get("quantity", 1)))))
    if not rows:
        raise ApiError("يجب إضافة منتج واحد على الأقل للباقة", status_code=422)
    return rows


def _members_total(rows: list[tuple[Product, int]]) -> Decimal:
    return sum((Decimal(product.price) * quantity for product, quantity in rows), Decimal("0"))


def _sync_bundle_coupon(bundle: Bundle, member_total: Decimal) -> None:
    """يُنشئ/يحدّث كوبون الخصم الخاص بالباقة ليطابق سعرها المعلن.

    الـ checkout يطبّق هذا الكوبون عند جمع أعضاء الباقة، فيدفع العميل
    `price` المعلن بدل مجموع الأسعار. بلا هذا الكوبون تُباع الباقة
    بمجموع أعضائها كاملاً — فلا فائدة من تحديد سعر مختلف.
    """
    savings = member_total - bundle.price
    if savings <= 0:
        if bundle.coupon_code:
            coupon = Coupon.query.filter_by(code=bundle.coupon_code).first()
            if coupon:
                coupon.is_active = False
            bundle.coupon_code = None
        return

    code = (bundle.coupon_code or f"BUNDLE-{bundle.slug}").strip().upper()
    coupon = Coupon.query.filter_by(code=code).first()
    if coupon is None:
        coupon = Coupon(code=code, discount_type="fixed")
        db.session.add(coupon)
    coupon.discount_type = "fixed"
    coupon.value = savings
    coupon.min_spend = member_total
    coupon.usage_limit = None
    coupon.valid_from = None
    coupon.valid_until = None
    coupon.is_active = bundle.is_active
    bundle.coupon_code = code


def _save_bundle(bundle: Bundle, data: dict) -> Bundle:
    """يطبّق بيانات BundleWriteSchema على الباقة (ينشئ أو يحدّث)."""
    bundle.slug = data["slug"]
    bundle.name_en = data["name_en"]
    bundle.name_ar = data.get("name_ar", "")
    bundle.description_en = data.get("description_en", "")
    bundle.description_ar = data.get("description_ar", "")
    bundle.image_url = data.get("image_url", "")
    bundle.badge_en = data.get("badge_en") or None
    bundle.badge_ar = data.get("badge_ar") or None
    bundle.price = Decimal(data["price"])
    bundle.sort_order = data.get("sort_order", 0)
    bundle.is_active = data.get("is_active", True)

    rows = _resolve_bundle_rows(data)
    bundle.items.clear()
    for position, (product, quantity) in enumerate(rows):
        bundle.items.append(
            BundleItem(product_id=product.id, quantity=quantity, position=position)
        )
    bundle.compare_at_price = _members_total(rows)

    # كود جديد يُكتب كما أُدخل؛ الفارغ يعني الإبقاء على الحالي أو التوليد آلياً.
    incoming_code = (data.get("coupon_code") or "").strip()
    if incoming_code:
        bundle.coupon_code = incoming_code

    # تُضاف للنادر آخر شيء — بعد اكتمال الحقول، فلا يستبقها autoflush
    # بسجل ناقص (compare_at_price إلزامية).
    db.session.add(bundle)

    _sync_bundle_coupon(bundle, bundle.compare_at_price)
    db.session.commit()
    return bundle


def create_bundle(data: dict) -> Bundle:
    if Bundle.query.filter_by(slug=data["slug"]).first():
        raise ApiError("معرّف الباقة مستخدم مسبقاً", status_code=409, code="slug_taken")
    return _save_bundle(Bundle(), data)


def update_bundle(bundle: Bundle, data: dict) -> Bundle:
    if data.get("slug"):
        duplicate = Bundle.query.filter(Bundle.slug == data["slug"], Bundle.id != bundle.id).first()
        if duplicate:
            raise ApiError("معرّف الباقة مستخدم مسبقاً", status_code=409, code="slug_taken")
    return _save_bundle(bundle, data)


def patch_bundle(bundle: Bundle, data: dict) -> Bundle:
    """تحديث سريع (إخفاء/تفعيل/ترتيب) دون إعادة فتح هدف التعديل الكامل."""
    if "is_active" in data:
        bundle.is_active = data.get("is_active")
        if bundle.coupon_code:
            coupon = Coupon.query.filter_by(code=bundle.coupon_code).first()
            if coupon:
                coupon.is_active = bundle.is_active
    if "sort_order" in data:
        bundle.sort_order = data.get("sort_order")
    db.session.commit()
    return bundle


def delete_bundle(bundle: Bundle) -> None:
    """إخفاء منطقي — يبقى السجل وطلباته السابقة سليمة، ويُعطَّل كوبونه."""
    bundle.is_active = False
    if bundle.coupon_code:
        coupon = Coupon.query.filter_by(code=bundle.coupon_code).first()
        if coupon:
            coupon.is_active = False
    db.session.commit()


def move_bundle(bundle: Bundle, direction: str) -> None:
    """إعادة ترتيب الباقة لأعلى/أسفل في قائمة الباقات العامة."""
    order = (
        db.session.execute(select(Bundle).order_by(Bundle.sort_order, Bundle.id))
        .scalars()
        .all()
    )
    index = next((i for i, item in enumerate(order) if item.id == bundle.id), None)
    if index is None:
        raise ApiError("الباقة غير موجودة", status_code=404)
    target = index - 1 if direction == "up" else index + 1
    if target < 0 or target >= len(order):
        return
    bundle.sort_order, order[target].sort_order = order[target].sort_order, bundle.sort_order
    db.session.commit()


# ---------------------------------------------------------------------------
# المدونة / المقالات
# ---------------------------------------------------------------------------


def list_admin_articles() -> list[JournalArticle]:
    """كل المقالات (منشورة ومخفية) — المميز أولاً ثم الأحدث."""
    query = select(JournalArticle).order_by(
        JournalArticle.is_featured.desc(),
        JournalArticle.publish_date.desc(),
        JournalArticle.id.desc(),
    )
    return list(db.session.execute(query).scalars().all())


def get_article_or_404(article_id: int) -> JournalArticle:
    article = db.session.get(JournalArticle, article_id)
    if article is None:
        raise ApiError("المقال غير موجود", status_code=404)
    return article


def _save_article(article: JournalArticle, data: dict) -> JournalArticle:
    """يطبّق بيانات JournalWriteSchema على المقال (ينشئ أو يحدّث)."""
    article.slug = data["slug"]
    article.title_en = data["title_en"]
    article.title_ar = data.get("title_ar", "")
    article.excerpt_en = data.get("excerpt_en", "")
    article.excerpt_ar = data.get("excerpt_ar", "")
    article.content_en = [line for line in data.get("content_en", []) if line.strip()]
    article.content_ar = [line for line in data.get("content_ar", []) if line.strip()]
    article.category = data.get("category") or "المدونة"
    article.author = data.get("author") or "فريق شيلايت"
    article.read_time = data.get("read_time") or "قراءة 5 دقائق"
    article.publish_date = data["publish_date"]
    article.image_url = data.get("image_url", "")
    article.is_featured = data.get("is_featured", False)
    article.is_published = data.get("is_published", True)

    db.session.add(article)
    db.session.commit()
    return article


def create_article(data: dict) -> JournalArticle:
    if JournalArticle.query.filter_by(slug=data["slug"]).first():
        raise ApiError("معرّف المقال مستخدم مسبقاً", status_code=409, code="slug_taken")
    return _save_article(JournalArticle(), data)


def update_article(article: JournalArticle, data: dict) -> JournalArticle:
    if data.get("slug"):
        duplicate = JournalArticle.query.filter(
            JournalArticle.slug == data["slug"], JournalArticle.id != article.id
        ).first()
        if duplicate:
            raise ApiError("معرّف المقال مستخدم مسبقاً", status_code=409, code="slug_taken")
    return _save_article(article, data)


def patch_article(article: JournalArticle, data: dict) -> JournalArticle:
    """تحديث سريع — تمييز المقال و/أو نشره/إخفاؤه."""
    if "is_featured" in data:
        article.is_featured = data.get("is_featured")
    if "is_published" in data:
        article.is_published = data.get("is_published")
    db.session.commit()
    return article


def delete_article(article: JournalArticle) -> None:
    """إخفاء منطقي — يبقى المقال قابلاً للنشر مجدداً دون فقد محتواه."""
    article.is_published = False
    article.is_featured = False
    db.session.commit()