"""add_candidate_and_job_application_tables

Revision ID: d6351b538d4b
Revises: 9c0f702d3178
Create Date: 2026-02-11 15:13:58.266298

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6351b538d4b'
down_revision: Union[str, Sequence[str], None] = '9c0f702d3178'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create candidates table
    op.create_table(
        'candidates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('current_company', sa.String(), nullable=True),
        sa.Column('current_position', sa.String(), nullable=True),
        sa.Column('experience_years', sa.Float(), nullable=True),
        sa.Column('nationality', sa.String(), nullable=True),
        sa.Column('notice_period', sa.String(), nullable=True),
        sa.Column('current_salary', sa.Float(), nullable=True),
        sa.Column('expected_salary', sa.Float(), nullable=True),
        sa.Column('skills', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('education', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('experience_history', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('social_links', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('resume_file_path', sa.String(), nullable=True),
        sa.Column('parsed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidates_email'), 'candidates', ['email'], unique=True)
    op.create_index(op.f('ix_candidates_id'), 'candidates', ['id'], unique=False)
    
    # Create job_applications table
    op.create_table(
        'job_applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('current_stage', sa.String(), nullable=True),
        sa.Column('application_status', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id'], ),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('job_applications')
    op.drop_index(op.f('ix_candidates_id'), table_name='candidates')
    op.drop_index(op.f('ix_candidates_email'), table_name='candidates')
    op.drop_table('candidates')
