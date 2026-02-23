"""add REJECTED status to requisitionstatus enum

Revision ID: 5299152cf67c
Revises: 9ee12a688817
Create Date: 2026-02-23 13:03:23.521425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5299152cf67c'
down_revision: Union[str, Sequence[str], None] = '9ee12a688817'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
