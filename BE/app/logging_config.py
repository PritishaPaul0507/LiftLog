import logging
import sys
from datetime import date
from pathlib import Path

from BE.app.core.config import LOG_LEVEL, LOG_TO_FILE, UVICORN_ACCESS_LOG

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"


class DailyFileHandler(logging.FileHandler):
    def __init__(self, log_dir: Path, encoding: str = "utf-8") -> None:
        self.log_dir = log_dir
        self.current_date = date.today()
        self.baseFilename = str(self._path_for_date(self.current_date).resolve())
        super().__init__(self.baseFilename, encoding=encoding)

    def _path_for_date(self, log_date: date) -> Path:
        return self.log_dir / f"liftlog.log.{log_date:%Y-%m-%d}"

    def rollover_if_needed(self, today: date | None = None) -> None:
        next_date = today or date.today()
        if next_date == self.current_date:
            return

        if self.stream:
            self.stream.flush()
            self.stream.close()

        self.current_date = next_date
        self.baseFilename = str(self._path_for_date(next_date).resolve())
        self.stream = self._open()

    def emit(self, record: logging.LogRecord) -> None:
        self.rollover_if_needed()
        super().emit(record)


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
        file_handler = DailyFileHandler(LOG_DIR)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger
