import logging
import sys
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

from BE.app.core.config import LOG_LEVEL, LOG_TO_FILE, UVICORN_ACCESS_LOG

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("liftlog")
    level = getattr(logging, LOG_LEVEL, None)
    if not isinstance(level, int):
        raise ValueError(f"Invalid LOG_LEVEL: {LOG_LEVEL}")

    logger.setLevel(level)
    logger.propagate = False
    logging.getLogger("uvicorn.access").disabled = not UVICORN_ACCESS_LOG

    if logger.handlers:
        for handler in logger.handlers:
            handler.setLevel(level)
        return logger

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    if LOG_TO_FILE:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        file_handler = TimedRotatingFileHandler(
            LOG_DIR / "liftlog.log",
            when="midnight",
            interval=1,
            backupCount=14,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger
