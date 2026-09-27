from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from BE.app.api.deps import get_current_user
from BE.app.db import get_db
from BE.app.models import User
from BE.app.services.ai_coach import collect_user_context, generate_coach_reply

router = APIRouter(prefix="/ai/coach", tags=["ai-coach"])


class CoachChatRequest(BaseModel):
    page: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    context: str | None = Field(default=None, max_length=12_000)
    text: str = Field(default="", max_length=4_000)


class CoachChatResponse(BaseModel):
    text: str


@router.post("/chat", response_model=CoachChatResponse)
def coach_chat(
    payload: CoachChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachChatResponse:
    user_context = collect_user_context(db, current_user)
    reply = generate_coach_reply(
        page=payload.page,
        text=payload.text.strip(),
        conversation_context=payload.context,
        user_context=user_context,
    )
    return CoachChatResponse(text=reply)
