# Đề tài 13: Dự đoán nhân viên có khả năng nghỉ việc (Employee Attrition)

* **Học phần:** Nhập môn Học máy (FIT4013)
* **Thành viên nhóm:** Nhóm 5

## Giới thiệu

StayWise là ứng dụng web minh họa cho đồ án môn Nhập môn Học máy, được tách thành frontend và backend:

```text
frontend/                 Giao diện HTML, CSS, JavaScript
  index.html
  app.js
  styles.css
  css/                    CSS chia theo từng trang/chức năng
backend/                  API Flask, xử lý rủi ro và dữ liệu
  app.py
  model.py
  seed_data.py
  data/employees.json     Tự tạo khi chạy lần đầu
requirements.txt
```

## Chạy lần đầu

Cần cài Python 3.10 trở lên.

1. Mở terminal ở thư mục dự án.
2. Tạo môi trường ảo và cài Flask:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   ```

3. Khởi động ứng dụng:

   ```powershell
   python -m backend.app
   ```

4. Mở <http://127.0.0.1:5000>.

Flask phục vụ giao diện trong `frontend/` và API trên cùng địa chỉ, nên trình duyệt không cần cấu hình CORS. Dữ liệu hồ sơ được lưu trong `backend/data/employees.json`; tệp này được tạo tự động ở lần chạy đầu tiên. Dừng máy chủ bằng `Ctrl+C`.

## API chính

| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra trạng thái backend |
| `GET` | `/api/employees` | Lấy danh sách nhân viên |
| `POST` | `/api/employees` | Thêm hồ sơ |
| `DELETE` | `/api/employees/<id>` | Xóa hồ sơ |
| `POST` | `/api/employees/import` | Nhập nhiều hồ sơ |
| `POST` | `/api/predict` | Ước tính rủi ro nghỉ việc |
| `POST` | `/api/reset` | Khôi phục dữ liệu mẫu |

## Chức năng giao diện

- Dashboard, danh sách nhân viên, tìm kiếm và lọc.
- Thêm/xóa hồ sơ, nhập CSV, xuất CSV và sao lưu JSON.
- Dự đoán nguy cơ, xem các yếu tố ảnh hưởng và gợi ý trao đổi.
- Phân tích dữ liệu, kế hoạch giữ chân và giải thích Logistic Regression.
- Thiết kế responsive cho máy tính và thiết bị di động.

## Định dạng CSV

Các cột cần thiết cho dữ liệu nhập: `name`, `department`, `role`, `tenure`, `satisfaction`, `salary`, `overtime`, `distance`. Có thể thêm `email`, `age`, `balance`. Hàng đầu tiên là tên cột; trường `name` là bắt buộc. Dùng nút **Tải tệp CSV mẫu** trong mục **Dữ liệu & báo cáo** để lấy tệp ví dụ.

## Giới hạn của mô hình hiện tại

Dữ liệu ban đầu là dữ liệu tổng hợp phục vụ học tập. `backend/model.py` đang dùng công thức sigmoid có trọng số đặt trước để minh họa luồng API, không phải mô hình đã huấn luyện trên dữ liệu doanh nghiệp. Các chỉ số Accuracy, Precision, Recall và F1-score vì vậy không được giả lập. Không sử dụng kết quả cho quyết định nhân sự thực tế.
