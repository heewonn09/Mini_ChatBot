from fastapi import APIRouter, Depends, HTTPException
from backend.auth import require_same_user
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.behavior import User
from backend.schemas.behavior import PatternAnalysisRequest, PatternAnalysisResult
from backend.services.pattern_analysis_service import PatternAnalysisService
from backend.services.ai_feedback_service import AIFeedbackService

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

ai_service = AIFeedbackService()


@router.post("/{user_id}", response_model=PatternAnalysisResult)
def analyze_user_patterns(
    user_id: int,
    request: PatternAnalysisRequest,
    _: User = Depends(require_same_user),
    db: Session = Depends(get_db),
):
    """
    Analyze behavior patterns for a user
    - Extracts emotion patterns, trends, and risky behaviors
    - Generates AI feedback using Gemini
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Run pattern analysis
    analysis = PatternAnalysisService.analyze_behaviors(
        user_id=user_id,
        days=request.days,
        db=db,
    )
    
    # Generate AI feedback
    analysis.ai_feedback = ai_service.generate_feedback(analysis)
    
    return analysis
