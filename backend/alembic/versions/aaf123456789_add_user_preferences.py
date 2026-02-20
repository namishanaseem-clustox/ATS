"""add_user_preferences

Revision ID: aaf123456789
Revises: 2b48e34abd3b
Create Date: 2026-02-20 09:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'aaf123456789'
down_revision = '2b48e34abd3b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('notify_new_candidate', sa.Boolean(), nullable=True, default=True),
        sa.Column('notify_activity_assigned', sa.Boolean(), nullable=True, default=True),
        sa.Column('notify_feedback_submitted', sa.Boolean(), nullable=True, default=True),
        sa.Column('notify_stage_change', sa.Boolean(), nullable=True, default=True),
        sa.Column('timezone', sa.String(), nullable=True, default='UTC'),
        sa.Column('date_format', sa.String(), nullable=True, default='DD/MM/YYYY'),
        sa.Column('language', sa.String(), nullable=True, default='en'),
    )
    op.create_index('ix_user_preferences_id', 'user_preferences', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_user_preferences_id', table_name='user_preferences')
    op.drop_table('user_preferences')
