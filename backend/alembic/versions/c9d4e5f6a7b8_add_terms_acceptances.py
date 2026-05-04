"""add terms_acceptances table and users.latest_terms_version

Revision ID: c9d4e5f6a7b8
Revises: b8e1d2c3f4a5
Create Date: 2026-05-04 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c9d4e5f6a7b8'
down_revision: Union[str, None] = 'b8e1d2c3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('latest_terms_version', sa.String(20), nullable=True))

    op.create_table(
        'terms_acceptances',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('terms_version', sa.String(20), nullable=False),
        sa.Column('terms_hash', sa.String(64), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
    )
    op.create_index(
        'idx_terms_acceptances_user_version',
        'terms_acceptances',
        ['user_id', 'terms_version'],
    )


def downgrade() -> None:
    op.drop_index('idx_terms_acceptances_user_version', table_name='terms_acceptances')
    op.drop_table('terms_acceptances')
    op.drop_column('users', 'latest_terms_version')
