"""add event lifecycle fields and feedback table

Revision ID: b1a2c3d4e5f6
Revises: 9a443a672c73
Create Date: 2026-11-22 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b1a2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9a443a672c73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add columns to events table safely
    op.add_column('events', sa.Column('target_branches', sa.JSON(), nullable=True))
    op.add_column('events', sa.Column('event_type', sa.String(length=100), nullable=True))
    op.add_column('events', sa.Column('budget', sa.String(length=100), nullable=True))
    op.add_column('events', sa.Column('venue_permission_status', sa.String(length=50), nullable=True, server_default='pending'))
    op.add_column('events', sa.Column('judgment_criteria', sa.Text(), nullable=True))
    op.add_column('events', sa.Column('prizes', sa.Text(), nullable=True))
    op.add_column('events', sa.Column('concluding_remarks', sa.Text(), nullable=True))
    op.add_column('events', sa.Column('event_photos', sa.JSON(), nullable=True))

    # Create feedbacks table
    op.create_table(
        'feedbacks',
        sa.Column('id', sa.UUID(as_uuid=False), primary_key=True),
        sa.Column('event_id', sa.UUID(as_uuid=False), sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('feedbacks')
    op.drop_column('events', 'event_photos')
    op.drop_column('events', 'concluding_remarks')
    op.drop_column('events', 'prizes')
    op.drop_column('events', 'judgment_criteria')
    op.drop_column('events', 'venue_permission_status')
    op.drop_column('events', 'budget')
    op.drop_column('events', 'event_type')
    op.drop_column('events', 'target_branches')
