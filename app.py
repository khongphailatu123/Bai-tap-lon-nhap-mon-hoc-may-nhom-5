"""Flask application entry point for StayWise."""

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

import click
from flask import Flask, jsonify, send_from_directory
from werkzeug.security import generate_password_hash

from auth_routes import EMAIL_PATTERN, auth_api
from employee_routes import employee_api
from model import normalize_employee, predict_risk
from prediction_routes import prediction_api
from seed_data import SAMPLE_EMPLOYEES
from storage import read_database, save_database


ROOT_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.secret_key = os.environ.get("STAYWISE_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("STAYWISE_COOKIE_SECURE") == "1",
    PERMANENT_SESSION_LIFETIME=60 * 60 * 12,
)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
app.register_blueprint(auth_api)
app.register_blueprint(employee_api)
app.register_blueprint(prediction_api)


def _seed_employees():
    employees = []
    for data in SAMPLE_EMPLOYEES:
        employee = normalize_employee(data)
        employee["risk"] = predict_risk(employee)["risk"]
        employees.append(employee)
    return employees


def _initial_database():
    return save_database(_seed_employees(), [], [], [])


@app.cli.command("create-admin")
def create_admin():
    """Create an administrator account without a public registration route."""
    email = click.prompt("Email admin").strip().casefold()
    password = click.prompt("Mật khẩu admin", hide_input=True, confirmation_prompt=True)
    if not EMAIL_PATTERN.fullmatch(email) or len(email) > 254:
        raise click.ClickException("Email admin không hợp lệ.")
    if not 10 <= len(password) <= 128:
        raise click.ClickException("Mật khẩu admin phải có từ 10 đến 128 ký tự.")
    database = read_database(_seed_employees())
    if any(user.get("email") == email for user in database["users"]):
        raise click.ClickException("Email này đã có tài khoản.")
    user = {
        "id": secrets.token_hex(12),
        "email": email,
        "name": "Quản trị viên",
        "role": "admin",
        "active": True,
        "passwordHash": generate_password_hash(password),
        "sessionVersion": 0,
        "employeeId": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    database["users"].append(user)
    save_database(
        database["employees"],
        database["predictions"],
        database["users"],
        database["supportRequests"],
    )
    click.echo(f"Đã tạo tài khoản admin: {email}")


@app.get("/")
def home():
    return send_from_directory(ROOT_DIR, "index.html")


@app.get("/<path:asset_path>")
def frontend_asset(asset_path: str):
    if asset_path != "styles.css" and not asset_path.startswith(("css/", "js/")):
        return jsonify({"error": "Không tìm thấy tệp."}), 404
    return send_from_directory(ROOT_DIR, asset_path)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "Dữ liệu gửi lên vượt giới hạn 2 MB."}), 413


if __name__ == "__main__":
    from storage import DATABASE_FILE

    if not DATABASE_FILE.exists():
        _initial_database()
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)
