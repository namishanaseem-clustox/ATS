"""Make job_id nullable in scheduled_activities

Revision ID: e123456789ab
Revises: d6351b538d4b
Create Date: 2026-02-12 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e123456789ab'
down_revision: Union[str, Sequence[str], None] = 'd6351b538d4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create scheduled_activities table (was not created in any earlier migration)
    op.create_table(
        'scheduled_activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id'), nullable=True),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('candidates.id'), nullable=True),
        sa.Column('scorecard_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('scorecard_templates.id'), nullable=True),
        sa.Column('activity_type', sa.String(), nullable=False, server_default='Task'),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='Pending'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('participants', postgresql.JSONB(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(op.f('ix_scheduled_activities_id'), 'scheduled_activities', ['id'], unique=False)

    # Create activity_assignees association table (depends on scheduled_activities and users)
    op.create_table(
        'activity_assignees',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('scheduled_activities.id'), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), primary_key=True, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('activity_assignees')
    op.drop_index(op.f('ix_scheduled_activities_id'), table_name='scheduled_activities')
    op.drop_table('scheduled_activities')

