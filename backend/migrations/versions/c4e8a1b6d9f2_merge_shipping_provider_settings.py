"""merge shipping provider settings into the main line

Revision ID: c4e8a1b6d9f2
Revises: d9b3f59c8a12, f1c7a9d2e4b6
Create Date: 2026-10-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c4e8a1b6d9f2"
down_revision = ("d9b3f59c8a12", "f1c7a9d2e4b6")
branch_labels = None
depends_on = None


def upgrade():
    # دمج فقط، بلا مخطط: ابنا هذا كُتبا على فرعين مستقلين فتبقّا رأسان
    # متعددان، وهذا الـ rev يوحّدهما في سلسلة واحدة.
    pass


def downgrade():
    pass