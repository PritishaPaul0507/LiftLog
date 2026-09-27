from __future__ import annotations

import json
import logging
from datetime import date, datetime, time, timedelta
from pathlib import Path
from string import Template
from typing import Any

from fastapi import HTTPException, status
from google import genai
from google.genai import errors
from google.genai import types
from sqlalchemy.orm import Session

from BE.app.core.config import APP_ENV, GEMINI_API_KEY, GEMINI_MODEL
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

logger = logging.getLogger("liftlog")
PROMPT_TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "prompts" / "prompt_template.txt"
PROFILE_FIELDS = (
    "dob", "height", "weight", "sex", "wake_time", "sleep_time", "work_schedule",
    "daily_activity", "commute", "available_training_time", "experience", "training_days",
    "preferred_time", "preferred_exercises", "disliked_exercises", "limitations",
    "typical_foods", "meals_per_day", "eating_out_frequency", "favorite_foods",
    "favorite_snacks", "dietary_preferences", "cooking_constraints", "primary_goal",
    "target_weight", "goal_description", "lifestyle_change_tolerance", "current_description",
    "target_description", "target_characteristics", "inspiration_description",
)


def _iso(value: date | datetime | time | None) -> str | None:
    return value.isoformat() if value is not None else None


def collect_user_context(db: Session, user: User, *, today: date | None = None) -> dict[str, Any]:
    """Collect a bounded snapshot of only the authenticated user's coach context."""
    today = today or date.today()
    cutoff = today - timedelta(days=30)

    routines = db.query(Routine).filter(Routine.user_id == user.id).order_by(Routine.name.asc()).all()
    routine_data = []
    for routine in routines:
        exercise_rows = (
            db.query(Exercise.name, RoutineExercise.target_sets, RoutineExercise.order_index)
            .join(RoutineExercise, RoutineExercise.exercise_id == Exercise.id)
            .filter(RoutineExercise.routine_id == routine.id, RoutineExercise.user_id == user.id)
            .order_by(RoutineExercise.order_index.asc())
            .all()
        )
        routine_data.append({
            "name": routine.name,
            "exercises": [
                {"name": row.name, "target_sets": row.target_sets}
                for row in exercise_rows
            ],
        })

    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user.id)
        .order_by(Workout.started_at.desc(), Workout.id.desc())
        .limit(30)
        .all()
    )
    workout_ids = [workout.id for workout in workouts]
    routine_ids = {workout.routine_id for workout in workouts if workout.routine_id is not None}
    routine_names_by_id = {
        routine.id: routine.name
        for routine in db.query(Routine)
        .filter(Routine.user_id == user.id, Routine.id.in_(routine_ids))
        .all()
    } if routine_ids else {}
    workout_exercises_by_workout: dict[int, list[dict[str, Any]]] = {workout_id: [] for workout_id in workout_ids}
    workout_exercises = []
    if workout_ids:
        workout_exercises = (
            db.query(WorkoutExercise, Exercise.name)
            .outerjoin(Exercise, Exercise.id == WorkoutExercise.exercise_id)
            .filter(WorkoutExercise.user_id == user.id, WorkoutExercise.workout_id.in_(workout_ids))
            .order_by(WorkoutExercise.workout_id, WorkoutExercise.order_index.asc())
            .all()
        )
    workout_exercise_ids = [entry.WorkoutExercise.id for entry in workout_exercises]
    sets_by_exercise: dict[int, list[dict[str, Any]]] = {exercise_id: [] for exercise_id in workout_exercise_ids}
    if workout_exercise_ids:
        sets = (
            db.query(WorkoutSet)
            .filter(
                WorkoutSet.user_id == user.id,
                WorkoutSet.workout_exercise_id.in_(workout_exercise_ids),
            )
            .order_by(WorkoutSet.workout_exercise_id, WorkoutSet.set_number.asc())
            .all()
        )
        for workout_set in sets:
            sets_by_exercise[workout_set.workout_exercise_id].append({
                "set_number": workout_set.set_number,
                "weight": workout_set.weight,
                "reps": workout_set.reps,
            })

    for entry in workout_exercises:
        workout_exercise = entry.WorkoutExercise
        workout_exercises_by_workout[workout_exercise.workout_id].append({
            "name": entry.name or "Unknown exercise",
            "sets": sets_by_exercise.get(workout_exercise.id, []),
        })

    workout_data = []
    for workout in workouts:
        workout_data.append({
            "workout_name": workout.workout_name or "Workout",
            "routine_name": routine_names_by_id.get(workout.routine_id),
            "started_at": _iso(workout.started_at),
            "finished_at": _iso(workout.finished_at),
            "duration_seconds": workout.duration_seconds,
            "exercises": workout_exercises_by_workout.get(workout.id, []),
        })

    latest_profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == user.id)
        .order_by(UserProfile.version.desc())
        .first()
    )
    profile_data = (
        {field: getattr(latest_profile, field) for field in PROFILE_FIELDS}
        if latest_profile
        else None
    )

    profile_history = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == user.id, UserProfile.created_at >= datetime.combine(cutoff, time.min))
        .order_by(UserProfile.created_at.asc(), UserProfile.version.asc())
        .all()
    )
    weight_records = []
    previous_weight = object()
    for version in profile_history:
        if version.weight and version.weight != previous_weight:
            weight_records.append({"date": _iso(version.created_at), "weight": version.weight})
            previous_weight = version.weight

    diet_logs = (
        db.query(DietLog)
        .filter(DietLog.user_id == user.id, DietLog.date >= cutoff.isoformat(), DietLog.date <= today.isoformat())
        .order_by(DietLog.date.desc(), DietLog.id.desc())
        .all()
    )
    diet_log_ids = [diet_log.id for diet_log in diet_logs]
    diet_items_by_log: dict[int, list[dict[str, Any]]] = {log_id: [] for log_id in diet_log_ids}
    if diet_log_ids:
        diet_items = (
            db.query(DietLogItem)
            .filter(DietLogItem.user_id == user.id, DietLogItem.log_id.in_(diet_log_ids))
            .order_by(DietLogItem.log_id, DietLogItem.id)
            .all()
        )
        for item in diet_items:
            diet_items_by_log[item.log_id].append({
                "meal_type": item.meal_type,
                "food_name": item.food_name,
                "quantity_g": item.quantity_g,
                "calories": item.calories,
                "protein_g": item.protein_g,
                "carbs_g": item.carbs_g,
                "fat_g": item.fat_g,
                "fiber_g": item.fiber_g,
            })
    diet_data = [
        {
            "date": log.date,
            "totals": {
                "calories": log.calories,
                "protein_g": log.protein_g,
                "carbs_g": log.carbs_g,
                "fat_g": log.fat_g,
                "fiber_g": log.fiber_g,
            },
            "items": diet_items_by_log.get(log.id, []),
        }
        for log in diet_logs
    ]

    goal = db.query(DietGoal).filter(DietGoal.user_id == user.id).first()
    goal_data = None if goal is None else {
        "calorie_target": goal.calorie_target,
        "protein_target_g": goal.protein_target_g,
        "carbs_target_g": goal.carbs_target_g,
        "fat_target_g": goal.fat_target_g,
    }

    return {
        "user_name": user.full_name,
        "routines": routine_data,
        "recent_workouts": workout_data,
        "latest_profile": profile_data,
        "diet_logs_last_30_days": diet_data,
        "weight_records_last_30_days": weight_records,
        "diet_goals": goal_data,
        "as_of_date": today.isoformat(),
    }


def build_prompt(*, page: str, text: str, conversation_context: str | None, user_context: dict[str, Any]) -> str:
    try:
        template_text = PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        logger.error("AI coach prompt template unavailable error_type=%s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI coach is not configured correctly",
        ) from exc

    template = Template(template_text)
    return template.substitute(
        page_json=json.dumps(page, ensure_ascii=True),
        message_json=json.dumps(text, ensure_ascii=True),
        conversation_json=json.dumps(conversation_context or "", ensure_ascii=True),
        user_context_json=json.dumps(user_context, ensure_ascii=True, separators=(",", ":")),
    )


def generate_coach_reply(*, page: str, text: str, conversation_context: str | None, user_context: dict[str, Any]) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI coach is not configured",
        )

    prompt = build_prompt(
        page=page,
        text=text,
        conversation_context=conversation_context,
        user_context=user_context,
    )
    if APP_ENV != "production" and logger.isEnabledFor(logging.DEBUG):
        request_payload = {
            "model": GEMINI_MODEL,
            "contents": prompt,
            "generation_config": {
                "temperature": 0.5,
                "max_output_tokens": 500,
                "thinking_config": {"thinking_level": "low"},
            },
        }
        logger.debug("AI coach Gemini request payload=%s", json.dumps(request_payload, ensure_ascii=True))

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        with client:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.5,
                    max_output_tokens=500,
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                ),
            )
    except errors.APIError as exc:
        provider_message = (exc.message or "No provider message").replace(GEMINI_API_KEY, "[REDACTED]")[:600]
        logger.error(
            "AI coach provider API failure model=%s status=%s code=%s message=%s",
            GEMINI_MODEL,
            exc.status,
            exc.code,
            provider_message,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI coach provider request failed",
        ) from exc
    except Exception as exc:
        logger.error("AI coach provider request failed error_type=%s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI coach is temporarily unavailable",
        ) from exc

    reply = (response.text or "").strip()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI coach returned an empty response",
        )
    return reply
