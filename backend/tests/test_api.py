import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import storage
from backend.app import app
from werkzeug.security import generate_password_hash


class StayWiseApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temporary_directory.name) / "employees.json"
        self.database_patch = patch.object(storage, "DATABASE_FILE", self.database_path)
        self.database_patch.start()
        storage.save_database([], [], [{
            "id": "admin-test",
            "email": "admin@example.com",
            "name": "Admin kiểm thử",
            "role": "admin",
            "active": True,
            "employeeId": None,
            "passwordHash": generate_password_hash("admin-password-123"),
            "sessionVersion": 0,
            "createdAt": "2026-01-01T00:00:00+00:00",
        }], [])
        self.client = app.test_client()
        self.client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin-password-123",
        })

    def tearDown(self):
        self.database_patch.stop()
        self.temporary_directory.cleanup()

    def test_employee_create_update_and_delete(self):
        created = self.client.post("/api/employees", json={
            "name": "Kiểm thử API",
            "department": "Kỹ thuật",
            "role": "Chuyên viên",
            "tenure": 2,
            "satisfaction": 4,
            "salary": 10000,
            "overtime": 5,
            "distance": 8,
            "age": 29,
            "balance": 4,
        })
        self.assertEqual(created.status_code, 201)
        employee = created.get_json()["employee"]
        self.assertIn("risk", employee)

        updated = self.client.put(
            f"/api/employees/{employee['id']}",
            json={"name": "Đã cập nhật", "satisfaction": 5},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["employee"]["name"], "Đã cập nhật")

        deleted = self.client.delete(f"/api/employees/{employee['id']}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.delete("/api/employees/unknown").status_code, 404)

    def test_prediction_is_saved_and_can_be_cleared(self):
        response = self.client.post("/api/predict", json={
            "name": "Người kiểm thử",
            "department": "Kỹ thuật",
            "tenure": 1,
            "satisfaction": 1,
            "salary": 7000,
            "overtime": 18,
            "distance": 20,
            "age": 28,
            "balance": 2,
        })
        self.assertEqual(response.status_code, 200)
        prediction = response.get_json()["prediction"]
        self.assertGreaterEqual(prediction["risk"], 4)
        self.assertIn("createdAt", prediction)
        self.assertEqual(len(self.client.get("/api/predictions").get_json()["history"]), 1)

        cleared = self.client.delete("/api/predictions")
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(cleared.get_json()["history"], [])

    def test_invalid_prediction_fields_return_validation_error(self):
        response = self.client.post("/api/predict", json={
            "name": "Hồ sơ không hợp lệ",
            "satisfaction": 7,
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("satisfaction", response.get_json()["error"])

    def test_api_requires_admin_and_registration_creates_employee_only(self):
        anonymous = app.test_client()
        self.assertEqual(anonymous.get("/api/employees").status_code, 401)
        self.assertEqual(anonymous.post("/api/employees", json={"name": "No auth"}).status_code, 401)

        registered = anonymous.post("/api/auth/register", json={
            "name": "Nhân viên mới",
            "email": "New.Employee@Example.com",
            "department": "Kỹ thuật",
            "password": "employee-password-123",
            "role": "admin",
        })
        self.assertEqual(registered.status_code, 201)
        result = registered.get_json()
        self.assertEqual(result["user"]["role"], "employee")
        self.assertEqual(result["employee"]["email"], "new.employee@example.com")
        self.assertEqual(anonymous.get("/api/employees").status_code, 403)
        self.assertEqual(anonymous.get("/api/predictions").status_code, 403)
        self.assertEqual(anonymous.post("/api/predict", json={"name": "Không được phép"}).status_code, 403)
        self.assertEqual(anonymous.get("/api/admin/accounts").status_code, 403)
        self.assertEqual(anonymous.get("/api/me/predictions").status_code, 200)

        database = storage.read_database([])
        stored_user = next(user for user in database["users"] if user["email"] == "new.employee@example.com")
        self.assertNotEqual(stored_user["passwordHash"], "employee-password-123")
        self.assertEqual(anonymous.post("/api/auth/register", json={
            "name": "Trùng email",
            "email": "NEW.EMPLOYEE@example.com",
            "password": "employee-password-123",
        }).status_code, 409)

    def test_employee_profile_password_support_and_private_history(self):
        employee_client = app.test_client()
        registered = employee_client.post("/api/auth/register", json={
            "name": "Nhân viên riêng",
            "email": "private@example.com",
            "password": "private-password-123",
        })
        employee_id = registered.get_json()["user"]["id"]
        self.assertEqual(employee_client.get("/api/predictions").status_code, 403)
        self.assertEqual(employee_client.post("/api/predict", json={"name": "Không được phép"}).status_code, 403)
        updated = employee_client.put("/api/me", json={
            "name": "Tên đã đổi",
            "email": "private@example.com",
            "department": "Vận hành",
            "tenure": 2,
            "satisfaction": 4,
            "salary": 10000,
            "overtime": 3,
            "distance": 8,
            "age": 29,
            "balance": 4,
        })
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["employee"]["name"], "Tên đã đổi")

        prediction = employee_client.post("/api/me/predict", json={})
        self.assertEqual(prediction.status_code, 200)
        self.assertEqual(len(employee_client.get("/api/me/predictions").get_json()["history"]), 1)
        other_employee = app.test_client()
        other_employee.post("/api/auth/register", json={
            "name": "Nhân viên khác",
            "email": "other@example.com",
            "password": "other-employee-password",
        })
        self.assertEqual(len(other_employee.get("/api/me/predictions").get_json()["history"]), 0)

        support = employee_client.post("/api/me/support-requests", json={
            "subject": "Cần hỗ trợ",
            "message": "Xin trao đổi riêng.",
        })
        self.assertEqual(support.status_code, 201)
        self.assertEqual(len(employee_client.get("/api/me/support-requests").get_json()["requests"]), 1)
        previous_session = app.test_client()
        previous_session.post("/api/auth/login", json={
            "email": "private@example.com",
            "password": "private-password-123",
        })
        self.assertEqual(employee_client.post("/api/me/password", json={
            "currentPassword": "private-password-123",
            "newPassword": "updated-password-456",
        }).status_code, 200)
        self.assertEqual(employee_client.get("/api/auth/me").status_code, 200)
        self.assertIsNone(previous_session.get("/api/auth/me").get_json()["user"])

        self.assertEqual(self.client.get("/api/admin/accounts").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/support-requests").get_json()["requests"][0]["subject"], "Cần hỗ trợ")
        self.assertEqual(self.client.delete(f"/api/employees/{registered.get_json()['employee']['id']}").status_code, 409)
        self.assertEqual(self.client.patch(f"/api/admin/accounts/{employee_id}", json={
            "active": False,
            "role": "employee",
        }).status_code, 200)
        self.assertIsNone(employee_client.get("/api/auth/me").get_json()["user"])
        accounts = self.client.get("/api/admin/accounts").get_json()["accounts"]
        user = next(account for account in accounts if account["id"] == employee_id)
        self.assertFalse(user["active"])

    def test_admin_can_update_own_account_and_export_private_data(self):
        updated = self.client.put("/api/me", json={
            "name": "Admin mới",
            "email": "updated.admin@example.com",
        })
        self.assertEqual(updated.status_code, 200)
        self.assertIsNone(updated.get_json()["employee"])
        self.assertEqual(updated.get_json()["user"]["name"], "Admin mới")
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["email"], "updated.admin@example.com")
        self.assertEqual(self.client.put("/api/me", json={
            "email": "invalid-email",
        }).status_code, 400)
        export = self.client.get("/api/me/export")
        self.assertEqual(export.status_code, 200)
        self.assertEqual(export.get_json()["account"]["id"], "admin-test")
        self.assertNotIn("passwordHash", export.get_json()["account"])
        self.assertIsNone(export.get_json()["employeeProfile"])

    def test_avatar_upload_validation_and_removal(self):
        invalid = self.client.put("/api/me/avatar", json={
            "image": "data:image/svg+xml;base64,PHN2Zy8+",
        })
        self.assertEqual(invalid.status_code, 400)
        invalid_signature = self.client.put("/api/me/avatar", json={
            "image": "data:image/png;base64,YWJj",
        })
        self.assertEqual(invalid_signature.status_code, 400)

        png_data_url = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII="
        )
        uploaded = self.client.put("/api/me/avatar", json={"image": png_data_url})
        self.assertEqual(uploaded.status_code, 200)
        self.assertEqual(uploaded.get_json()["user"]["avatarDataUrl"], png_data_url)
        exported = self.client.get("/api/me/export").get_json()
        self.assertEqual(exported["account"]["avatarDataUrl"], png_data_url)
        self.assertNotIn("passwordHash", exported["account"])
        listed_account = self.client.get("/api/admin/accounts").get_json()["accounts"][0]
        self.assertNotIn("avatarDataUrl", listed_account)

        removed = self.client.put("/api/me/avatar", json={"image": None})
        self.assertEqual(removed.status_code, 200)
        self.assertIsNone(removed.get_json()["user"]["avatarDataUrl"])

    def test_revoke_other_sessions_keeps_current_session_active(self):
        other_session = app.test_client()
        self.assertEqual(other_session.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin-password-123",
        }).status_code, 200)

        self.assertEqual(self.client.post("/api/me/sessions/revoke-others").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me").get_json()["user"]["id"], "admin-test")
        self.assertIsNone(other_session.get("/api/auth/me").get_json()["user"])

    def test_employee_data_export_contains_only_its_own_records(self):
        first_employee = app.test_client()
        registered = first_employee.post("/api/auth/register", json={
            "name": "Nhân viên xuất dữ liệu",
            "email": "export@example.com",
            "password": "export-password-123",
        })
        user_id = registered.get_json()["user"]["id"]
        first_employee.post("/api/me/predict", json={})
        first_employee.post("/api/me/support-requests", json={
            "subject": "Yêu cầu riêng",
            "message": "Dữ liệu chỉ thuộc tài khoản này.",
        })

        second_employee = app.test_client()
        second_employee.post("/api/auth/register", json={
            "name": "Nhân viên khác",
            "email": "other-export@example.com",
            "password": "other-export-password",
        })
        export = first_employee.get("/api/me/export")
        self.assertEqual(export.status_code, 200)
        data = export.get_json()
        self.assertEqual(data["account"]["id"], user_id)
        self.assertEqual(len(data["predictions"]), 1)
        self.assertEqual(len(data["supportRequests"]), 1)
        self.assertTrue(all(item["userId"] == user_id for item in data["predictions"]))
        self.assertTrue(all(item["userId"] == user_id for item in data["supportRequests"]))
        self.assertNotIn("passwordHash", data["account"])

    def test_admin_account_controls_preserve_one_active_admin(self):
        self_disabled = self.client.patch("/api/admin/accounts/admin-test", json={
            "active": False,
            "role": "employee",
        })
        self.assertEqual(self_disabled.status_code, 400)

        database = storage.read_database([])
        database["users"].append({
            "id": "second-admin",
            "email": "second-admin@example.com",
            "name": "Admin thứ hai",
            "role": "admin",
            "active": True,
            "employeeId": None,
            "passwordHash": generate_password_hash("second-admin-password"),
            "sessionVersion": 0,
            "createdAt": "2026-01-01T00:00:00+00:00",
        })
        storage.save_database(
            database["employees"], database["predictions"],
            database["users"], database["supportRequests"],
        )
        second_admin = app.test_client()
        second_admin.post("/api/auth/login", json={
            "email": "second-admin@example.com",
            "password": "second-admin-password",
        })
        last_admin = second_admin.patch("/api/admin/accounts/admin-test", json={
            "active": False,
            "role": "employee",
        })
        self.assertEqual(last_admin.status_code, 200)
        remaining_admin = next(
            item for item in second_admin.get("/api/admin/accounts").get_json()["accounts"]
            if item["id"] == "second-admin"
        )
        self.assertEqual(remaining_admin["role"], "admin")
        self.assertTrue(remaining_admin["active"])
        database = storage.read_database([])
        demoted = next(item for item in database["users"] if item["id"] == "admin-test")
        self.assertIsNotNone(demoted["employeeId"])
        self.assertTrue(any(item["id"] == demoted["employeeId"] for item in database["employees"]))
        self.assertEqual(second_admin.get("/api/admin/accounts").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/accounts").status_code, 401)

    def test_reset_preserves_employee_accounts_and_linked_profiles(self):
        employee_client = app.test_client()
        registered = employee_client.post("/api/auth/register", json={
            "name": "Giữ hồ sơ",
            "email": "keep@example.com",
            "password": "keep-profile-password",
        })
        employee_id = registered.get_json()["employee"]["id"]
        response = self.client.post("/api/reset")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["id"] == employee_id for item in response.get_json()["employees"]))
        self.assertEqual(employee_client.get("/api/auth/me").get_json()["employee"]["id"], employee_id)

    def test_create_admin_command_hashes_password(self):
        result = app.test_cli_runner().invoke(args=["create-admin"], input=(
            "cli.admin@example.com\n"
            "cli-admin-password-123\n"
            "cli-admin-password-123\n"
        ))
        self.assertEqual(result.exit_code, 0, result.output)
        database = storage.read_database([])
        account = next(user for user in database["users"] if user["email"] == "cli.admin@example.com")
        self.assertEqual(account["role"], "admin")
        self.assertNotEqual(account["passwordHash"], "cli-admin-password-123")


if __name__ == "__main__":
    unittest.main()
