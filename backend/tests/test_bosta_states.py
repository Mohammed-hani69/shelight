"""اختبارات تحويل حالات Bosta الرسمية.

تتحقّق من التحويل مقابل جدول الحالات الموثّق في
https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook/

الهدف: أي كود رسمي يجب أن يُنتج حالة داخلية معروفة، وأي كود غير رسمي
يجب أن يُتجاهل (لا تخمين).
"""
from __future__ import annotations

import pytest

from app.modules.shipping.bosta.states import (
    BOSTA_SHIPMENT_TYPES,
    BOSTA_STATE_TABLE,
    INTERNAL_SHIPPING_STATUSES,
    STATUS_CANCELED,
    STATUS_DELIVERED,
    STATUS_EXCEPTION,
    STATUS_LOST,
    STATUS_OUT_FOR_DELIVERY,
    STATUS_PENDING,
    STATUS_PICKED_UP,
    STATUS_RETURNING,
    STATUS_TERMINATED,
    map_bosta_state,
    normalize_state_code,
    normalize_type,
    state_name,
)


@pytest.mark.parametrize(
    "code,shipment_type",
    [(code, shipment_type) for code in BOSTA_STATE_TABLE for shipment_type in BOSTA_SHIPMENT_TYPES],
)
def test_every_official_code_maps_to_a_known_status(code, shipment_type):
    """كل كود رسمي + كل نوع شحن معروف => حالة داخلية معروفة (لا استثناء)."""
    result = map_bosta_state(code, shipment_type)
    assert result is not None, f"code={code} type={shipment_type}"
    assert result in INTERNAL_SHIPPING_STATUSES


@pytest.mark.parametrize(
    "code,shipment_type",
    [
        (code, shipment_type)
        for code in BOSTA_STATE_TABLE
        for shipment_type in (*BOSTA_SHIPMENT_TYPES, None, "", "UNKNOWN_TYPE", 123, [], {})
    ],
)
def test_no_official_code_ever_raises(code, shipment_type):
    """قيم غير متوقعة في ``type`` لا يجوز أن تُسقط معالجة الـ webhook."""
    assert map_bosta_state(code, shipment_type) in (INTERNAL_SHIPPING_STATUSES | {None})


# ---------------------------------------------------------------------------
# الحالات الحرجة حيث يغيّر نوع الشحنة المعنى
# ---------------------------------------------------------------------------


def test_code_41_send_is_out_for_delivery():
    assert map_bosta_state(41, "SEND") == STATUS_OUT_FOR_DELIVERY
    assert map_bosta_state(41, "FXF_SEND") == STATUS_OUT_FOR_DELIVERY


@pytest.mark.parametrize("shipment_type", ["RTO", "EXCHANGE", "CUSTOMER_RETURN_PICKUP"])
def test_code_41_return_types_are_returning(shipment_type):
    assert map_bosta_state(41, shipment_type) == STATUS_RETURNING


def test_code_41_without_type_is_the_neutral_pickup():
    assert map_bosta_state(41, None) == STATUS_PICKED_UP


@pytest.mark.parametrize("shipment_type", ["SEND", None, "CASH_COLLECTION"])
def test_code_40_cash_collection_is_picked_up(shipment_type):
    """40 = Picking up (Cash Collection) — كان يرفع KeyError قبل الإصلاح."""
    assert map_bosta_state(40, shipment_type) == STATUS_PICKED_UP


@pytest.mark.parametrize("shipment_type", ["EXCHANGE", "CUSTOMER_RETURN_PICKUP", "RTO"])
def test_code_40_keeps_return_types_returning(shipment_type):
    """أنواع الإرجاع لها الأولوية في كل الأكواد، بما فيها 40."""
    assert map_bosta_state(40, shipment_type) == STATUS_RETURNING


@pytest.mark.parametrize("code", [22, 23])
def test_consignee_pickup_is_returning(code):
    assert map_bosta_state(code, "EXCHANGE") == STATUS_RETURNING
    assert map_bosta_state(code, "CUSTOMER_RETURN_PICKUP") == STATUS_RETURNING


def test_direct_mappings():
    assert map_bosta_state(45, "SEND") == STATUS_DELIVERED
    assert map_bosta_state(47, "SEND") == STATUS_EXCEPTION
    assert map_bosta_state(48, "SEND") == STATUS_TERMINATED
    assert map_bosta_state(49, "SEND") == STATUS_CANCELED
    assert map_bosta_state(100, "SEND") == STATUS_LOST
    assert map_bosta_state(24, "SEND") == STATUS_PENDING


# ---------------------------------------------------------------------------
# الأكواد غير الرسمية
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("code", [None, 0, -1, 26, 46.0, True, False, "45x", "", [], {}])
def test_unknown_or_malformed_codes_are_ignored(code):
    assert map_bosta_state(normalize_state_code(code)) is None


def test_unknown_numeric_code_is_ignored():
    assert map_bosta_state(9999, "SEND") is None


# ---------------------------------------------------------------------------
# تطبيع المدخلات
# ---------------------------------------------------------------------------


def test_normalize_state_code_accepts_digits_string():
    """بعض النسخ ترسل state كنص."""
    assert normalize_state_code("45") == 45
    assert normalize_state_code(" 45 ") == 45
    assert normalize_state_code(45) == 45


def test_normalize_state_code_rejects_bool():
    """bool صنف فرعي من int — نقبله خطأً لو مررناه مباشرة."""
    assert normalize_state_code(True) is None
    assert normalize_state_code(False) is None


def test_normalize_type_is_case_insensitive_and_whitespace_tolerant():
    assert normalize_type("send") == "SEND"
    assert normalize_type("  RTO  ") == "RTO"
    assert normalize_type("NOT_A_TYPE") is None
    assert normalize_type(None) is None
    assert normalize_type(7) is None


def test_state_name_is_the_official_english_label():
    assert state_name(45) == "Delivered"
    assert state_name(41) == "Picked up"
    assert state_name(9999) is None
    assert state_name(None) is None


def test_official_table_is_not_invented():
    # حماية من إضافة أكواد مخترعة لاحقاً بلا مراجعة الوثيقة.
    assert set(BOSTA_STATE_TABLE) == {
        10, 11, 20, 22, 23, 24, 25, 30, 40, 41, 45, 46, 47, 48, 49, 60,
        100, 101, 102, 103, 104, 105,
    }
    assert set(BOSTA_SHIPMENT_TYPES) == {
        "SEND",
        "EXCHANGE",
        "CUSTOMER_RETURN_PICKUP",
        "RTO",
        "SIGN_AND_RETURN",
        "FXF_SEND",
    }
