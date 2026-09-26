import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from BE.app.api.routes.auth import router as auth_router
from BE.app.api.routes.diet import router as diet_router
from BE.app.api.routes.exercises import router as exercises_router
from BE.app.api.routes.gyms import router as gyms_router
from BE.app.api.routes.profile import router as profile_router
from BE.app.api.routes.routines import router as routines_router
from BE.app.api.routes.workouts import router as workouts_router
from BE.app.core.config import API_PREFIX, APP_ENV, APP_NAME, CORS_ORIGINS, SEED_DEMO_DATA
from BE.app.db import SessionLocal, init_db
from BE.app.logging_config import setup_logging
from BE.app.models import Exercise, Routine, User
from BE.app.utils.exercises_loader import load_exercises_data

logger = setup_logging()

app = FastAPI(title=f"{APP_NAME} API", version="0.1.0")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        log_level = logging.ERROR if response.status_code >= 500 else (
            logging.WARNING if response.status_code >= 400 else logging.INFO
        )
        logger.log(
            log_level,
            "HTTP request request_id=%s method=%s path=%s status=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response
    except Exception as exc:  # pragma: no cover
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        if APP_ENV == "production":
            logger.error(
                "HTTP request failed request_id=%s method=%s path=%s duration_ms=%s exception_type=%s",
                request_id,
                request.method,
                request.url.path,
                elapsed_ms,
                type(exc).__name__,
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error", "request_id": request_id},
            )

        logger.exception(
            "HTTP request failed request_id=%s method=%s path=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            elapsed_ms,
        )
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(diet_router, prefix=API_PREFIX)
app.include_router(exercises_router, prefix=API_PREFIX)
app.include_router(gyms_router, prefix=API_PREFIX)
app.include_router(profile_router, prefix=API_PREFIX)
app.include_router(routines_router, prefix=API_PREFIX)
app.include_router(workouts_router, prefix=API_PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "LiftLog API"}


@app.on_event("startup")
def startup_event() -> None:
    logger.info("Starting LiftLog API")
    init_db()
    if SEED_DEMO_DATA:
        seed_demo_data()
    else:
        logger.info("Demo data seeding is disabled")
    logger.info("LiftLog API startup complete")


def seed_demo_data() -> None:
    db: Session = SessionLocal()
    try:
        if not db.query(User).first():
            demo_user = User(email="demo@liftlog.app", full_name="Demo User", auth_provider="demo")
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
        else:
            demo_user = db.query(User).filter(User.email == "demo@liftlog.app").first()

        # Load exercises from FE/exercises-data.js
        exercises_data = load_exercises_data()
        
        if exercises_data:
            for exercise_data in exercises_data:
                if not db.query(Exercise).filter(Exercise.id == exercise_data['id']).first():
                    db.add(Exercise(id=exercise_data['id'], name=exercise_data['name']))
            db.commit()
            logger.info("Seeded %d exercises from exercises-data.js", len(exercises_data))
        else:
            # Fallback to basic exercises if exercises-data.js not found
            default_exercises = [
                "Bench Press",
                "Incline DB Press",
                "Cable Fly",
                "Shoulder Press",
                "Lateral Raise",
                "Squat",
                "Deadlift",
                "Leg Press",
            ]
            for name in default_exercises:
                if not db.query(Exercise).filter(Exercise.name == name).first():
                    db.add(Exercise(name=name))
            db.commit()
            logger.info("Seeded fallback exercises")

        if demo_user and not db.query(Routine).filter(Routine.user_id == demo_user.id).first():
            push_day = Routine(user_id=demo_user.id, name="Push Day")
            legs = Routine(user_id=demo_user.id, name="Legs")
            db.add_all([push_day, legs])
            db.commit()
    finally:
        db.close()
