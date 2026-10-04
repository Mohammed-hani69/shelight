"""بواني حِمل (payload builders) لتحليلات الرحلة — مفاتيح camelCase."""
from __future__ import annotations


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def event_payload(event) -> dict:
    return {
        "id": event.id,
        "eventId": event.event_id,
        "name": event.name,
        "visitorId": event.visitor_id,
        "sessionId": event.session_id,
        "customerId": event.customer_id,
        "timestamp": _iso(event.event_timestamp),
        "pageUrl": event.page_url,
        "referrer": event.referrer,
        "path": event.path,
        "properties": event.properties or {},
    }


def cart_item_payload(item) -> dict:
    return {
        "productId": item.product_id,
        "name": item.product_name,
        "slug": item.product_slug,
        "unitPrice": float(item.unit_price),
        "quantity": item.quantity,
        "addedAt": _iso(item.added_at),
        "removedAt": _iso(item.removed_at),
    }


def lead_payload(lead) -> dict | None:
    """هوية العميل المحتمل الملتقطة أثناء الدفع (بلا بريد إلكتروني)."""
    if lead is None:
        return None
    return {
        "id": lead.id,
        "customerId": lead.customer_id,
        "fullName": lead.full_name,
        "primaryPhone": lead.primary_phone,
        "secondaryPhone": lead.secondary_phone,
        "normalizedPhone": lead.normalized_phone,
        "address": lead.address,
        "city": lead.city,
        "governorate": lead.governorate,
        "status": lead.status,
        "recoveryStatus": lead.recovery_status,
        "contactEligible": lead.contact_eligible,
        "firstSeenAt": _iso(lead.first_seen_at),
        "lastActivityAt": _iso(lead.last_activity_at),
        "abandonedAt": _iso(lead.abandoned_at),
    }


def cart_payload(
    cart, customer_email: str | None = None, lead=None, last_step: str | None = None
) -> dict:
    return {
        "id": cart.id,
        "visitorId": cart.visitor_id,
        "customerId": cart.customer_id,
        "customerEmail": customer_email,
        "customerName": lead.full_name if lead else None,
        "primaryPhone": lead.primary_phone if lead else None,
        "secondaryPhone": lead.secondary_phone if lead else None,
        "normalizedPhone": lead.normalized_phone if lead else None,
        "address": lead.address if lead else None,
        "city": lead.city if lead else None,
        "governorate": lead.governorate if lead else None,
        "leadStatus": lead.status if lead else None,
        "recoveryStatus": lead.recovery_status if lead else "NONE",
        "contactEligible": lead.contact_eligible if lead else False,
        "lastCheckoutStep": last_step,
        "status": cart.status,
        "currency": cart.currency,
        "itemsCount": cart.items_count,
        "subtotal": float(cart.subtotal),
        "total": float(cart.total),
        "firstItemAddedAt": _iso(cart.first_item_added_at),
        "lastActivityAt": _iso(cart.last_activity_at),
        "abandonedAt": _iso(cart.abandoned_at),
        "recoveredAt": _iso(cart.recovered_at),
        "convertedAt": _iso(cart.converted_at),
        "items": [cart_item_payload(item) for item in cart.items],
    }


def checkout_payload(checkout) -> dict:
    return {
        "id": checkout.id,
        "checkoutKey": checkout.checkout_key,
        "visitorId": checkout.visitor_id,
        "customerId": checkout.customer_id,
        "status": checkout.status,
        "step": checkout.step,
        "email": checkout.email,
        "itemsCount": checkout.items_count,
        "subtotal": float(checkout.subtotal),
        "discount": float(checkout.discount),
        "shipping": float(checkout.shipping),
        "total": float(checkout.total),
        "paymentMethod": checkout.payment_method,
        "couponCode": checkout.coupon_code,
        "startedAt": _iso(checkout.started_at),
        "completedAt": _iso(checkout.completed_at),
        "lastActivityAt": _iso(checkout.last_activity_at),
    }


def visitor_payload(
    visitor, customer_email: str | None = None, events_count: int | None = None, lead=None
) -> dict:
    return {
        "id": visitor.id,
        "customerId": visitor.customer_id,
        "customerEmail": customer_email,
        "customerName": lead.full_name if lead else None,
        "primaryPhone": lead.primary_phone if lead else None,
        "secondaryPhone": lead.secondary_phone if lead else None,
        "firstSeenAt": _iso(visitor.first_seen_at),
        "lastSeenAt": _iso(visitor.last_seen_at),
        "sessionsCount": visitor.sessions_count,
        "eventsCount": events_count if events_count is not None else visitor.events_count,
        "deviceType": visitor.last_device_type,
        "firstLandingUrl": visitor.first_landing_url,
        "firstReferrer": visitor.first_referrer,
        "utmSource": visitor.first_utm_source,
        "utmMedium": visitor.first_utm_medium,
        "utmCampaign": visitor.first_utm_campaign,
    }
