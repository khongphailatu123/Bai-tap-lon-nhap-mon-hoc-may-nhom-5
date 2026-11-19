"""Authentication, employee self-service, and administrator account APIs."""

import base64
import binascii
import re
import secrets
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable

from flask import Blueprint, current_app, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from .model import normalize_employee, predict_risk
from .storage import read_database, save_database


auth_api = Blueprint("auth", __name__, url_prefix="/api")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def public_user(user: dict[str, Any], include_avatar: bool = True) -> dict[str, Any]:
    result = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "active": user["active"],
        "employeeId": user.get("employeeId"),
        "createdAt": user.get("createdAt"),
    }
    if include_avatar:
        result["avatarDataUrl"] = user.get("avatarDataUrl")
    return result


def _database() -> dict[str, Any]:
    from .employee_routes import _employees

    return read_database(_employees())


def _current_user() -> dict[str, Any] | None:
    if "current_user" in g:
        return g.current_user
    user_id = session.get("user_id")
    if not user_id:
        g.current_user = None
        return None
    user = next((item for item in _database()["users"] if item.get("id") == user_id), None)
    if (
        not user
        or not user.get("active")
        or session.get("session_version", 0) != user.get("sessionVersion", 0)
    ):
        session.clear()
        user = None
    g.current_user = user
    return user


def _login_required(role: str | None = None):
    def decorate(view: Callable):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = _current_user()
            if user is None:
                return jsonify({"error": "Vui lòng đăng nhập để tiếp tục."}), 401
            if role and user.get("role") != role:
                return jsonify({"error": "Bạn không có quyền thực hiện thao tác này."}), 403
            return view(*args, **kwargs)

        return wrapped

    return decorate


auth_required = _login_required()
admin_required = _login_required("admin")
employee_required = _login_required("employee")


def _request_object() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Nội dung gửi lên phải là JSON dạng đối tượng.")
    return payload


def _employee_for_user(database: dict[str, Any], user: dict[str, Any]) -> dict[str, Any] | None:
    return next(
        (item for item in database["employees"] if item.get("id") == user.get("employeeId")),
        None,
    )


@auth_api.post("/auth/register")
def register():
    try:
        payload = _request_object()
        name = str(payload.get("name") or "").strip()
        email = str(payload.get("email") or "").strip().casefold()
        password = payload.get("password")
        if not name or len(name) > 100:
            raise ValueError("Họ tên phải có từ 1 đến 100 ký tự.")
        if not EMAIL_PATTERN.fullmatch(email) or len(email) > 254:
            raise ValueError("Email không hợp lệ.")
        if not isinstance(password, str) or not 10 <= len(password) <= 128:
            raise ValueError("Mật khẩu phải có từ 10 đến 128 ký tự.")
        department = str(payload.get("department") or "Chưa cập nhật").strip()
        if len(department) > 100:
            raise ValueError("Tên phòng ban không được vượt quá 100 ký tự.")

        database = _database()
        if any(user.get("email", "").casefold() == email for user in database["users"]):
            return jsonify({"error": "Email này đã được đăng ký."}), 409

        employee_id = f"sw-{secrets.token_hex(6)}"
        employee = normalize_employee({
            "name": name,
            "email": email,
            "department": department,
            "role": "Nhân viên",
        }, employee_id=employee_id)
        employee["risk"] = predict_risk(employee)["risk"]
        user = {
            "id": secrets.token_hex(12),
            "email": email,
            "name": name,
            "role": "employee",
            "active": True,
            "employeeId": employee_id,
            "passwordHash": generate_password_hash(password),
            "sessionVersion": 0,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        database["employees"].insert(0, employee)
        database["users"].append(user)
        updated = save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        session.clear()
        session["user_id"] = user["id"]
        session["session_version"] = user.get("sessionVersion", 0)
        session.permanent = True
        return jsonify({"user": public_user(user), "employee": employee, "updatedAt": updated["updatedAt"]}), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot register employee account")
        return jsonify({"error": str(error)}), 500


@auth_api.post("/auth/login")
def login():
    try:
        payload = _request_object()
        email = str(payload.get("email") or "").strip().casefold()
        password = payload.get("password")
        user = next(
            (item for item in _database()["users"] if item.get("email", "").casefold() == email),
            None,
        )
        if (
            not user
            or not user.get("active")
            or not isinstance(password, str)
            or not check_password_hash(user.get("passwordHash", ""), password)
        ):
            return jsonify({"error": "Email hoặc mật khẩu không chính xác."}), 401
        session.clear()
        session["user_id"] = user["id"]
        session["session_version"] = user.get("sessionVersion", 0)
        session.permanent = True
        database = _database()
        return jsonify({
            "user": public_user(user),
            "employee": _employee_for_user(database, user),
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot log in")
        return jsonify({"error": str(error)}), 500


@auth_api.post("/auth/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@auth_api.get("/auth/me")
def me():
    user = _current_user()
    if user is None:
        return jsonify({"user": None, "employee": None})
    database = _database()
    employee = _employee_for_user(database, user) if user["role"] == "employee" else None
    return jsonify({"user": public_user(user), "employee": employee})


@auth_api.put("/me")
@auth_required
def update_my_profile():
    try:
        payload = _request_object()
        database = _database()
        current_user = _current_user()
        user = next((item for item in database["users"] if item.get("id") == current_user["id"]), None)
        if user is None:
            return jsonify({"error": "Không tìm thấy tài khoản."}), 404
        email = str(payload.get("email", user["email"]) or "").strip().casefold()
        name = str(payload.get("name", user["name"]) or "").strip()
        if not name or len(name) > 100:
            raise ValueError("Họ tên phải có từ 1 đến 100 ký tự.")
        if not EMAIL_PATTERN.fullmatch(email) or len(email) > 254:
            raise ValueError("Email không hợp lệ.")
        if any(
            item.get("id") != user["id"] and item.get("email", "").casefold() == email
            for item in database["users"]
        ):
            return jsonify({"error": "Email này đã được tài khoản khác sử dụng."}), 409

        updated_employee = None
        employee = _employee_for_user(database, user)
        if user.get("role") == "employee":
            if employee is None:
                return jsonify({"error": "Không tìm thấy hồ sơ nhân viên của tài khoản."}), 404
            department = str(payload.get("department", employee.get("department", "")) or "").strip()
            if len(department) > 100:
                raise ValueError("Tên phòng ban không được vượt quá 100 ký tự.")
            profile_fields = {
                **employee,
                "name": name,
                "email": email,
                "department": department,
            }
            for field in ("tenure", "satisfaction", "salary", "overtime", "distance", "age", "balance"):
                if field in payload:
                    profile_fields[field] = payload[field]
            updated_employee = normalize_employee(profile_fields, employee_id=employee["id"])
            updated_employee["role"] = employee.get("role", "Nhân viên")
            updated_employee["risk"] = predict_risk(updated_employee)["risk"]
            database["employees"] = [
                updated_employee if item.get("id") == employee["id"] else item
                for item in database["employees"]
            ]
        user["name"] = name
        user["email"] = email
        updated = save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({
            "user": public_user(user),
            "employee": updated_employee,
            "updatedAt": updated["updatedAt"],
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot update employee profile")
        return jsonify({"error": str(error)}), 500


@auth_api.put("/me/avatar")
@auth_required
def update_avatar():
    try:
        payload = _request_object()
        image = payload.get("image")
        if image is not None:
            if not isinstance(image, str) or len(image) > 700_000:
                raise ValueError("Ảnh đại diện không được lớn hơn 512 KB.")
            match = re.fullmatch(r"data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})", image)
            if not match:
                raise ValueError("Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP hợp lệ.")
            try:
                image_bytes = base64.b64decode(match.group(2), validate=True)
            except (binascii.Error, ValueError) as error:
                raise ValueError("Tệp ảnh không hợp lệ.") from error
            if not image_bytes or len(image_bytes) > 512 * 1024:
                raise ValueError("Ảnh đại diện không được lớn hơn 512 KB.")
            image_type = match.group(1)
            valid_signature = (
                image_type == "image/png" and image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
            ) or (
                image_type == "image/jpeg" and image_bytes.startswith(b"\xff\xd8\xff")
            ) or (
                image_type == "image/webp"
                and len(image_bytes) >= 12
                and image_bytes.startswith(b"RIFF")
                and image_bytes[8:12] == b"WEBP"
            )
            if not valid_signature:
                raise ValueError("Nội dung ảnh không khớp với định dạng tệp.")
            image = f"data:{image_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"

        database = _database()
        user = next(
            (item for item in database["users"] if item.get("id") == session.get("user_id")),
            None,
        )
        if user is None:
            return jsonify({"error": "Không tìm thấy tài khoản."}), 404
        user["avatarDataUrl"] = image
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"user": public_user(user)})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot update account avatar")
        return jsonify({"error": str(error)}), 500


@auth_api.post("/me/password")
@auth_required
def change_password():
    try:
        payload = _request_object()
        current_password = payload.get("currentPassword")
        new_password = payload.get("newPassword")
        session_user = _current_user()
        if not isinstance(current_password, str) or not check_password_hash(
            session_user.get("passwordHash", ""), current_password
        ):
            return jsonify({"error": "Mật khẩu hiện tại không chính xác."}), 400
        if not isinstance(new_password, str) or not 10 <= len(new_password) <= 128:
            raise ValueError("Mật khẩu mới phải có từ 10 đến 128 ký tự.")
        database = _database()
        user = next(
            (item for item in database["users"] if item.get("id") == session_user["id"]),
            None,
        )
        if user is None:
            return jsonify({"error": "Không tìm thấy tài khoản."}), 404
        user["passwordHash"] = generate_password_hash(new_password)
        user["sessionVersion"] = user.get("sessionVersion", 0) + 1
        session["session_version"] = user["sessionVersion"]
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"ok": True})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot change account password")
        return jsonify({"error": str(error)}), 500


@auth_api.post("/me/sessions/revoke-others")
@auth_required
def revoke_other_sessions():
    try:
        database = _database()
        user = next(
            (item for item in database["users"] if item.get("id") == session.get("user_id")),
            None,
        )
        if user is None:
            return jsonify({"error": "Không tìm thấy tài khoản."}), 404
        user["sessionVersion"] = user.get("sessionVersion", 0) + 1
        session["session_version"] = user["sessionVersion"]
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"ok": True})
    except RuntimeError as error:
        current_app.logger.exception("Cannot revoke other account sessions")
        return jsonify({"error": str(error)}), 500


@auth_api.get("/me/export")
@auth_required
def export_my_data():
    try:
        database = _database()
        user = _current_user()
        return jsonify({
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "account": public_user(user),
            "employeeProfile": _employee_for_user(database, user),
            "predictions": [
                item for item in database["predictions"] if item.get("userId") == user["id"]
            ],
            "supportRequests": [
                item for item in database["supportRequests"] if item.get("userId") == user["id"]
            ],
            "employeePortal": {
                key: [
                    item for item in database.get("employeePortal", {}).get(key, [])
                    if item.get("userId") == user["id"]
                ]
                for key in ("leaveRequests", "goals", "enrollments", "tasks", "reviews")
            },
        })
    except RuntimeError as error:
        current_app.logger.exception("Cannot export account data")
        return jsonify({"error": str(error)}), 500


@auth_api.get("/me/predictions")
@employee_required
def my_predictions():
    database = _database()
    user = _current_user()
    history = [item for item in database["predictions"] if item.get("userId") == user["id"]]
    return jsonify({"history": history})


@auth_api.post("/me/predict")
@employee_required
def predict_for_me():
    try:
        database = _database()
        user = _current_user()
        employee = _employee_for_user(database, user)
        if employee is None:
            return jsonify({"error": "Không tìm thấy hồ sơ nhân viên của tài khoản."}), 404
        prediction = predict_risk(employee)
        prediction["id"] = f"pr-{secrets.token_hex(6)}"
        prediction["userId"] = user["id"]
        prediction["createdAt"] = datetime.now(timezone.utc).isoformat()
        database["predictions"].insert(0, prediction)
        database["predictions"] = database["predictions"][:500]
        updated = save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({
            "prediction": prediction,
            "history": [item for item in updated["predictions"] if item.get("userId") == user["id"]],
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot save employee prediction")
        return jsonify({"error": str(error)}), 500


@auth_api.post("/me/support-requests")
@employee_required
def create_support_request():
    try:
        payload = _request_object()
        subject = str(payload.get("subject") or "").strip()
        message = str(payload.get("message") or "").strip()
        if not subject or len(subject) > 120:
            raise ValueError("Tiêu đề yêu cầu phải có từ 1 đến 120 ký tự.")
        if not message or len(message) > 2000:
            raise ValueError("Nội dung yêu cầu phải có từ 1 đến 2.000 ký tự.")
        database = _database()
        user = _current_user()
        support_request = {
            "id": secrets.token_hex(10),
            "userId": user["id"],
            "name": user["name"],
            "email": user["email"],
            "subject": subject,
            "message": message,
            "status": "open",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        database["supportRequests"].insert(0, support_request)
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"request": support_request}), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot create employee support request")
        return jsonify({"error": str(error)}), 500


@auth_api.get("/me/support-requests")
@employee_required
def my_support_requests():
    database = _database()
    user = _current_user()
    requests_for_user = [
        item for item in database["supportRequests"] if item.get("userId") == user["id"]
    ]
    return jsonify({"requests": requests_for_user})


@auth_api.get("/admin/accounts")
@admin_required
def list_accounts():
    database = _database()
    return jsonify({"accounts": [public_user(user, include_avatar=False) for user in database["users"]]})


@auth_api.patch("/admin/accounts/<account_id>")
@admin_required
def update_account(account_id: str):
    try:
        payload = _request_object()
        database = _database()
        actor = _current_user()
        account = next((item for item in database["users"] if item.get("id") == account_id), None)
        if account is None:
            return jsonify({"error": "Không tìm thấy tài khoản."}), 404
        role = payload.get("role", account.get("role"))
        active = payload.get("active", account.get("active"))
        if not isinstance(role, str) or role not in {"admin", "employee"} or not isinstance(active, bool):
            raise ValueError("Vai trò hoặc trạng thái tài khoản không hợp lệ.")
        if account["id"] == actor["id"] and (role != "admin" or not active):
            return jsonify({"error": "Không thể tự hạ quyền hoặc vô hiệu hóa tài khoản đang đăng nhập."}), 400
        if account.get("role") == "admin" and account.get("active"):
            removing_admin = role != "admin" or not active
            remaining_admins = sum(
                1 for user in database["users"]
                if user.get("role") == "admin" and user.get("active") and user.get("id") != account_id
            )
            if removing_admin and remaining_admins == 0:
                return jsonify({"error": "Hệ thống phải luôn có ít nhất một admin đang hoạt động."}), 400
        if role == "employee" and not any(
            item.get("id") == account.get("employeeId") for item in database["employees"]
        ):
            employee_id = f"sw-{secrets.token_hex(6)}"
            employee = normalize_employee({
                "name": account["name"],
                "email": account["email"],
                "department": "Chưa cập nhật",
                "role": "Nhân viên",
            }, employee_id=employee_id)
            employee["risk"] = predict_risk(employee)["risk"]
            database["employees"].insert(0, employee)
            account["employeeId"] = employee_id
        account["role"] = role
        account["active"] = active
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"account": public_user(account)})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot update account")
        return jsonify({"error": str(error)}), 500


@auth_api.get("/admin/support-requests")
@admin_required
def list_support_requests():
    database = _database()
    return jsonify({"requests": database["supportRequests"]})


@auth_api.patch("/admin/support-requests/<request_id>")
@admin_required
def update_support_request(request_id: str):
    try:
        payload = _request_object()
        status = payload.get("status")
        if status not in {"open", "in_progress", "resolved"}:
            raise ValueError("Trạng thái yêu cầu không hợp lệ.")
        database = _database()
        support_request = next(
            (item for item in database["supportRequests"] if item.get("id") == request_id),
            None,
        )
        if support_request is None:
            return jsonify({"error": "Không tìm thấy yêu cầu hỗ trợ."}), 404
        support_request["status"] = status
        save_database(
            database["employees"],
            database["predictions"],
            database["users"],
            database["supportRequests"],
        )
        return jsonify({"request": support_request})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot update support request")
        return jsonify({"error": str(error)}), 500
