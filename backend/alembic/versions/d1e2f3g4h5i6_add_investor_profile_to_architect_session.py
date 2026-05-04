"""add investor profile to architect session

Revision ID: d1e2f3g4h5i6
Revises: c9d4e5f6a7b8
Create Date: 2024-05-04 10:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd1e2f3g4h5i6'
down_revision = 'c9d4e5f6a7b8'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('architect_sessions', sa.Column('investor_profile_json', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('architect_sessions', 'investor_profile_json')
