import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from BE.app.api.deps import get_current_user
from BE.app.db import get_db
from BE.app.models import Exercise, Routine, RoutineExercise, User, Workout
from BE.app.schemas import RoutineCreate, RoutineListResponse, RoutineReadWithExercises, RoutineUpdate, RoutineExerciseRead

logger = logging.getLogger("liftlog")

router = APIRouter(prefix="/routines", tags=["routines"])


@router.get("", response_model=RoutineListResponse)
def get_routines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routines = db.query(Routine).filter(Routine.user_id == current_user.id).all()
    logger.debug("Loaded %d routines for user_id=%s", len(routines), current_user.id)

    return RoutineListResponse(routines=routines)


@router.post("", response_model=RoutineReadWithExercises)
def create_routine(payload: RoutineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Create routine
    routine = Routine(
        user_id=current_user.id,
        name=payload.name,
    )
    db.add(routine)
    db.flush()
    logger.info("Routine created routine_id=%s", routine.id)

    # Add exercises to routine
    exercise_details = []
    for idx, exercise_req in enumerate(payload.exercises, start=1):
        exercise = db.query(Exercise).filter(Exercise.id == exercise_req.exercise_id).first()
        if not exercise:
            logger.warning("ROUTINES POST /routines exercise not found: exercise_id=%s", exercise_req.exercise_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Exercise {exercise_req.exercise_id} not found")

        routine_exercise = RoutineExercise(
            user_id=current_user.id,
            routine_id=routine.id,
            exercise_id=exercise.id,
            target_sets=exercise_req.target_sets,
            order_index=idx,
        )
        db.add(routine_exercise)
        db.flush()

        exercise_details.append(RoutineExerciseRead(
            exercise_id=exercise.id,
            name=exercise.name,
            target_sets=exercise_req.target_sets,
            order_index=idx,
        ))
        logger.debug("Routine exercise added routine_id=%s exercise_id=%s", routine.id, exercise.id)

    db.commit()
    db.refresh(routine)

    response = RoutineReadWithExercises(
        routine_id=routine.id,
        name=routine.name,
        exercises=exercise_details,
    )
    return response


@router.get("/{routine_id}", response_model=RoutineReadWithExercises)
def get_routine(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routine = db.query(Routine).filter(
        Routine.id == routine_id,
        Routine.user_id == current_user.id
    ).first()

    if not routine:
        logger.info("Routine lookup returned no result routine_id=%s", routine_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    # Get exercises for this routine
    routine_exercises = db.query(RoutineExercise).filter(
        RoutineExercise.routine_id == routine_id
    ).order_by(RoutineExercise.order_index).all()

    exercise_details = []
    for re in routine_exercises:
        exercise = db.query(Exercise).filter(Exercise.id == re.exercise_id).first()
        if exercise:
            exercise_details.append(RoutineExerciseRead(
                exercise_id=exercise.id,
                name=exercise.name,
                target_sets=re.target_sets,
                order_index=re.order_index,
            ))

    logger.debug("Loaded %d exercises for routine_id=%s", len(exercise_details), routine_id)

    response = RoutineReadWithExercises(
        routine_id=routine.id,
        name=routine.name,
        exercises=exercise_details,
    )
    return response


@router.put("/{routine_id}", response_model=RoutineReadWithExercises)
def update_routine(routine_id: int, payload: RoutineUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routine = db.query(Routine).filter(
        Routine.id == routine_id,
        Routine.user_id == current_user.id
    ).first()

    if not routine:
        logger.info("Routine update returned no result routine_id=%s", routine_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    # Update routine name if provided
    if payload.name:
        routine.name = payload.name

    # Delete all existing routine_exercises for this routine
    db.query(RoutineExercise).filter(RoutineExercise.routine_id == routine_id).delete()

    # Add new exercises
    exercise_details = []
    for idx, exercise_req in enumerate(payload.exercises, start=1):
        exercise = db.query(Exercise).filter(Exercise.id == exercise_req.exercise_id).first()
        if not exercise:
            logger.warning("ROUTINES PUT /routines/{%d} exercise not found: exercise_id=%s", routine_id, exercise_req.exercise_id)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Exercise {exercise_req.exercise_id} not found")

        routine_exercise = RoutineExercise(
            user_id=current_user.id,
            routine_id=routine_id,
            exercise_id=exercise.id,
            target_sets=exercise_req.target_sets,
            order_index=idx,
        )
        db.add(routine_exercise)
        db.flush()

        exercise_details.append(RoutineExerciseRead(
            exercise_id=exercise.id,
            name=exercise.name,
            target_sets=exercise_req.target_sets,
            order_index=idx,
        ))
        logger.debug("Routine exercise updated routine_id=%s exercise_id=%s", routine_id, exercise.id)

    db.commit()
    db.refresh(routine)

    response = RoutineReadWithExercises(
        routine_id=routine.id,
        name=routine.name,
        exercises=exercise_details,
    )
    logger.info("Routine updated routine_id=%s", routine_id)
    return response


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_routine(routine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    routine = db.query(Routine).filter(
        Routine.id == routine_id,
        Routine.user_id == current_user.id
    ).first()

    if not routine:
        logger.info("Routine deletion returned no result routine_id=%s", routine_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Routine not found")

    # Set workouts.routine_id = NULL for all workouts belonging to this routine
    workouts = db.query(Workout).filter(Workout.routine_id == routine_id).all()
    for workout in workouts:
        workout.routine_id = None
        logger.debug("Detached workout_id=%s from deleted routine_id=%s", workout.id, routine_id)

    # Delete routine_exercises for this routine
    db.query(RoutineExercise).filter(RoutineExercise.routine_id == routine_id).delete()

    # Delete routine
    db.delete(routine)
    db.commit()

    logger.info("Routine deleted routine_id=%s", routine_id)
    return None
