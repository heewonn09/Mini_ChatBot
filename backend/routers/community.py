from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models.behavior import User
from backend.models.community import (
    Challenge, ChallengeParticipant, Comment, Post, PostLike,
)
from backend.schemas.community import (
    ChallengeCreate, ChallengeOut, CheckInResponse,
    CommentCreate, CommentOut,
    PostCreate, PostOut, PostUpdate,
)

router = APIRouter(prefix="/api/community", tags=["community"])

SEED_CHALLENGES = [
    {
        "title": "7일 감사 챌린지",
        "description": "매일 감사한 일 3가지를 행동 기록에 남겨보세요. 7일 연속으로 기록하면 완료!",
        "category": "mindfulness",
        "duration_days": 7,
        "is_official": True,
    },
    {
        "title": "30일 운동 챌린지",
        "description": "하루 30분 이상 운동을 30일 동안 이어가세요. 기록을 통해 진행 상황을 추적합니다.",
        "category": "fitness",
        "duration_days": 30,
        "is_official": True,
    },
    {
        "title": "디지털 디톡스 1주일",
        "description": "소셜미디어 시간을 하루 30분 이내로 줄이고, 대신 독서나 산책 기록을 남겨보세요.",
        "category": "habit",
        "duration_days": 7,
        "is_official": True,
    },
    {
        "title": "집중력 향상 14일",
        "description": "매일 25분 집중(포모도로) 세션을 4회 이상 완료하고 기록하세요.",
        "category": "focus",
        "duration_days": 14,
        "is_official": True,
    },
    {
        "title": "아침 루틴 21일",
        "description": "기상 후 1시간 이내에 행동 기록을 남기는 습관을 21일 동안 유지하세요.",
        "category": "habit",
        "duration_days": 21,
        "is_official": True,
    },
]


def _seed_official_challenges(db: Session) -> None:
    if db.query(Challenge).filter(Challenge.is_official == True).count() > 0:
        return
    for c in SEED_CHALLENGES:
        db.add(Challenge(**c))
    db.commit()


def _post_to_out(post: Post, current_user_id: int) -> PostOut:
    liked = any(like.user_id == current_user_id for like in post.likes)
    return PostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        category=post.category,
        is_public=post.is_public,
        image_url=post.image_url,
        like_count=post.like_count,
        comment_count=post.comment_count,
        created_at=post.created_at,
        author=post.author,
        liked_by_me=liked,
    )


def _challenge_to_out(ch: Challenge, current_user_id: int) -> ChallengeOut:
    participant = next(
        (p for p in ch.participants if p.user_id == current_user_id), None
    )
    return ChallengeOut(
        id=ch.id,
        title=ch.title,
        description=ch.description,
        category=ch.category,
        duration_days=ch.duration_days,
        is_official=ch.is_official,
        participant_count=ch.participant_count,
        created_at=ch.created_at,
        joined=participant is not None,
        my_streak=participant.current_streak if participant else 0,
        my_completed_days=participant.completed_days if participant else 0,
    )


# ── Posts ─────────────────────────────────────────────────────────────────────

@router.get("/posts", response_model=list[PostOut])
def list_posts(
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Post).filter(Post.is_public == True)
    if category:
        q = q.filter(Post.category == category)
    posts = q.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return [_post_to_out(p, current_user.id) for p in posts]


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = Post(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        category=payload.category,
        is_public=payload.is_public,
        image_url=payload.image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_to_out(post, current_user.id)


@router.get("/posts/{post_id}", response_model=PostOut)
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _post_to_out(post, current_user.id)


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    payload: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or forbidden")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(post, field, val)
    db.commit()
    db.refresh(post)
    return _post_to_out(post, current_user.id)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or forbidden")
    db.delete(post)
    db.commit()


@router.post("/posts/{post_id}/like", status_code=200)
def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(PostLike).filter(
        PostLike.post_id == post_id, PostLike.user_id == current_user.id
    ).first()
    if existing:
        db.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        post.like_count += 1
        liked = True
    db.commit()
    return {"liked": liked, "like_count": post.like_count}


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
def list_comments(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return comments


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    post_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = Comment(post_id=post_id, user_id=current_user.id, content=payload.content)
    db.add(comment)
    post.comment_count += 1
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/posts/{post_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    post_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.post_id == post_id,
        Comment.user_id == current_user.id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or forbidden")
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.comment_count = max(0, post.comment_count - 1)
    db.delete(comment)
    db.commit()


# ── Challenges ────────────────────────────────────────────────────────────────

@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _seed_official_challenges(db)
    q = db.query(Challenge)
    if category:
        q = q.filter(Challenge.category == category)
    challenges = q.order_by(Challenge.is_official.desc(), Challenge.participant_count.desc()).all()
    return [_challenge_to_out(c, current_user.id) for c in challenges]


@router.post("/challenges", response_model=ChallengeOut, status_code=201)
def create_challenge(
    payload: ChallengeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = Challenge(
        creator_id=current_user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        duration_days=payload.duration_days,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return _challenge_to_out(challenge, current_user.id)


@router.post("/challenges/{challenge_id}/join", response_model=ChallengeOut)
def join_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    existing = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
    db.add(ChallengeParticipant(challenge_id=challenge_id, user_id=current_user.id))
    challenge.participant_count += 1
    db.commit()
    db.refresh(challenge)
    return _challenge_to_out(challenge, current_user.id)


@router.delete("/challenges/{challenge_id}/join", status_code=204)
def leave_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not joined")
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if challenge:
        challenge.participant_count = max(0, challenge.participant_count - 1)
    db.delete(p)
    db.commit()


@router.post("/challenges/{challenge_id}/checkin", response_model=CheckInResponse)
def checkin_challenge(
    challenge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.challenge_id == challenge_id,
        ChallengeParticipant.user_id == current_user.id,
    ).first()
    if not p:
        raise HTTPException(status_code=400, detail="Join the challenge first")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today = now.date()

    if p.last_checked_in and p.last_checked_in.date() == today:
        raise HTTPException(status_code=400, detail="Already checked in today")

    yesterday = (now.date().toordinal() - 1)
    if p.last_checked_in and p.last_checked_in.date().toordinal() == yesterday:
        p.current_streak += 1
    else:
        p.current_streak = 1

    p.completed_days += 1
    p.last_checked_in = now
    db.commit()

    return CheckInResponse(
        message=f"체크인 완료! 🎉 {p.current_streak}일 연속 달성!",
        current_streak=p.current_streak,
        completed_days=p.completed_days,
    )
