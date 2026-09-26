import json
import logging
import re
from pathlib import Path

logger = logging.getLogger("liftlog")


def load_exercises_data():
    """Load exercises from FE/exercises-data.js"""
    try:
        file_path = Path(__file__).resolve().parents[3] / "FE" / "exercises-data.js"
        
        if not file_path.exists():
            logger.warning("Exercise seed file is unavailable; fallback data will be used")
            return []

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract the array content from export const EXDB=[...];
        match = re.search(r'export\s+const\s+EXDB=(\[.*?\]);', content, re.DOTALL)
        if not match:
            logger.warning("Exercise seed file has an unsupported format; fallback data will be used")
            return []

        json_str = match.group(1)
        exercises = json.loads(json_str)

        # Transform to match our schema: id -> exercise_id, n -> name
        result = []
        for ex in exercises:
            result.append({
                'id': int(ex.get('id', 0)),
                'name': ex.get('n', ''),
            })

        return result

    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        logger.exception("Failed to load exercise seed data")
        return []
