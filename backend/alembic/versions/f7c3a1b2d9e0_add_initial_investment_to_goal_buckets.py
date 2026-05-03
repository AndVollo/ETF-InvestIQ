"""add initial_investment to goal_buckets

Revision ID: f7c3a1b2d9e0
Revises: 824985a93d1d
Create Date: 2026-05-03 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7c3a1b2d9e0'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('goal_buckets', sa.Column('initial_investment', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('goal_buckets', 'initial_investment')
