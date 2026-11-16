"""Prediction and prediction-history API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Any

from flask import Blueprint, current_app, jsonify, request

from auth_routes import admin_required
from employee_routes import _employees
from model import predict_risk
from storage import read_database, save_database


prediction_api = Blueprint("predictions", __name__, url_prefix="/api")


def _request_object() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Nội dung gửi lên phải là JSON dạng đối tượng.")
    return payload


@prediction_api.get("/predictions")
@admin_required
def get_predictions():
    try:
        database = read_database(_employees())
        return jsonify({"history": database["predictions"]})
    except RuntimeError as error:
        current_app.logger.exception("Cannot read prediction history")
        return jsonify({"error": str(error)}), 500


@prediction_api.post("/predict")
@admin_required
def predict():
    try:
        prediction = predict_risk(_request_object())
        prediction["id"] = f"pr-{uuid.uuid4().hex[:12]}"
        prediction["createdAt"] = datetime.now(timezone.utc).isoformat()
        database = read_database(_employees())
        database["predictions"].insert(0, prediction)
        database["predictions"] = database["predictions"][:200]
        updated = save_database(
            database["employees"], database["predictions"],
            database["users"], database["supportRequests"],
        )
        return jsonify({
            "prediction": prediction,
            "history": updated["predictions"],
            "updatedAt": updated["updatedAt"],
        })
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except RuntimeError as error:
        current_app.logger.exception("Cannot store prediction")
        return jsonify({"error": str(error)}), 500


@prediction_api.delete("/predictions")
@admin_required
def clear_predictions():
    try:
        database = read_database(_employees())
        updated = save_database(
            database["employees"], [],
            database["users"], database["supportRequests"],
        )
        return jsonify({"history": [], "updatedAt": updated["updatedAt"]})
    except RuntimeError as error:
        current_app.logger.exception("Cannot clear prediction history")
        return jsonify({"error": str(error)}), 500
