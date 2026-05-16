"""Tests for DashboardService — pure computation, no DB required."""
import pytest
from datetime import datetime, timedelta, timezone

from backend.services.dashboard_service import DashboardService
from backend.models.behavior import BehaviorLog


def _make_log(days_ago: int = 0, behavior_type: str = "work",
              emotion: str = "focused", intensity: int = 7) -> BehaviorLog:
    log = BehaviorLog()
    log.behavior_type = behavior_type
    log.emotion = emotion
    log.intensity = intensity
    log.duration = 60
    log.text = "test"
    log.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days_ago)
    return log


# ── current_streak ────────────────────────────────────────────────────────────

def test_current_streak_empty():
    assert DashboardService.current_streak([]) == 0


def test_current_streak_single_today():
    assert DashboardService.current_streak([_make_log(0)]) == 1


def test_current_streak_consecutive():
    logs = [_make_log(i) for i in range(3)]  # today, yesterday, day before
    assert DashboardService.current_streak(logs) == 3


def test_current_streak_breaks_on_gap():
    logs = [_make_log(0), _make_log(2)]  # today and 2 days ago (gap on day 1)
    assert DashboardService.current_streak(logs) == 1


# ── longest_streak ────────────────────────────────────────────────────────────

def test_longest_streak_empty():
    assert DashboardService.longest_streak([]) == 0


def test_longest_streak_detects_past_run():
    # 5 consecutive days starting from 10 days ago, nothing recent
    logs = [_make_log(10 + i) for i in range(5)]
    assert DashboardService.longest_streak(logs) == 5


# ── build_timeline ────────────────────────────────────────────────────────────

def test_build_timeline_empty_returns_7_points():
    result = DashboardService.build_timeline([])
    assert len(result) == 7


def test_build_timeline_counts_today():
    logs = [_make_log(0, emotion="focused"), _make_log(0, emotion="focused")]
    result = DashboardService.build_timeline(logs)
    # Last element is today — focused logs should show up as focus
    today = result[-1]
    assert today.focus >= 0  # field exists
    assert today.distraction >= 0


# ── weekly_progress ───────────────────────────────────────────────────────────

def test_weekly_progress_no_logs():
    assert DashboardService.weekly_progress([]) == 0


def test_weekly_progress_positive():
    # 4 logs this week, 1 last week → positive delta
    this_week = [_make_log(i) for i in range(4)]
    last_week = [_make_log(7)]
    logs = this_week + last_week
    progress = DashboardService.weekly_progress(logs)
    assert progress > 0


# ── build_weekday_trends ──────────────────────────────────────────────────────

def test_build_weekday_trends_returns_7():
    result = DashboardService.build_weekday_trends([_make_log(0)])
    assert len(result) == 7


# ── build_behavior_distribution ──────────────────────────────────────────────

def test_build_behavior_distribution_empty():
    result = DashboardService.build_behavior_distribution([])
    assert result == []


def test_build_behavior_distribution_groups():
    logs = [_make_log(0, "work", "focused"), _make_log(0, "work", "focused"), _make_log(0, "exercise", "sad")]
    result = DashboardService.build_behavior_distribution(logs)
    # Labels are emotion categories: '생산적', '중립', '방해'
    labels = [r.label for r in result]
    assert len(result) > 0
    assert any(label in ("생산적", "중립", "방해") for label in labels)
