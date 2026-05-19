"""community_notifications_tags

Revision ID: a3f2b1c9d845
Revises: 16d4e00e46ef
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a3f2b1c9d845"
down_revision: Union[str, Sequence[str], None] = "16d4e00e46ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=True),
        sa.Column("comment_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("posts", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_posts_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_posts_user_id"), ["user_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_posts_created_at"), ["created_at"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_comments_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_comments_post_id"), ["post_id"], unique=False)

    op.create_table(
        "post_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),
    )
    with op.batch_alter_table("post_likes", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_post_likes_post_id"), ["post_id"], unique=False)

    op.create_table(
        "challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("creator_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=30), nullable=True),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column("is_official", sa.Boolean(), nullable=True),
        sa.Column("participant_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["creator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_challenges_id"), ["id"], unique=False)
        batch_op.create_index(batch_op.f("ix_challenges_created_at"), ["created_at"], unique=False)

    op.create_table(
        "challenge_participants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("challenge_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("current_streak", sa.Integer(), nullable=True),
        sa.Column("completed_days", sa.Integer(), nullable=True),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
        sa.Column("last_checked_in", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("challenge_id", "user_id", name="uq_challenge_user"),
    )

    op.create_table(
        "user_follows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("follower_id", sa.Integer(), nullable=False),
        sa.Column("following_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["following_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )
    with op.batch_alter_table("user_follows", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_user_follows_follower_id"), ["follower_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_user_follows_following_id"), ["following_id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_notifications_user_id"), ["user_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_notifications_created_at"), ["created_at"], unique=False)

    op.create_table(
        "behavior_tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("usage_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("behavior_tags")
    with op.batch_alter_table("notifications", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_notifications_created_at"))
        batch_op.drop_index(batch_op.f("ix_notifications_user_id"))
    op.drop_table("notifications")
    with op.batch_alter_table("user_follows", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_user_follows_following_id"))
        batch_op.drop_index(batch_op.f("ix_user_follows_follower_id"))
    op.drop_table("user_follows")
    op.drop_table("challenge_participants")
    with op.batch_alter_table("challenges", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_challenges_created_at"))
        batch_op.drop_index(batch_op.f("ix_challenges_id"))
    op.drop_table("challenges")
    with op.batch_alter_table("post_likes", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_post_likes_post_id"))
    op.drop_table("post_likes")
    with op.batch_alter_table("comments", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_comments_post_id"))
        batch_op.drop_index(batch_op.f("ix_comments_id"))
    op.drop_table("comments")
    with op.batch_alter_table("posts", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_posts_created_at"))
        batch_op.drop_index(batch_op.f("ix_posts_user_id"))
        batch_op.drop_index(batch_op.f("ix_posts_id"))
    op.drop_table("posts")
