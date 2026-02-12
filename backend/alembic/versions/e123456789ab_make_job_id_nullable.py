"""Make job_id nullable in scheduled_activities

Revision ID: e123456789ab
Revises: d6351b538d4b
Create Date: 2026-02-12 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e123456789ab'
down_revision: Union[str, Sequence[str], None] = 'd6351b538d4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('scheduled_activities', 'job_id',
               existing_type=sa.UUID(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('scheduled_activities', 'job_id',
               existing_type=sa.UUID(),
               nullable=False)
