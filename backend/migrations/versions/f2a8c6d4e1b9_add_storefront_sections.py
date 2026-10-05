"""add configurable storefront sections

Revision ID: f2a8c6d4e1b9
Revises: e1c9a7b5d3f2
Create Date: 2026-10-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "f2a8c6d4e1b9"
down_revision = "e1c9a7b5d3f2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "storefront_sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_key", sa.String(length=80), nullable=False),
        sa.Column("section_type", sa.String(length=40), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("section_key"),
    )
    op.create_index(
        "ix_storefront_sections_section_key",
        "storefront_sections",
        ["section_key"],
    )


def downgrade():
    op.drop_index("ix_storefront_sections_section_key", table_name="storefront_sections")
    op.drop_table("storefront_sections")
