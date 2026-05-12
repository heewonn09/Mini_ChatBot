from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.models.behavior import BehaviorLog
from backend.schemas.behavior import (
    BehaviorPattern,
    EmotionalTrend,
    RiskyPattern,
    PatternAnalysisResult,
)
from typing import List
from statistics import fmean


class PatternAnalysisService:
    """Service for analyzing behavior patterns"""
    
    @staticmethod
    def analyze_behaviors(
        user_id: int,
        days: int,
        db: Session,
    ) -> PatternAnalysisResult:
        """
        Analyze user behavior logs for the last N days
        """
        # Get the date range
        end_date = datetime.now(timezone.utc).replace(tzinfo=None)
        start_date = end_date - timedelta(days=days)

        # Fetch behavior logs ordered chronologically so trend analysis is meaningful
        logs = db.query(BehaviorLog).filter(
            (BehaviorLog.user_id == user_id) &
            (BehaviorLog.created_at >= start_date) &
            (BehaviorLog.created_at <= end_date)
        ).order_by(BehaviorLog.created_at.asc()).all()
        
        if not logs:
            return PatternAnalysisResult(
                user_id=user_id,
                analysis_period_days=days,
                total_logs=0,
                behavior_patterns=[],
                emotional_trends=[],
                risky_patterns=[],
                ai_feedback="No behavior logs found for the specified period.",
                generated_at=end_date,
            )
        
        # Extract patterns
        behavior_patterns = PatternAnalysisService._extract_behavior_patterns(logs)
        emotional_trends = PatternAnalysisService._extract_emotional_trends(logs)
        risky_patterns = PatternAnalysisService._extract_risky_patterns(logs)
        
        result = PatternAnalysisResult(
            user_id=user_id,
            analysis_period_days=days,
            total_logs=len(logs),
            behavior_patterns=behavior_patterns,
            emotional_trends=emotional_trends,
            risky_patterns=risky_patterns,
            ai_feedback="",  # Will be filled by the API layer
            generated_at=end_date,
        )
        
        return result
    
    @staticmethod
    def _extract_behavior_patterns(logs: List[BehaviorLog]) -> List[BehaviorPattern]:
        """Extract emotion patterns from logs"""
        patterns = {}
        
        for log in logs:
            if log.emotion not in patterns:
                patterns[log.emotion] = {
                    "count": 0,
                    "intensities": []
                }
            patterns[log.emotion]["count"] += 1
            patterns[log.emotion]["intensities"].append(log.intensity)
        
        total_logs = len(logs)
        result = []
        
        for emotion, data in patterns.items():
            result.append(
                BehaviorPattern(
                    emotion=emotion,
                    count=data["count"],
                    percentage=round((data["count"] / total_logs) * 100, 2),
                    intensity_avg=round(fmean(data["intensities"]), 2),
                )
            )
        
        # Sort by count descending
        return sorted(result, key=lambda x: x.count, reverse=True)
    
    @staticmethod
    def _extract_emotional_trends(logs: List[BehaviorLog]) -> List[EmotionalTrend]:
        """Extract trends for each emotion"""
        if len(logs) < 2:
            return []
        
        # Group logs by emotion and calculate trends
        emotion_timeseries = {}
        
        for log in logs:
            if log.emotion not in emotion_timeseries:
                emotion_timeseries[log.emotion] = []
            emotion_timeseries[log.emotion].append(log.intensity)
        
        trends = []
        
        for emotion, intensities in emotion_timeseries.items():
            if len(intensities) < 2:
                trend_str = "insufficient_data"
            else:
                # Calculate trend: compare first half with second half
                mid = len(intensities) // 2
                first_half_avg = fmean(intensities[:mid])
                second_half_avg = fmean(intensities[mid:])
                
                if second_half_avg > first_half_avg + 1:
                    trend_str = "increasing"
                elif second_half_avg < first_half_avg - 1:
                    trend_str = "decreasing"
                else:
                    trend_str = "stable"
            
            trends.append(
                EmotionalTrend(
                    emotion=emotion,
                    trend=trend_str,
                    recent_intensity=round(intensities[-1], 2),
                )
            )
        
        return trends
    
    @staticmethod
    def _extract_risky_patterns(logs: List[BehaviorLog]) -> List[RiskyPattern]:
        """Identify risky patterns in behavior"""
        risky = []
        
        # Pattern 1: Consistently high negative emotions
        emotion_counts = {}
        emotion_avg_intensity = {}
        
        for log in logs:
            if log.emotion not in emotion_counts:
                emotion_counts[log.emotion] = 0
                emotion_avg_intensity[log.emotion] = []
            emotion_counts[log.emotion] += 1
            emotion_avg_intensity[log.emotion].append(log.intensity)
        
        negative_emotions = ["sad", "angry", "anxious", "depressed"]
        for emotion in negative_emotions:
            if emotion in emotion_counts:
                count = emotion_counts[emotion]
                avg_intensity = fmean(emotion_avg_intensity[emotion])
                percentage = (count / len(logs)) * 100
                
                if percentage > 40 and avg_intensity > 6:
                    risky.append(
                        RiskyPattern(
                            pattern=f"high_{emotion}_frequency",
                            description=f"User reported '{emotion}' in {percentage:.1f}% of logs with average intensity {avg_intensity:.1f}/10",
                            severity="high" if percentage > 60 else "medium",
                            count=count,
                        )
                    )
        
        # Pattern 2: Rapid emotional fluctuations (unstable mood)
        if len(logs) > 5:
            # Check for large swings between consecutive logs
            max_diff = 0
            for i in range(len(logs) - 1):
                diff = abs(logs[i].intensity - logs[i + 1].intensity)
                if diff > max_diff:
                    max_diff = diff
            
            if max_diff > 5:
                risky.append(
                    RiskyPattern(
                        pattern="mood_instability",
                        description=f"Detected rapid emotional fluctuations with intensity swings up to {max_diff:.1f}/10",
                        severity="medium",
                        count=len(logs),
                    )
                )
        
        # Pattern 3: Alert for specific concerning behaviors
        concerning_tags = ["self_harm", "substance_abuse", "suicidal_thoughts"]
        for tag in concerning_tags:
            tag_logs = [log for log in logs if log.tag and tag.lower() in log.tag.lower()]
            if tag_logs:
                risky.append(
                    RiskyPattern(
                        pattern=tag,
                        description=f"Detected {len(tag_logs)} entries mentioning concerning behavior",
                        severity="high",
                        count=len(tag_logs),
                    )
                )
        
        return risky
