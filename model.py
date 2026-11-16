"""Employee risk estimation used by the StayWise demo API."""

import math
from typing import Any, Optional


FACTOR_LABELS = {
    "satisfaction": "Mức hài lòng",
    "balance": "Cân bằng công việc / cuộc sống",
    "overtime": "Số giờ làm thêm",
    "tenure": "Thâm niên",
    "salary": "Mức lương",
    "distance": "Khoảng cách đi làm",
}


def _number(value: Any, field: str, minimum: float, maximum: float, default: float) -> float:
    if value is None or value == "":
        return default
    try:
        number = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Trường {field} phải là số.") from error
    if not math.isfinite(number):
        raise ValueError(f"Trường {field} phải là số hữu hạn.")
    if not minimum <= number <= maximum:
        raise ValueError(f"Trường {field} phải nằm trong khoảng {minimum:g}–{maximum:g}.")
    return number


def normalize_employee(data: dict[str, Any], employee_id: Optional[str] = None) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("Mỗi hồ sơ nhân viên phải là một đối tượng.")
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Tên nhân viên không được để trống.")

    return {
        "id": employee_id or str(data.get("id") or ""),
        "name": name.strip(),
        "email": str(data.get("email") or "").strip(),
        "department": str(data.get("department") or "Khác").strip(),
        "role": str(data.get("role") or "Nhân viên").strip(),
        "tenure": _number(data.get("tenure"), "tenure", 0, 40, 0),
        "satisfaction": _number(data.get("satisfaction"), "satisfaction", 1, 5, 3),
        "salary": _number(data.get("salary"), "salary", 0, 1_000_000, 8000),
        "overtime": _number(data.get("overtime"), "overtime", 0, 100, 0),
        "distance": _number(data.get("distance"), "distance", 0, 1000, 0),
        "age": _number(data.get("age"), "age", 18, 90, 30),
        "balance": _number(data.get("balance"), "balance", 1, 5, 3),
    }


def predict_risk(data: dict[str, Any]) -> dict[str, Any]:
    employee = normalize_employee(data)
    effects = {
        "satisfaction": (3 - employee["satisfaction"]) * 0.7,
        "balance": (3 - employee["balance"]) * 0.52,
        "overtime": max(0, employee["overtime"] - 5) * 0.075,
        "tenure": max(0, 3 - employee["tenure"]) * 0.32,
        "salary": max(0, 12000 - employee["salary"]) / 12000 * 0.48,
        "distance": employee["distance"] * 0.015,
    }
    logit = -1.15 + sum(effects.values())
    score = math.floor(100 / (1 + math.exp(-logit)) + 0.5)
    employee["risk"] = min(96, max(4, score))
    employee["factors"] = [
        {"key": key, "label": FACTOR_LABELS[key], "effect": effect}
        for key, effect in effects.items()
    ]
    return employee
