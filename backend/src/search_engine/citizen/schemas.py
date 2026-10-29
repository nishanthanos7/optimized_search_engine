"""Pydantic request/response models for the citizen API."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


class CitizenAnswerRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's service question",
    )
    service: str | None = Field(
        None,
        description="Optional service slug to scope the answer",
    )
    language: Literal["ne", "en"] = Field(
        "ne", description="Answer language: Nepali (default) or English"
    )


class CitizenFeedbackRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    service: str | None = None
    helpful: bool
    note: str | None = Field(default=None, max_length=1000)


class CitizenFeedbackResponse(BaseModel):
    ok: bool = True
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
