"""challenge_completion_fields

Revision ID: a3f8c21e4b90
Revises: 18c204469052
Create Date: 2026-05-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3f8c21e4b90"
down_revision: Union[str, Sequence[str], None] = "18c204469052"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("challenge_participants") as batch_op:
        batch_op.add_column(sa.Column("is_completed", sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(), nullable=True))
        batch_op.create_index("ix_challenge_participants_user_id", ["user_id"])
        batch_op.create_index("ix_challenge_participants_challenge_id", ["challenge_id"])

    with op.batch_alter_table("post_likes") as batch_op:
        batch_op.create_index("ix_post_likes_post_id", ["post_id"])

    with op.batch_alter_table("posts") as batch_op:
        batch_op.create_index("ix_posts_category", ["category"])

    with op.batch_alter_table("notifications") as batch_op:
        batch_op.create_index("ix_notifications_type", ["type"])


def downgrade() -> None:
    with op.batch_alter_table("notifications") as batch_op:
        batch_op.drop_index("ix_notifications_type")

    with op.batch_alter_table("posts") as batch_op:
        batch_op.drop_index("ix_posts_category")

    with op.batch_alter_table("post_likes") as batch_op:
        batch_op.drop_index("ix_post_likes_post_id")

    with op.batch_alter_table("challenge_participants") as batch_op:
        batch_op.drop_index("ix_challenge_participants_challenge_id")
        batch_op.drop_index("ix_challenge_participants_user_id")
        batch_op.drop_column("completed_at")
        batch_op.drop_column("is_completed")
