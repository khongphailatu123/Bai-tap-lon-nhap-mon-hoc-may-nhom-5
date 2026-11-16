"""Employee profile API endpoints."""

import uuid
from typing import Any

from flask import Blueprint, current_app, jsonify, request

from auth_routes import admin_required
from model import normalize_employee, predict_risk
from seed_data import SAMPLE_EMPLOYEES
from storage import read_database, save_database


employee_api = Blueprint("employees", __name__, url_prefix="/api")


def _employees() -> list[dict[str, Any]]:
    employees = []
    for data in SAMPLE_EMPLOYEES:
        employee = normalize_employee(data)
        employee["risk"] = predict_risk(employee)["risk"]
        employees.append(employee)
    return employees


def _with_risk(data: dict[str, Any], employee_id: str | None = None) -> dict[str, Any]:
    employee = normalize_employee(data, employee_id=employee_id)
    employee["risk"] = predict_risk(employee)["risk"]
    return employee


def _request_object() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Nội dung gửi lên phải là JSON dạng đối tượng.")
    return payload


@employee_api.get("/employees")
@admin_required
def get_employees():
    try:
        return jsonify(read_database(_employees()))
    except RuntimeError as error:
        current_app.logger.exception("Cannot read employee database")
        return jsonify({"error": str(error)}), 500


@employee_api.post("/employees")
@admin_required
def add_employee():
    try:
        employee = _with_risk(_request_object(), employee_id=f"sw-{uuid.uuid4().hex[:12]}")
        database = read_database(_employees())
        database["employees"].insert(0, employee)
        updated = save_database(
            database["employees"], database["predictions"],
            database["users"], database["supportRequests"],
        )
        return jsonify({"employee": employee, "updatedAt": updated["updatedAt"]}), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot save employee")
        return jsonify({"error": str(error)}), 500


@employee_api.put("/employees/<employee_id>")
@admin_required
def update_employee(employee_id: str):
    try:
        database = read_database(_employees())
        existing = next((item for item in database["employees"] if item.get("id") == employee_id), None)
        if existing is None:
            return jsonify({"error": "Không tìm thấy hồ sơ nhân viên."}), 404
        employee = _with_risk(_request_object(), employee_id=employee_id)
        database["employees"] = [
            employee if item.get("id") == employee_id else item
            for item in database["employees"]
        ]
        updated = save_database(
            database["employees"], database["predictions"],
            database["users"], database["supportRequests"],
        )
        return jsonify({"employee": employee, "updatedAt": updated["updatedAt"]})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot update employee")
        return jsonify({"error": str(error)}), 500


@employee_api.delete("/employees/<employee_id>")
@admin_required
def delete_employee(employee_id: str):
    try:
        database = read_database(_employees())
        employees = database["employees"]
        remaining = [item for item in employees if item.get("id") != employee_id]
        if len(remaining) == len(employees):
            return jsonify({"error": "Không tìm thấy hồ sơ nhân viên."}), 404
        if any(user.get("employeeId") == employee_id for user in database["users"]):
            return jsonify({
                "error": "Hồ sơ này đang liên kết với tài khoản. Hãy khóa tài khoản thay vì xóa hồ sơ."
            }), 409
        updated = save_database(
            remaining, database["predictions"],
            database["users"], database["supportRequests"],
        )
        return jsonify({"ok": True, "updatedAt": updated["updatedAt"]})
    except RuntimeError as error:
        current_app.logger.exception("Cannot delete employee")
        return jsonify({"error": str(error)}), 500


@employee_api.post("/employees/import")
@admin_required
def import_employees():
    try:
        incoming = _request_object().get("employees")
        if not isinstance(incoming, list):
            raise ValueError("Danh sách employees phải là một mảng.")
        if len(incoming) > 500:
            raise ValueError("Mỗi lần chỉ có thể nhập tối đa 500 hồ sơ.")

        database = read_database(_employees())
        employees = list(database["employees"])
        existing = {
            (item.get("name", "").casefold(), item.get("department", "").casefold())
            for item in employees
        }
        added = 0
        for data in incoming:
            employee = _with_risk(data, employee_id=f"sw-{uuid.uuid4().hex[:12]}")
            key = (employee["name"].casefold(), employee["department"].casefold())
            if key in existing:
                continue
            employees.insert(0, employee)
            existing.add(key)
            added += 1

        updated = save_database(
            employees, database["predictions"],
            database["users"], database["supportRequests"],
        ) if added else database
        return jsonify({
            "employees": updated["employees"],
            "updatedAt": updated.get("updatedAt"),
            "added": added,
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot import employees")
        return jsonify({"error": str(error)}), 500


@employee_api.post("/reset")
@admin_required
def reset():
    database = read_database(_employees())
    linked_ids = {
        user.get("employeeId")
        for user in database["users"]
        if user.get("employeeId")
    }
    linked_profiles = [
        item for item in database["employees"] if item.get("id") in linked_ids
    ]
    employees = [_with_risk(item) for item in SAMPLE_EMPLOYEES] + [
        _with_risk(item, employee_id=item["id"]) for item in linked_profiles
    ]
    return jsonify(save_database(employees, [], database["users"], database["supportRequests"]))
