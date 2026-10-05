from __future__ import annotations

from flask import Blueprint, jsonify, request
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.core.security import admin_required
from app.extensions import db
from app.models import Product, StorefrontSection
from app.modules.products.schemas import ProductListOut

public_bp = Blueprint("storefront_sections", __name__, url_prefix="/storefront/sections")
admin_bp = Blueprint("storefront_sections_admin", __name__, url_prefix="/admin/storefront/sections")


class SectionWriteSchema(Schema):
    sectionType = fields.Str(required=True, validate=validate.Length(min=1, max=40))
    isActive = fields.Bool(load_default=False)
    title = fields.Str(load_default="", validate=validate.Length(max=160))
    description = fields.Str(load_default="", validate=validate.Length(max=500))
    productIds = fields.List(fields.Int(strict=True), load_default=list, validate=validate.Length(max=30))


def _section_or_default(section_key: str) -> StorefrontSection | None:
    return StorefrontSection.query.filter_by(section_key=section_key).first()


def _products_for_section(content: dict) -> list[Product]:
    raw_ids = content.get("productIds", [])
    ids = [value for value in raw_ids if isinstance(value, int) and not isinstance(value, bool)]
    if not ids:
        return []
    products = db.session.execute(
        select(Product)
        .where(
            Product.id.in_(ids),
            Product.is_active.is_(True),
            Product.compare_at_price.is_not(None),
            Product.compare_at_price > Product.price,
        )
        .options(selectinload(Product.images), selectinload(Product.category))
    ).scalars().all()
    products_by_id = {product.id: product for product in products}
    return [products_by_id[product_id] for product_id in ids if product_id in products_by_id]


def _section_payload(section: StorefrontSection) -> dict:
    content = section.content or {}
    return {
        "key": section.section_key,
        "type": section.section_type,
        "isActive": section.is_active,
        "title": content.get("title", ""),
        "description": content.get("description", ""),
        "productIds": content.get("productIds", []),
    }


@public_bp.get("/<section_key>")
def get_public_section(section_key: str):
    section = _section_or_default(section_key)
    if section is None or not section.is_active:
        return jsonify({"data": None})
    content = section.content or {}
    products = _products_for_section(content)
    payload = _section_payload(section)
    payload["products"] = ProductListOut(many=True, lang="ar").dump(products)
    return jsonify({"data": payload})


@admin_bp.get("/<section_key>")
@admin_required()
def get_admin_section(section_key: str):
    section = _section_or_default(section_key)
    if section is not None:
        return jsonify({"data": _section_payload(section)})
    return jsonify(
        {
            "data": {
                "key": section_key,
                "type": "product_offer_popup" if section_key == "offers_popup" else "custom",
                "isActive": False,
                "title": "",
                "description": "",
                "productIds": [],
            }
        }
    )


@admin_bp.put("/<section_key>")
@admin_required()
def save_admin_section(section_key: str):
    try:
        data = SectionWriteSchema().load(request.get_json(silent=True) or {})
    except ValidationError as error:
        raise ApiError("بيانات القسم غير صالحة", status_code=400, code="invalid_section") from error

    product_ids = data["productIds"]
    if product_ids:
        valid_ids = db.session.execute(
            select(Product.id).where(
                Product.id.in_(product_ids),
                Product.is_active.is_(True),
                Product.compare_at_price.is_not(None),
                Product.compare_at_price > Product.price,
            )
        ).scalars().all()
        if len(set(valid_ids)) != len(set(product_ids)):
            raise ApiError(
                "اختر منتجات نشطة عليها خصم فعلي فقط.",
                status_code=400,
                code="invalid_offer_products",
            )

    section = _section_or_default(section_key)
    if section is None:
        section = StorefrontSection(section_key=section_key, section_type=data["sectionType"])
    section.section_type = data["sectionType"]
    section.is_active = data["isActive"]
    section.content = {
        "title": data["title"],
        "description": data["description"],
        "productIds": list(dict.fromkeys(product_ids)),
    }
    db.session.add(section)
    db.session.commit()
    return jsonify({"data": _section_payload(section)})
