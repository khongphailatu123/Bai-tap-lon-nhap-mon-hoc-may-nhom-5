"""Local JSON persistence for employee profiles and prediction history."""

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DATABASE_FILE = Path(
    os.environ.get(
        "STAYWISE_DATA_FILE",
        str(Path(__file__).resolve().parent / "data" / "employees.json"),
    )
).expanduser().resolve()


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_database(seed_employees: list[dict[str, Any]]) -> dict[str, Any]:
    if not DATABASE_FILE.exists():
        return save_database(seed_employees, [], [], [])
    try:
        with DATABASE_FILE.open("r", encoding="utf-8") as database_file:
            payload = json.load(database_file)
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Không thể đọc dữ liệu trên máy chủ.") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("employees"), list):
        raise RuntimeError("Tệp dữ liệu trên máy chủ không đúng định dạng.")
    if not isinstance(payload.get("predictions"), list):
        payload["predictions"] = []
    if not isinstance(payload.get("users"), list):
        payload["users"] = []
    if not isinstance(payload.get("supportRequests"), list):
        payload["supportRequests"] = []
    return payload


def save_database(
    employees: list[dict[str, Any]],
    predictions: list[dict[str, Any]],
    users: list[dict[str, Any]],
    support_requests: list[dict[str, Any]],
) -> dict[str, Any]:
    payload = {
        "updatedAt": now_utc(),
        "employees": employees,
        "predictions": predictions,
        "users": users,
        "supportRequests": support_requests,
    }
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=DATABASE_FILE.parent,
            delete=False,
            suffix=".tmp",
        ) as temporary_file:
            json.dump(payload, temporary_file, ensure_ascii=False, indent=2)
            temporary_path = Path(temporary_file.name)
        temporary_path.replace(DATABASE_FILE)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()
    return payload
