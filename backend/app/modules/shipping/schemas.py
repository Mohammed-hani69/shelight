from __future__ import annotations

from decimal import Decimal

from marshmallow import Schema, fields, validate


class BostaSettingsSchema(Schema):
    enabled = fields.Bool(load_default=False)
    environment = fields.Str(
        load_default="sandbox",
        validate=validate.OneOf(["sandbox", "production"]),
    )
    apiKey = fields.Str(load_default=None, allow_none=True)
    clientId = fields.Str(load_default=None, allow_none=True)
    secret = fields.Str(load_default=None, allow_none=True)
    defaultPickupLocation = fields.Str(load_default=None, allow_none=True)
    defaultDeliveryType = fields.Str(load_default=None, allow_none=True)
    defaultPackageType = fields.Str(load_default=None, allow_none=True)
    defaultShippingFee = fields.Decimal(load_default=Decimal("0"), places=2, allow_none=True)


class BostaTestConnectionSchema(Schema):
    apiKey = fields.Str(load_default=None, allow_none=True)
    clientId = fields.Str(load_default=None, allow_none=True)
    secret = fields.Str(load_default=None, allow_none=True)
    environment = fields.Str(load_default="sandbox", validate=validate.OneOf(["sandbox", "production"]))
