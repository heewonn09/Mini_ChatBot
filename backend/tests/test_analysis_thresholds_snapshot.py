from backend.routers import ui


def test_analysis_thresholds_snapshot_uses_settings(monkeypatch):
    class FakeSettings:
        risk_negative_emotion_ratio_threshold = 41.0
        risk_negative_emotion_intensity_threshold = 6.5
        risk_mood_swing_threshold = 5.5
        risk_high_severity_ratio_threshold = 61.0

    monkeypatch.setattr(ui, 'get_settings', lambda: FakeSettings())

    snap = ui._analysis_thresholds_snapshot()

    assert snap.negative_emotion_ratio_threshold == 41.0
    assert snap.negative_emotion_intensity_threshold == 6.5
    assert snap.mood_swing_threshold == 5.5
    assert snap.high_severity_ratio_threshold == 61.0
