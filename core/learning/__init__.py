"""Paganini AIOS — Learning module.

Exports:
    FeedbackCollector  — collects 👍/👎 from Telegram
    SkillScorer        — EMA-based skill quality tracker
    LearningReport     — generate summary reports
"""

from core.learning.feedback import (  # noqa: F401
    FeedbackCollector,
    FeedbackEntry,
    LearningReport,
    SkillScorer,
)

__all__ = [
    "FeedbackCollector",
    "FeedbackEntry",
    "LearningReport",
    "SkillScorer",
]
