"""Flask API and local JSON storage for the StayWise demo."""

import json
import os
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request, send_from_directory

if __package__:
    from .model import normalize_employee, predict_risk
    from .seed_data import SAMPLE_EMPLOYEES
else:
    from model import normalize_employee, predict_risk
    from seed_data import SAMPLE_EMPLOYEES


ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
DATABASE_FILE = Path(__file__).resolve().parent / "data" / "employees.json"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _with_risk(employee: dict[str, Any]) -> dict[str, Any]:
    result = normalize_employee(employee)
    result["risk"] = predict_risk(result)["risk"]
    return result


def _save_database(employees: list[dict[str, Any]]) -> dict[str, Any]:
    updated_at = _now()
    payload = {"updatedAt": updated_at, "employees": employees}
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


def _read_database() -> dict[str, Any]:
    if not DATABASE_FILE.exists():
        return _save_database([_with_risk(item) for item in SAMPLE_EMPLOYEES])
    try:
        with DATABASE_FILE.open("r", encoding="utf-8") as database_file:
            payload = json.load(database_file)
    except (OSError, json.JSONDecodeError) as error:
        app.logger.exception("Cannot read employee database")
        raise RuntimeError("Không thể đọc dữ liệu nhân viên trên máy chủ.") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("employees"), list):
        raise RuntimeError("Tệp dữ liệu nhân viên trên máy chủ không đúng định dạng.")
    return payload


def _request_object() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Nội dung gửi lên phải là JSON dạng đối tượng.")
    return payload


def _new_employee(data: dict[str, Any]) -> dict[str, Any]:
    employee = normalize_employee(data, employee_id=f"sw-{uuid.uuid4().hex[:12]}")
    return _with_risk(employee)


@app.get("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:asset_path>")
def frontend_asset(asset_path: str):
    return send_from_directory(FRONTEND_DIR, asset_path)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/employees")
def get_employees():
    try:
        return jsonify(_read_database())
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500


@app.post("/api/employees")
def add_employee():
    try:
        employee = _new_employee(_request_object())
        database = _read_database()
        database["employees"].insert(0, employee)
        updated = _save_database(database["employees"])
        return jsonify({"employee": employee, "updatedAt": updated["updatedAt"]}), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500


@app.delete("/api/employees/<employee_id>")
def delete_employee(employee_id: str):
    try:
        database = _read_database()
        employees = database["employees"]
        remaining = [employee for employee in employees if employee.get("id") != employee_id]
        if len(remaining) == len(employees):
            return jsonify({"error": "Không tìm thấy hồ sơ nhân viên."}), 404
        updated = _save_database(remaining)
        return jsonify({"ok": True, "updatedAt": updated["updatedAt"]})
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500


@app.post("/api/employees/import")
def import_employees():
    try:
        payload = _request_object()
        incoming = payload.get("employees")
        if not isinstance(incoming, list):
            raise ValueError("Danh sách employees phải là một mảng.")
        if len(incoming) > 500:
            raise ValueError("Mỗi lần chỉ có thể nhập tối đa 500 hồ sơ.")

        database = _read_database()
        employees = list(database["employees"])
        existing = {
            (item.get("name", "").casefold(), item.get("department", "").casefold())
            for item in employees
        }
        added = 0
        for item in incoming:
            employee = _new_employee(item)
            key = (employee["name"].casefold(), employee["department"].casefold())
            if key in existing:
                continue
            employees.insert(0, employee)
            existing.add(key)
            added += 1

        updated = _save_database(employees) if added else database
        return jsonify(
            {
                "employees": updated["employees"],
                "updatedAt": updated.get("updatedAt"),
                "added": added,
            }
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500


@app.post("/api/predict")
def predict():
    try:
        prediction = predict_risk(_request_object())
        return jsonify(prediction)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.post("/api/reset")
def reset():
    updated = _save_database([_with_risk(item) for item in SAMPLE_EMPLOYEES])
    return jsonify(updated)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Dữ liệu gửi lên vượt giới hạn 2 MB."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)
