"""add universe_etfs and universe_blacklist tables

Revision ID: b8e1d2c3f4a5
Revises: f7c3a1b2d9e0
Create Date: 2026-05-03 00:30:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8e1d2c3f4a5'
down_revision: Union[str, None] = 'f7c3a1b2d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'universe_etfs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('ticker', sa.String(15), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('isin', sa.String(20), nullable=True),
        sa.Column('domicile', sa.String(2), nullable=False),
        sa.Column('distribution', sa.String(15), nullable=False),
        sa.Column('ucits', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('ter', sa.Float(), nullable=False),
        sa.Column('aum_b', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('inception', sa.Date(), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('description_he', sa.Text(), nullable=True),
        sa.Column('bucket_name', sa.String(40), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_universe_etfs_ticker', 'universe_etfs', ['ticker'], unique=True)
    op.create_index('ix_universe_etfs_bucket_name', 'universe_etfs', ['bucket_name'])
    op.create_index('idx_universe_bucket_active', 'universe_etfs', ['bucket_name', 'is_active'])

    op.create_table(
        'universe_blacklist',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('ticker', sa.String(15), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_universe_blacklist_ticker', 'universe_blacklist', ['ticker'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_universe_blacklist_ticker', table_name='universe_blacklist')
    op.drop_table('universe_blacklist')
    op.drop_index('idx_universe_bucket_active', table_name='universe_etfs')
    op.drop_index('ix_universe_etfs_bucket_name', table_name='universe_etfs')
    op.drop_index('ix_universe_etfs_ticker', table_name='universe_etfs')
    op.drop_table('universe_etfs')
