"""add ai screening fields to job applications

Revision ID: add_ai_screening_manual
Revises: 8342d0c9a488
Create Date: 2026-02-13 18:43:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_ai_screening_manual'
down_revision: Union[str, Sequence[str], None] = '8342d0c9a488'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ai_score and ai_analysis columns to job_applications table."""
    op.add_column('job_applications', sa.Column('ai_score', sa.Float(), nullable=True))
    op.add_column('job_applications', sa.Column('ai_analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Remove ai_score and ai_analysis columns from job_applications table."""
    op.drop_column('job_applications', 'ai_analysis')
    op.drop_column('job_applications', 'ai_score')
