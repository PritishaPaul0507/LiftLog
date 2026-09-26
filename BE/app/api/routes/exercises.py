import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from BE.app.api.deps import get_current_user
from BE.app.db import get_db
from BE.app.models import Exercise, User, Workout, WorkoutExercise, WorkoutSet
from BE.app.schemas import ExerciseHistoryResponse, ExerciseRead, ExerciseTopSetsResponse, TopSetEntry

logger = logging.getLogger("liftlog")

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
def get_exercises(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get all exercises (both default and custom)
    exercises = db.query(Exercise).filter(
        (Exercise.user_id == None) | (Exercise.user_id == current_user.id)
    ).all()

    logger.debug("Loaded %d exercises", len(exercises))
    return exercises


@router.get("/{exercise_id}/top-sets", response_model=ExerciseTopSetsResponse)
def get_exercise_top_sets(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    rows = (
        db.query(
            WorkoutSet.weight,
            WorkoutSet.reps,
            func.sum((WorkoutSet.weight or 0) * (WorkoutSet.reps or 0)).label("volume"),
        )
        .join(WorkoutExercise, WorkoutExercise.id == WorkoutSet.workout_exercise_id)
        .join(Workout, Workout.id == WorkoutExercise.workout_id)
        .filter(
            Workout.user_id == current_user.id,
            WorkoutExercise.exercise_id == exercise_id,
            WorkoutSet.weight.is_not(None),
            WorkoutSet.reps.is_not(None),
        )
        .group_by(WorkoutSet.weight, WorkoutSet.reps)
        .order_by(func.sum((WorkoutSet.weight or 0) * (WorkoutSet.reps or 0)).desc(), WorkoutSet.weight.desc(), WorkoutSet.reps.desc())
        .limit(10)
        .all()
    )

    top_sets = []
    for idx, (weight, reps, volume) in enumerate(rows, start=1):
        top_sets.append(
            TopSetEntry(
                rank=idx,
                weight=weight,
                reps=reps,
                volume=float(volume) if volume is not None else None,
            )
        )

    return ExerciseTopSetsResponse(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        top_sets=top_sets,
    )


@router.get("/{exercise_id}/history", response_model=ExerciseHistoryResponse)
def get_exercise_history(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    workout_exercise = (
        db.query(WorkoutExercise)
        .join(Workout, Workout.id == WorkoutExercise.workout_id)
        .filter(Workout.user_id == current_user.id, WorkoutExercise.exercise_id == exercise_id)
        .order_by(Workout.finished_at.desc() if hasattr(Workout, "finished_at") else Workout.started_at.desc())
        .first()
    )

    if workout_exercise is None:
        return ExerciseHistoryResponse(exercise_id=exercise.id, exercise_name=exercise.name, last_workout=None)

    workout = db.query(Workout).filter(Workout.id == workout_exercise.workout_id, Workout.user_id == current_user.id).first()
    if workout is None:
        return ExerciseHistoryResponse(exercise_id=exercise.id, exercise_name=exercise.name, last_workout=None)

    sets = (
        db.query(WorkoutSet)
        .filter(WorkoutSet.workout_exercise_id == workout_exercise.id)
        .order_by(WorkoutSet.set_number.asc())
        .all()
    )

    return ExerciseHistoryResponse(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        last_workout={
            "workout_id": workout.id,
            "date": workout.finished_at.date().isoformat() if workout.finished_at else workout.started_at.date().isoformat(),
            "sets": [
                {
                    "set_number": s.set_number,
                    "weight": s.weight,
                    "reps": s.reps,
                }
                for s in sets
            ],
        },
    )
