import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(PROJECT_ROOT / ".env")

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
if APP_ENV not in {"development", "test", "production"}:
    raise ValueError("APP_ENV must be development, test, or production")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./liftlog.db")
APP_NAME = os.getenv("APP_NAME", "LiftLog")
API_PREFIX = "/" + os.getenv("API_PREFIX", "/api/v1").strip("/")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "local-development-only-change-before-deploy")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_SECRET = JWT_SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip().upper()
LOG_TO_FILE = os.getenv("LOG_TO_FILE", "true").strip().lower() in {"1", "true", "yes", "on"}
UVICORN_ACCESS_LOG = os.getenv("UVICORN_ACCESS_LOG", "false").strip().lower() in {"1", "true", "yes", "on"}
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
    if origin.strip()
]
SEED_DEMO_DATA = os.getenv("SEED_DEMO_DATA", str(APP_ENV != "production")).strip().lower() in {
    "1", "true", "yes", "on"
}
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
if APP_ENV == "production":
    SEED_DEMO_DATA = False

if APP_ENV == "production":
    secret_markers = ("replace", "change-me", "example", "local-development")
    if len(JWT_SECRET_KEY) < 32 or any(marker in JWT_SECRET_KEY.lower() for marker in secret_markers):
        raise ValueError("Production requires a unique JWT_SECRET_KEY with at least 32 characters")
    if not CORS_ORIGINS or "*" in CORS_ORIGINS:
        raise ValueError("Production CORS_ORIGINS must list explicit trusted origins")
    if any(not origin.startswith("https://") for origin in CORS_ORIGINS):
        raise ValueError("Production CORS_ORIGINS must use HTTPS origins")
