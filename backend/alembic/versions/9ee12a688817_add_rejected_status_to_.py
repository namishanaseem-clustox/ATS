"""add rejected status to requisitionstatus enum

Revision ID: 9ee12a688817
Revises: ba37ef88d1d7
Create Date: 2026-02-23 12:54:02.544860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ee12a688817'
down_revision: Union[str, Sequence[str], None] = 'ba37ef88d1d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
