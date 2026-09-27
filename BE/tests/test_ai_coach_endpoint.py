from datetime import date, datetime, timedelta, timezone
import logging
from uuid import uuid4

from fastapi.testclient import TestClient
from fastapi import HTTPException
from google.genai import errors

from BE.app.api.routes import ai_coach as ai_coach_route
from BE.app.services import ai_coach as ai_coach_service
from BE.app.db import SessionLocal
from BE.app.main import app
from BE.app.models import (
    DietGoal,
    DietLog,
    DietLogItem,
    Exercise,
    Routine,
    RoutineExercise,
    User,
    UserProfile,
    Workout,
    WorkoutExercise,
    WorkoutSet,
)

client = TestClient(app)


def _signup() -> tuple[int, dict[str, str]]:
    email = f"coach-{uuid4().hex}@example.com"
    response = client.post(
        "/api/v1/auth/signup",
        json={"full_name": "Coach Test User", "email": email, "password": "secret123"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["user"]["access_token"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        return user.id, {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def test_coach_chat_requires_authentication():
    response = client.post(
        "/api/v1/ai/coach/chat",
        json={"page": "active_workout", "context": "", "text": "hello"},
    )
    assert response.status_code == 401


def test_coach_prompt_uses_context_and_configured_model(monkeypatch):
    captured = {}

    class FakeModels:
        def generate_content(self, **kwargs):
            captured.update(kwargs)
            return type("FakeResponse", (), {"text": "A friendly coach reply."})()

    class FakeClient:
        models = FakeModels()

        def __init__(self, *, api_key):
            assert api_key == ai_coach_service.GEMINI_API_KEY

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    monkeypatch.setattr(ai_coach_service.genai, "Client", FakeClient)
    result = ai_coach_service.generate_coach_reply(
        page="active_workout",
        text="",
        conversation_context="Previous note: shoulder discomfort",
        user_context={"latest_profile": {"limitations": "Shoulder pain"}},
    )

    assert result == "A friendly coach reply."
    assert captured["model"] == ai_coach_service.GEMINI_MODEL
    assert captured["config"].thinking_config.thinking_level.value == "LOW"
    assert '"active_workout"' in captured["contents"]
    assert '"Shoulder pain"' in captured["contents"]
    assert "EMPTY MESSAGE BEHAVIOR" in captured["contents"]


def test_ai_payload_is_logged_only_in_nonproduction_debug(monkeypatch, caplog):
    class FakeModels:
        def generate_content(self, **kwargs):
            return type("FakeResponse", (), {"text": "Reply"})()

    class FakeClient:
        models = FakeModels()

        def __init__(self, *, api_key):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    monkeypatch.setattr(ai_coach_service.genai, "Client", FakeClient)
    monkeypatch.setattr(ai_coach_service, "APP_ENV", "development")
    monkeypatch.setattr(ai_coach_service.logger, "propagate", True)
    with caplog.at_level(logging.DEBUG, logger="liftlog"):
        ai_coach_service.generate_coach_reply(
            page="active_workout",
            text="hello debug",
            conversation_context=None,
            user_context={"user_name": "Test User"},
        )
    assert "AI coach Gemini request payload=" in caplog.text
    assert "hello debug" in caplog.text
    assert "Test User" in caplog.text
    assert ai_coach_service.GEMINI_API_KEY not in caplog.text

    caplog.clear()
    monkeypatch.setattr(ai_coach_service, "APP_ENV", "production")
    with caplog.at_level(logging.DEBUG, logger="liftlog"):
        ai_coach_service.generate_coach_reply(
            page="active_workout",
            text="must not appear",
            conversation_context=None,
            user_context={"user_name": "Test User"},
        )
    assert "AI coach Gemini request payload=" not in caplog.text
    assert "must not appear" not in caplog.text


def test_provider_error_logs_status_and_message_without_key(monkeypatch, caplog):
    class FakeModels:
        def generate_content(self, **kwargs):
            raise errors.ServerError(
                code=500,
                response_json={
                    "error": {
                        "code": 500,
                        "message": "temporary provider failure",
                        "status": "INTERNAL",
                    }
                },
            )

    class FakeClient:
        models = FakeModels()

        def __init__(self, *, api_key):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    monkeypatch.setattr(ai_coach_service.genai, "Client", FakeClient)
    monkeypatch.setattr(ai_coach_service.logger, "propagate", True)
    with caplog.at_level(logging.ERROR, logger="liftlog"):
        try:
            ai_coach_service.generate_coach_reply(
                page="active_workout",
                text="hello",
                conversation_context=None,
                user_context={},
            )
        except HTTPException as exc:
            assert exc.status_code == 502
        else:
            raise AssertionError("Provider error should become an HTTP 502")

    assert "status=INTERNAL code=500" in caplog.text
    assert "temporary provider failure" in caplog.text
    assert ai_coach_service.GEMINI_API_KEY not in caplog.text


def test_coach_chat_builds_personalized_context_and_returns_human_text(monkeypatch):
    user_id, headers = _signup()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db = SessionLocal()
    try:
        exercise = Exercise(name="Overhead Press")
        db.add(exercise)
        db.flush()

        routine = Routine(user_id=user_id, name="Upper Body")
        db.add(routine)
        db.flush()
        db.add(RoutineExercise(
            user_id=user_id,
            routine_id=routine.id,
            exercise_id=exercise.id,
            order_index=0,
            target_sets=3,
        ))

        workout = Workout(
            user_id=user_id,
            routine_id=routine.id,
            workout_name="Upper Body",
            started_at=now - timedelta(days=1),
            finished_at=now - timedelta(days=1) + timedelta(minutes=45),
            duration_seconds=2700,
        )
        db.add(workout)
        db.flush()
        workout_exercise = WorkoutExercise(
            user_id=user_id,
            workout_id=workout.id,
            exercise_id=exercise.id,
            order_index=0,
        )
        db.add(workout_exercise)
        db.flush()
        db.add(WorkoutSet(
            user_id=user_id,
            workout_exercise_id=workout_exercise.id,
            set_number=1,
            weight=20,
            reps=8,
        ))
        db.add(UserProfile(
            user_id=user_id,
            version=1,
            limitations="Shoulder pain; avoid painful overhead movements",
            weight="70 kg",
            created_at=now,
        ))

        diet_log = DietLog(user_id=user_id, date=date.today().isoformat(), calories=500)
        db.add(diet_log)
        db.flush()
        db.add(DietLogItem(
            log_id=diet_log.id,
            user_id=user_id,
            meal_type="lunch",
            food_name="Lentil bowl",
            quantity_g=250,
            calories=500,
        ))
        db.add(DietGoal(
            user_id=user_id,
            calorie_target=2000,
            protein_target_g=120,
            carbs_target_g=220,
            fat_target_g=65,
        ))
        db.commit()
    finally:
        db.close()

    captured = {}

    def fake_generate_coach_reply(*, page, text, conversation_context, user_context):
        captured.update({
            "page": page,
            "text": text,
            "conversation_context": conversation_context,
            "user_context": user_context,
        })
        return "Let's skip painful overhead work today and choose a comfortable alternative."

    monkeypatch.setattr(ai_coach_route, "generate_coach_reply", fake_generate_coach_reply)
    response = client.post(
        "/api/v1/ai/coach/chat",
        headers=headers,
        json={"page": "active_workout", "context": "Earlier I mentioned shoulder pain.", "text": ""},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "text": "Let's skip painful overhead work today and choose a comfortable alternative."
    }
    assert captured["page"] == "active_workout"
    assert captured["text"] == ""
    assert captured["conversation_context"] == "Earlier I mentioned shoulder pain."
    assert captured["user_context"]["user_name"] == "Coach Test User"
    assert captured["user_context"]["routines"][0]["exercises"][0]["name"] == "Overhead Press"
    assert captured["user_context"]["recent_workouts"][0]["exercises"][0]["sets"][0]["weight"] == 20
    assert captured["user_context"]["latest_profile"]["limitations"].startswith("Shoulder pain")
    assert captured["user_context"]["diet_logs_last_30_days"][0]["items"][0]["food_name"] == "Lentil bowl"
    assert captured["user_context"]["diet_goals"]["protein_target_g"] == 120
