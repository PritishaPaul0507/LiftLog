import logging
from typing import Generator

from sqlalchemy import create_engine, exc, text
from sqlalchemy.orm import declarative_base, sessionmaker

from BE.app.core.config import DATABASE_URL

logger = logging.getLogger("liftlog")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    db = SessionLocal()
    logger.debug("DB session opened for request")
    try:
        yield db
    finally:
        db.close()
        logger.debug("DB session closed")


def ensure_user_password_hash_column() -> None:
    with engine.begin() as conn:
        try:
            conn.execute(text("SELECT password_hash FROM users LIMIT 1"))
        except exc.DatabaseError:
            logger.info("DB migration: adding missing password_hash column to users")
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))


def ensure_user_token_columns() -> None:
    with engine.begin() as conn:
        for column_name in ["access_token", "refresh_token"]:
            try:
                conn.execute(text(f"SELECT {column_name} FROM users LIMIT 1"))
            except exc.DatabaseError:
                logger.info("DB migration: adding missing %s column to users", column_name)
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} VARCHAR"))


def ensure_diet_log_item_columns() -> None:
    with engine.begin() as conn:
        try:
            conn.execute(text("SELECT serving_id FROM diet_log_items LIMIT 1"))
        except exc.DatabaseError:
            logger.info("DB migration: adding missing serving_id column to diet_log_items")
            conn.execute(text("ALTER TABLE diet_log_items ADD COLUMN serving_id INTEGER"))


def ensure_profile_version_columns() -> None:
    with engine.begin() as conn:
        index_rows = conn.execute(text("PRAGMA index_list('user_profiles')")).fetchall()
        for index_row in index_rows:
            index_name = index_row[1]
            if index_name in {"ix_user_profiles_user_id", "uq_user_profile_version"}:
                logger.info("DB migration: dropping legacy profile index %s", index_name)
                conn.execute(text(f"DROP INDEX IF EXISTS {index_name}"))

        columns = conn.execute(text("PRAGMA table_info(user_profiles)")).fetchall()
        column_names = {row[1] for row in columns}

        if "version" not in column_names:
            logger.info("DB migration: adding missing version column to user_profiles")
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1"))

        if "created_at" not in column_names:
            logger.info("DB migration: adding missing created_at column to user_profiles")
            conn.execute(text("ALTER TABLE user_profiles ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"))

        if "updated_at" in column_names:
            logger.info("DB migration: removing legacy updated_at column from user_profiles")
            try:
                conn.execute(text("ALTER TABLE user_profiles DROP COLUMN updated_at"))
            except Exception:
                conn.execute(text("ALTER TABLE user_profiles RENAME TO user_profiles_legacy"))
                conn.execute(
                    text(
                        """
                        CREATE TABLE user_profiles (
                            id INTEGER PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            version INTEGER NOT NULL DEFAULT 1,
                            dob VARCHAR,
                            height VARCHAR,
                            weight VARCHAR,
                            sex VARCHAR,
                            wake_time VARCHAR,
                            sleep_time VARCHAR,
                            work_schedule VARCHAR,
                            daily_activity VARCHAR,
                            commute VARCHAR,
                            available_training_time VARCHAR,
                            experience VARCHAR,
                            training_days VARCHAR,
                            preferred_time VARCHAR,
                            preferred_exercises VARCHAR,
                            disliked_exercises VARCHAR,
                            limitations VARCHAR,
                            typical_foods VARCHAR,
                            meals_per_day VARCHAR,
                            eating_out_frequency VARCHAR,
                            favorite_foods VARCHAR,
                            favorite_snacks VARCHAR,
                            dietary_preferences VARCHAR,
                            cooking_constraints VARCHAR,
                            primary_goal VARCHAR,
                            target_weight VARCHAR,
                            goal_description VARCHAR,
                            lifestyle_change_tolerance VARCHAR,
                            current_description VARCHAR,
                            target_description VARCHAR,
                            target_characteristics VARCHAR,
                            inspiration_description VARCHAR,
                            created_at DATETIME NOT NULL,
                            FOREIGN KEY (user_id) REFERENCES users(id),
                            UNIQUE(user_id, version)
                        )
                        """
                    )
                )
                conn.execute(
                    text(
                        """
                        INSERT INTO user_profiles (
                            id, user_id, version, dob, height, weight, sex, wake_time, sleep_time,
                            work_schedule, daily_activity, commute, available_training_time, experience,
                            training_days, preferred_time, preferred_exercises, disliked_exercises,
                            limitations, typical_foods, meals_per_day, eating_out_frequency,
                            favorite_foods, favorite_snacks, dietary_preferences, cooking_constraints,
                            primary_goal, target_weight, goal_description, lifestyle_change_tolerance,
                            current_description, target_description, target_characteristics,
                            inspiration_description, created_at
                        )
                        SELECT
                            id, user_id, COALESCE(version, 1), dob, height, weight, sex, wake_time, sleep_time,
                            work_schedule, daily_activity, commute, available_training_time, experience,
                            training_days, preferred_time, preferred_exercises, disliked_exercises,
                            limitations, typical_foods, meals_per_day, eating_out_frequency,
                            favorite_foods, favorite_snacks, dietary_preferences, cooking_constraints,
                            primary_goal, target_weight, goal_description, lifestyle_change_tolerance,
                            current_description, target_description, target_characteristics,
                            inspiration_description, COALESCE(created_at, CURRENT_TIMESTAMP)
                        FROM user_profiles_legacy
                        """
                    )
                )
                conn.execute(text("DROP TABLE user_profiles_legacy"))

        conn.execute(text("UPDATE user_profiles SET version = 1 WHERE version IS NULL"))
        conn.execute(text("UPDATE user_profiles SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profile_version ON user_profiles (user_id, version)"))


def ensure_workout_name_column() -> None:
    with engine.begin() as conn:
        try:
            conn.execute(text("SELECT workout_name FROM workouts LIMIT 1"))
        except exc.DatabaseError:
            logger.info("DB migration: adding missing workout_name column to workouts")
            conn.execute(text("ALTER TABLE workouts ADD COLUMN workout_name VARCHAR NOT NULL DEFAULT ''"))

        conn.execute(text("UPDATE workouts SET workout_name = CAST(id AS VARCHAR) WHERE workout_name IS NULL OR workout_name = ''"))


def init_db() -> None:
    from BE.app.models import Base as ModelsBase

    logger.info("DB init: creating database tables if missing")
    try:
        ModelsBase.metadata.create_all(bind=engine)
        ensure_user_password_hash_column()
        ensure_user_token_columns()
        ensure_diet_log_item_columns()
        ensure_profile_version_columns()
        ensure_workout_name_column()
        logger.info("DB init: complete")
    except Exception:
        logger.exception("DB init failed during schema creation or migration")
        raise
