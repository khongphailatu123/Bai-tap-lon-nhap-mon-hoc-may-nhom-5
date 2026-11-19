"""Employee self-service features and their administrator workflows."""

import secrets
from datetime import date, datetime, timezone
import re
from typing import Any

from flask import Blueprint, current_app, jsonify, request

from .auth_routes import admin_required, employee_required
from .employee_routes import _employees
from .storage import read_database, save_database


employee_portal_api = Blueprint("employee_portal", __name__, url_prefix="/api")

TRAINING_COURSES = [
    {
        "id": "communication",
        "title": "Giao tiếp và phối hợp nhóm",
        "category": "Kỹ năng mềm",
        "duration": "3 giờ",
        "description": "Thực hành giao tiếp rõ ràng, lắng nghe chủ động và phối hợp hiệu quả.",
    },
    {
        "id": "data-basics",
        "title": "Kỹ năng dữ liệu căn bản",
        "category": "Chuyên môn",
        "duration": "5 giờ",
        "description": "Làm quen với cách đọc biểu đồ, kiểm tra dữ liệu và trình bày kết quả.",
    },
    {
        "id": "time-management",
        "title": "Quản lý thời gian và ưu tiên",
        "category": "Phát triển cá nhân",
        "duration": "2 giờ",
        "description": "Lập kế hoạch tuần, chia nhỏ công việc và nhận diện yếu tố gây gián đoạn.",
    },
    {
        "id": "workplace-safety",
        "title": "An toàn và sức khỏe nơi làm việc",
        "category": "Sức khỏe",
        "duration": "2 giờ",
        "description": "Các nguyên tắc cơ bản để duy trì môi trường làm việc an toàn, lành mạnh.",
    },
]

DEFAULT_ANNOUNCEMENTS = [
    {
        "id": "welcome-portal",
        "title": "Chào mừng đến với cổng thông tin nhân viên",
        "body": "Bạn có thể theo dõi mục tiêu, lịch cá nhân, khóa học và các yêu cầu của mình tại đây.",
        "createdAt": "2026-01-01T00:00:00+00:00",
        "author": "StayWise",
        "pinned": True,
    },
    {
        "id": "wellbeing-reminder",
        "title": "Nhắc nhở cân bằng công việc",
        "body": "Hãy trao đổi với quản lý khi khối lượng công việc hoặc lịch làm thêm ảnh hưởng đến sức khỏe.",
        "createdAt": "2026-01-02T00:00:00+00:00",
        "author": "StayWise",
        "pinned": False,
    },
]

PORTAL_COLLECTIONS = (
    "leaveRequests",
    "goals",
    "enrollments",
    "announcements",
    "announcementReads",
    "feedback",
    "tasks",
    "reviews",
)


def _database() -> dict[str, Any]:
    return read_database(_employees())


def _portal(database: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    portal = database.setdefault("employeePortal", {})
    for collection in PORTAL_COLLECTIONS:
        if not isinstance(portal.get(collection), list):
            portal[collection] = []
    if not portal["announcements"]:
        portal["announcements"] = [dict(item) for item in DEFAULT_ANNOUNCEMENTS]
    return portal


def _save(database: dict[str, Any]) -> dict[str, Any]:
    return save_database(
        database["employees"],
        database["predictions"],
        database["users"],
        database["supportRequests"],
        extra_data={"employeePortal": _portal(database)},
    )


def _payload() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Nội dung gửi lên phải là JSON dạng đối tượng.")
    return payload


def _text(payload: dict[str, Any], key: str, label: str, maximum: int, required: bool = True) -> str:
    value = payload.get(key, "")
    if not isinstance(value, str):
        raise ValueError(f"{label} không hợp lệ.")
    value = value.strip()
    if (required and not value) or len(value) > maximum:
        raise ValueError(f"{label} phải có từ 1 đến {maximum} ký tự." if required else f"{label} không được vượt quá {maximum} ký tự.")
    return value


def _iso_date(value: Any, label: str, required: bool = True) -> str | None:
    if value in (None, "") and not required:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{label} không hợp lệ.")
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as error:
        raise ValueError(f"{label} phải có định dạng YYYY-MM-DD.") from error


def _employee_user(database: dict[str, Any], user_id: str) -> dict[str, Any] | None:
    return next((user for user in database["users"] if user.get("id") == user_id), None)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(8)}"


def _error(error: Exception, message: str):
    if isinstance(error, ValueError):
        return jsonify({"error": str(error)}), 400
    current_app.logger.exception(message)
    return jsonify({"error": str(error)}), 500


@employee_portal_api.get("/employee-portal")
@employee_required
def get_employee_portal():
    try:
        database = _database()
        portal = _portal(database)
        from .auth_routes import _current_user
        user_id = _current_user()["id"]
        return jsonify({
            "leaveRequests": [item for item in portal["leaveRequests"] if item.get("userId") == user_id],
            "goals": [item for item in portal["goals"] if item.get("userId") == user_id],
            "courses": TRAINING_COURSES,
            "enrollments": [item for item in portal["enrollments"] if item.get("userId") == user_id],
            "announcements": portal["announcements"],
            "readAnnouncementIds": [
                item["announcementId"] for item in portal["announcementReads"]
                if item.get("userId") == user_id
            ],
            "tasks": [item for item in portal["tasks"] if item.get("userId") == user_id],
            "reviews": [item for item in portal["reviews"] if item.get("userId") == user_id],
        })
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot load employee portal")


@employee_portal_api.post("/employee-portal/leaves")
@employee_required
def create_leave_request():
    try:
        payload = _payload()
        start = _iso_date(payload.get("startDate"), "Ngày bắt đầu")
        end = _iso_date(payload.get("endDate"), "Ngày kết thúc")
        if end < start:
            raise ValueError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.")
        leave_type = payload.get("type")
        if leave_type not in {"annual", "sick", "personal", "other"}:
            raise ValueError("Loại nghỉ phép không hợp lệ.")
        from .auth_routes import _current_user

        user = _current_user()
        database = _database()
        portal = _portal(database)
        item = {
            "id": _new_id("leave"),
            "userId": user["id"],
            "name": user["name"],
            "email": user["email"],
            "startDate": start,
            "endDate": end,
            "type": leave_type,
            "reason": _text(payload, "reason", "Lý do", 1000),
            "status": "pending",
            "adminNote": "",
            "createdAt": _now(),
            "updatedAt": _now(),
        }
        portal["leaveRequests"].insert(0, item)
        _save(database)
        return jsonify({"request": item}), 201
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot create leave request")


@employee_portal_api.delete("/employee-portal/leaves/<request_id>")
@employee_required
def cancel_leave_request(request_id: str):
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        user_id = _current_user()["id"]
        item = next((row for row in portal["leaveRequests"] if row.get("id") == request_id), None)
        if item is None or item.get("userId") != user_id:
            return jsonify({"error": "Không tìm thấy đơn nghỉ phép."}), 404
        if item.get("status") != "pending":
            return jsonify({"error": "Chỉ có thể hủy đơn đang chờ duyệt."}), 409
        portal["leaveRequests"].remove(item)
        _save(database)
        return jsonify({"ok": True})
    except RuntimeError as error:
        return _error(error, "Cannot cancel leave request")


@employee_portal_api.patch("/admin/employee-portal/leaves/<request_id>")
@admin_required
def review_leave_request(request_id: str):
    try:
        payload = _payload()
        status = payload.get("status")
        if status not in {"approved", "rejected"}:
            raise ValueError("Trạng thái đơn nghỉ phép không hợp lệ.")
        note = _text(payload, "adminNote", "Ghi chú", 500, required=False)
        database = _database()
        portal = _portal(database)
        item = next((row for row in portal["leaveRequests"] if row.get("id") == request_id), None)
        if item is None:
            return jsonify({"error": "Không tìm thấy đơn nghỉ phép."}), 404
        if item.get("status") != "pending":
            return jsonify({"error": "Đơn nghỉ phép này đã được xử lý."}), 409
        item.update(status=status, adminNote=note, updatedAt=_now())
        _save(database)
        return jsonify({"request": item})
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot review leave request")


@employee_portal_api.route("/employee-portal/goals", methods=["POST"])
@employee_required
def create_goal():
    try:
        payload = _payload()
        progress = payload.get("progress", 0)
        if isinstance(progress, bool) or not isinstance(progress, int) or not 0 <= progress <= 100:
            raise ValueError("Tiến độ mục tiêu phải là số nguyên từ 0 đến 100.")
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        item = {
            "id": _new_id("goal"),
            "userId": _current_user()["id"],
            "title": _text(payload, "title", "Tên mục tiêu", 120),
            "description": _text(payload, "description", "Mô tả", 1000, required=False),
            "dueDate": _iso_date(payload.get("dueDate"), "Hạn hoàn thành", required=False),
            "progress": progress,
            "completed": progress == 100,
            "createdAt": _now(),
            "updatedAt": _now(),
        }
        portal["goals"].insert(0, item)
        _save(database)
        return jsonify({"goal": item}), 201
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot create employee goal")


@employee_portal_api.put("/employee-portal/goals/<goal_id>")
@employee_required
def update_goal(goal_id: str):
    try:
        payload = _payload()
        progress = payload.get("progress", 0)
        if isinstance(progress, bool) or not isinstance(progress, int) or not 0 <= progress <= 100:
            raise ValueError("Tiến độ mục tiêu phải là số nguyên từ 0 đến 100.")
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        item = next((row for row in portal["goals"] if row.get("id") == goal_id), None)
        if item is None or item.get("userId") != _current_user()["id"]:
            return jsonify({"error": "Không tìm thấy mục tiêu."}), 404
        item.update(
            title=_text(payload, "title", "Tên mục tiêu", 120),
            description=_text(payload, "description", "Mô tả", 1000, required=False),
            dueDate=_iso_date(payload.get("dueDate"), "Hạn hoàn thành", required=False),
            progress=progress,
            completed=progress == 100,
            updatedAt=_now(),
        )
        _save(database)
        return jsonify({"goal": item})
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot update employee goal")


@employee_portal_api.delete("/employee-portal/goals/<goal_id>")
@employee_required
def delete_goal(goal_id: str):
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        item = next((row for row in portal["goals"] if row.get("id") == goal_id), None)
        if item is None or item.get("userId") != _current_user()["id"]:
            return jsonify({"error": "Không tìm thấy mục tiêu."}), 404
        portal["goals"].remove(item)
        _save(database)
        return jsonify({"ok": True})
    except RuntimeError as error:
        return _error(error, "Cannot delete employee goal")


@employee_portal_api.post("/employee-portal/training/<course_id>/enroll")
@employee_required
def enroll_training(course_id: str):
    if not any(course["id"] == course_id for course in TRAINING_COURSES):
        return jsonify({"error": "Không tìm thấy khóa học."}), 404
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        user_id = _current_user()["id"]
        existing = next(
            (row for row in portal["enrollments"] if row.get("userId") == user_id and row.get("courseId") == course_id),
            None,
        )
        if existing:
            return jsonify({"enrollment": existing})
        enrollment = {
            "id": _new_id("enroll"),
            "userId": user_id,
            "courseId": course_id,
            "status": "enrolled",
            "createdAt": _now(),
            "completedAt": None,
        }
        portal["enrollments"].insert(0, enrollment)
        _save(database)
        return jsonify({"enrollment": enrollment}), 201
    except RuntimeError as error:
        return _error(error, "Cannot enroll employee in training")


@employee_portal_api.patch("/employee-portal/training/<course_id>")
@employee_required
def update_training(course_id: str):
    if not any(course["id"] == course_id for course in TRAINING_COURSES):
        return jsonify({"error": "Không tìm thấy khóa học."}), 404
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        enrollment = next(
            (
                row for row in portal["enrollments"]
                if row.get("userId") == _current_user()["id"] and row.get("courseId") == course_id
            ),
            None,
        )
        if enrollment is None:
            return jsonify({"error": "Bạn chưa đăng ký khóa học này."}), 404
        enrollment["status"] = "completed"
        enrollment["completedAt"] = _now()
        _save(database)
        return jsonify({"enrollment": enrollment})
    except RuntimeError as error:
        return _error(error, "Cannot update training enrollment")


@employee_portal_api.post("/employee-portal/announcements/<announcement_id>/read")
@employee_required
def mark_announcement_read(announcement_id: str):
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        if not any(item.get("id") == announcement_id for item in portal["announcements"]):
            return jsonify({"error": "Không tìm thấy thông báo."}), 404
        user_id = _current_user()["id"]
        if not any(
            item.get("userId") == user_id and item.get("announcementId") == announcement_id
            for item in portal["announcementReads"]
        ):
            portal["announcementReads"].append({
                "userId": user_id,
                "announcementId": announcement_id,
                "readAt": _now(),
            })
            _save(database)
        return jsonify({"ok": True})
    except RuntimeError as error:
        return _error(error, "Cannot mark announcement as read")


@employee_portal_api.post("/employee-portal/feedback")
@employee_required
def submit_anonymous_feedback():
    try:
        payload = _payload()
        category = payload.get("category")
        rating = payload.get("rating")
        if category not in {"workload", "manager", "environment", "growth", "other"}:
            raise ValueError("Chủ đề góp ý không hợp lệ.")
        if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
            raise ValueError("Điểm đánh giá phải là số nguyên từ 1 đến 5.")
        message = _text(payload, "message", "Góp ý", 2000, required=False)
        if not message and rating == 3:
            raise ValueError("Hãy viết góp ý hoặc chọn mức đánh giá khác 3.")
        database = _database()
        portal = _portal(database)
        feedback = {
            "id": _new_id("feedback"),
            "category": category,
            "rating": rating,
            "message": message,
            "createdAt": _now(),
        }
        portal["feedback"].insert(0, feedback)
        _save(database)
        return jsonify({"ok": True}), 201
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot save anonymous employee feedback")


@employee_portal_api.route("/employee-portal/tasks", methods=["POST"])
@employee_required
def create_task():
    try:
        payload = _payload()
        priority = payload.get("priority", "normal")
        if priority not in {"low", "normal", "high"}:
            raise ValueError("Mức ưu tiên không hợp lệ.")
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        task = {
            "id": _new_id("task"),
            "userId": _current_user()["id"],
            "title": _text(payload, "title", "Tên việc cần làm", 120),
            "details": _text(payload, "details", "Ghi chú", 1000, required=False),
            "dueDate": _iso_date(payload.get("dueDate"), "Ngày nhắc", required=False),
            "priority": priority,
            "completed": False,
            "createdAt": _now(),
            "updatedAt": _now(),
        }
        portal["tasks"].insert(0, task)
        _save(database)
        return jsonify({"task": task}), 201
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot create employee task")


@employee_portal_api.patch("/employee-portal/tasks/<task_id>")
@employee_required
def update_task(task_id: str):
    try:
        payload = _payload()
        if not isinstance(payload.get("completed"), bool):
            raise ValueError("Trạng thái hoàn thành không hợp lệ.")
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        task = next((row for row in portal["tasks"] if row.get("id") == task_id), None)
        if task is None or task.get("userId") != _current_user()["id"]:
            return jsonify({"error": "Không tìm thấy công việc."}), 404
        task["completed"] = payload["completed"]
        task["updatedAt"] = _now()
        _save(database)
        return jsonify({"task": task})
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot update employee task")


@employee_portal_api.delete("/employee-portal/tasks/<task_id>")
@employee_required
def delete_task(task_id: str):
    try:
        from .auth_routes import _current_user

        database = _database()
        portal = _portal(database)
        task = next((row for row in portal["tasks"] if row.get("id") == task_id), None)
        if task is None or task.get("userId") != _current_user()["id"]:
            return jsonify({"error": "Không tìm thấy công việc."}), 404
        portal["tasks"].remove(task)
        _save(database)
        return jsonify({"ok": True})
    except RuntimeError as error:
        return _error(error, "Cannot delete employee task")


@employee_portal_api.post("/employee-portal/reviews")
@employee_required
def submit_self_review():
    try:
        payload = _payload()
        period = _text(payload, "period", "Kỳ đánh giá", 30)
        if not re.fullmatch(r"\d{4}-\d{2}", period):
            raise ValueError("Kỳ đánh giá cần có định dạng YYYY-MM.")
        try:
            date.fromisoformat(period + "-01")
        except ValueError as error:
            raise ValueError("Kỳ đánh giá cần có định dạng YYYY-MM.") from error
        ratings = payload.get("ratings")
        if not isinstance(ratings, dict) or set(ratings) != {"performance", "wellbeing", "growth"}:
            raise ValueError("Vui lòng đánh giá đủ hiệu quả, sức khỏe và cơ hội phát triển.")
        if any(isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5 for value in ratings.values()):
            raise ValueError("Mỗi điểm tự đánh giá phải là số nguyên từ 1 đến 5.")
        from .auth_routes import _current_user

        user = _current_user()
        database = _database()
        portal = _portal(database)
        review = next(
            (row for row in portal["reviews"] if row.get("userId") == user["id"] and row.get("period") == period),
            None,
        )
        is_new = review is None
        if review and review.get("status") == "submitted":
            return jsonify({"error": "Kỳ đánh giá này đã gửi và không thể sửa."}), 409
        if review is None:
            review = {
                "id": _new_id("review"),
                "userId": user["id"],
                "name": user["name"],
                "email": user["email"],
                "period": period,
                "createdAt": _now(),
                "adminNote": "",
            }
            portal["reviews"].insert(0, review)
        review.update(
            ratings=ratings,
            accomplishment=_text(payload, "accomplishment", "Kết quả nổi bật", 1500, required=False),
            challenge=_text(payload, "challenge", "Khó khăn", 1500, required=False),
            status="submitted" if payload.get("submit", True) else "draft",
            updatedAt=_now(),
        )
        _save(database)
        return jsonify({"review": review}), 201 if is_new else 200
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot save employee self-review")


@employee_portal_api.get("/admin/employee-portal")
@admin_required
def get_admin_employee_portal():
    try:
        database = _database()
        portal = _portal(database)
        return jsonify({
            "leaveRequests": portal["leaveRequests"],
            "feedback": portal["feedback"],
            "reviews": portal["reviews"],
            "announcements": portal["announcements"],
        })
    except RuntimeError as error:
        return _error(error, "Cannot load admin employee portal")


@employee_portal_api.post("/admin/employee-portal/announcements")
@admin_required
def create_announcement():
    try:
        payload = _payload()
        title = _text(payload, "title", "Tiêu đề", 120)
        body = _text(payload, "body", "Nội dung", 2000)
        database = _database()
        portal = _portal(database)
        announcement = {
            "id": _new_id("announcement"),
            "title": title,
            "body": body,
            "createdAt": _now(),
            "author": "Quản trị viên",
            "pinned": False,
        }
        portal["announcements"].insert(0, announcement)
        _save(database)
        return jsonify({"announcement": announcement}), 201
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot publish employee announcement")


@employee_portal_api.patch("/admin/employee-portal/reviews/<review_id>")
@admin_required
def review_self_assessment(review_id: str):
    try:
        payload = _payload()
        note = _text(payload, "adminNote", "Phản hồi", 1000)
        database = _database()
        portal = _portal(database)
        review = next((row for row in portal["reviews"] if row.get("id") == review_id), None)
        if review is None:
            return jsonify({"error": "Không tìm thấy phiếu tự đánh giá."}), 404
        review.update(status="reviewed", adminNote=note, reviewedAt=_now())
        _save(database)
        return jsonify({"review": review})
    except (ValueError, RuntimeError) as error:
        return _error(error, "Cannot review employee self-assessment")
