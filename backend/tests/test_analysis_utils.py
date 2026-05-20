"""Tests for analysis_utils — pure functions."""
import pytest
from datetime import datetime, timezone

from backend.utils.analysis_utils import (
    is_negative,
    is_positive,
    ratio,
    dominant_emotion_label,
    format_display_name,
    group_logs_by_hour,
    hour_range,
)
from backend.models.behavior import BehaviorLog


def _log(emotion: str, hour: int = 10) -> BehaviorLog:
    log = BehaviorLog()
    log.emotion = emotion
    log.created_at = datetime(2026, 1, 1, hour, 0, 0)
    return log


# ── is_negative / is_positive ─────────────────────────────────────────────────

def test_is_negative_sad():
    assert is_negative(_log("sad")) == 1


def test_is_negative_happy():
    assert is_negative(_log("happy")) == 0


def test_is_positive_focused():
    assert is_positive(_log("focused")) == 1


def test_is_positive_stressed():
    assert is_positive(_log("stressed")) == 0


# ── ratio ─────────────────────────────────────────────────────────────────────

def test_ratio_all_positive():
    logs = [_log("happy"), _log("focused")]
    assert ratio(logs, is_positive) == 1.0


def test_ratio_empty():
    assert ratio([], is_positive) == 0.0


def test_ratio_mixed():
    logs = [_log("happy"), _log("sad")]
    assert ratio(logs, is_positive) == 0.5


# ── dominant_emotion_label ────────────────────────────────────────────────────
# Returns category string: "focused" | "stressed" | "neutral" | "" (empty for no logs)

def test_dominant_empty():
    assert dominant_emotion_label([]) == ""


def test_dominant_positive_returns_focused():
    # happy is in POSITIVE_EMOTIONS → maps to "focused" category
    assert dominant_emotion_label([_log("happy")]) == "focused"


def test_dominant_negative_returns_stressed():
    # sad is in NEGATIVE_EMOTIONS → maps to "stressed" category
    logs = [_log("sad"), _log("sad"), _log("happy")]
    assert dominant_emotion_label(logs) == "stressed"


# ── format_display_name ───────────────────────────────────────────────────────

def test_format_display_name_basic():
    assert format_display_name("john_doe") == "John Doe"


def test_format_display_name_single():
    assert format_display_name("alice") == "Alice"


# ── group_logs_by_hour ────────────────────────────────────────────────────────

def test_group_logs_by_hour_empty_fallback():
    result = group_logs_by_hour([])
    assert 0 in result and result[0] == []


def test_group_logs_by_hour_buckets():
    logs = [_log("happy", 9), _log("focused", 9), _log("sad", 21)]
    result = group_logs_by_hour(logs)
    # Keys are the actual hour integers from created_at
    assert len(result[9]) == 2
    assert len(result[21]) == 1


# ── hour_range ────────────────────────────────────────────────────────────────

def test_hour_range_morning():
    assert "오전" in hour_range(0)


def test_hour_range_evening():
    # hour_range takes actual hour number; 18 → '오후 6시 - 오후 9시'
    assert "오후" in hour_range(18)
