"""add declined to invitations

Revision ID: a1b2c3d4e5f6
Revises: f3c9b9878f81
Create Date: 2026-03-26 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f3c9b9878f81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('invitations', sa.Column('declined', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('invitations', sa.Column('declined_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('invitations', 'declined_at')
    op.drop_column('invitations', 'declined')
