"""add users and auth

Revision ID: a1b2c3d4e5f6
Revises: 824985a93d1d
Create Date: 2026-05-03 00:00:00.000000

"""
from __future__ import annotations

from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "824985a93d1d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        # if_not_exists not supported in all alembic versions; migration is idempotent via version tracking
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            default=lambda: datetime.now(timezone.utc),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            default=lambda: datetime.now(timezone.utc),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "password_reset_codes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("code", sa.String(8), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            default=lambda: datetime.now(timezone.utc),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            default=lambda: datetime.now(timezone.utc),
        ),
    )
    op.create_index("ix_password_reset_codes_user_id", "password_reset_codes", ["user_id"])

    with op.batch_alter_table("goal_buckets") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer, nullable=True))
        batch_op.create_foreign_key("fk_goal_buckets_user_id", "users", ["user_id"], ["id"])
        batch_op.create_index("ix_goal_buckets_user_id", ["user_id"])

    with op.batch_alter_table("architect_sessions") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer, nullable=True))
        batch_op.create_foreign_key("fk_architect_sessions_user_id", "users", ["user_id"], ["id"])
        batch_op.create_index("ix_architect_sessions_user_id", ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("architect_sessions") as batch_op:
        batch_op.drop_index("ix_architect_sessions_user_id")
        batch_op.drop_column("user_id")

    with op.batch_alter_table("goal_buckets") as batch_op:
        batch_op.drop_index("ix_goal_buckets_user_id")
        batch_op.drop_column("user_id")

    op.drop_table("password_reset_codes")
    op.drop_table("users")
