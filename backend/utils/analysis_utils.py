from collections import Counter, defaultdict

from backend.models.behavior import BehaviorLog

NEGATIVE_EMOTIONS = {"sad", "angry", "anxious", "stressed", "depressed"}
POSITIVE_EMOTIONS = {"happy", "focused", "calm", "motivated", "neutral"}
_PRODUCTIVE = POSITIVE_EMOTIONS - {"neutral"}


def is_negative(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in NEGATIVE_EMOTIONS)


def is_positive(log: BehaviorLog) -> int:
    return int(log.emotion.lower() in POSITIVE_EMOTIONS)


def get_hour_bin(hour: int) -> int:
    for b in reversed([6, 9, 12, 15, 18, 21]):
        if hour >= b:
            return b
    return 0


def dominant_emotion_label(logs: list[BehaviorLog]) -> str:
    if not logs:
        return ""
    top = Counter(log.emotion.lower() for log in logs).most_common(1)[0][0]
    if top in NEGATIVE_EMOTIONS:
        return "stressed"
    if top in _PRODUCTIVE:
        return "focused"
    return "neutral"


def group_logs_by_hour(logs: list[BehaviorLog]) -> dict[int, list[BehaviorLog]]:
    groups: dict[int, list[BehaviorLog]] = defaultdict(list)
    for log in logs:
        groups[log.created_at.hour].append(log)
    return groups if groups else {0: []}


def ratio(logs: list[BehaviorLog], predicate) -> float:
    if not logs:
        return 0.0
    return sum(predicate(log) for log in logs) / len(logs)


def to_korean_hour(hour: int) -> str:
    normalized = hour % 24
    prefix = "오전" if normalized < 12 else "오후"
    h = normalized % 12 or 12
    return f"{prefix} {h}시"


def hour_range(hour: int) -> str:
    return f"{to_korean_hour(hour)} - {to_korean_hour(hour + 3)}"


def format_display_name(username: str) -> str:
    return username.replace("_", " ").title()
