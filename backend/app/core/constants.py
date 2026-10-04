"""ثوابت عمل المتجر — بُنيت لتطابق حسبة عميل الواجهة تماماً."""
from __future__ import annotations

import os

FREE_SHIPPING_THRESHOLD = int(os.getenv("FREE_SHIPPING_THRESHOLD", "1500"))
SHIPPING_COST = int(os.getenv("SHIPPING_COST", "60"))