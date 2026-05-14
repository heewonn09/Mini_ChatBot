from types import SimpleNamespace

from backend.services.pattern_analysis_service import PatternAnalysisService


def _log(emotion: str, intensity: int, tag: str | None = None):
    return SimpleNamespace(emotion=emotion, intensity=intensity, tag=tag)


def test_extract_behavior_patterns_sorts_by_count_and_computes_average():
    logs = [
        _log("happy", 8),
        _log("sad", 3),
        _log("happy", 6),
        _log("focused", 7),
    ]

    result = PatternAnalysisService._extract_behavior_patterns(logs)

    assert result[0].emotion == "happy"
    assert result[0].count == 2
    assert result[0].percentage == 50.0
    assert result[0].intensity_avg == 7.0


def test_extract_risky_patterns_detects_high_negative_ratio_and_concerning_tag():
    logs = [
        _log("sad", 8),
        _log("sad", 7),
        _log("sad", 8),
        _log("happy", 5),
        _log("happy", 6),
        _log("focused", 7, tag="self_harm signal"),
    ]

    risky = PatternAnalysisService._extract_risky_patterns(logs)
    risky_patterns = {item.pattern for item in risky}

    assert "high_sad_frequency" in risky_patterns
    assert "self_harm" in risky_patterns


def test_extract_risky_patterns_respects_configurable_thresholds(monkeypatch):
    logs = [
        _log("sad", 8),
        _log("sad", 7),
        _log("happy", 6),
        _log("focused", 7),
    ]

    class StrictSettings:
        risk_negative_emotion_ratio_threshold = 90.0
        risk_negative_emotion_intensity_threshold = 9.0
        risk_mood_swing_threshold = 10.0
        risk_high_severity_ratio_threshold = 95.0

    from backend.services import pattern_analysis_service as module
    monkeypatch.setattr(module, 'get_settings', lambda: StrictSettings())

    risky = PatternAnalysisService._extract_risky_patterns(logs)
    risky_patterns = {item.pattern for item in risky}

    assert "high_sad_frequency" not in risky_patterns
