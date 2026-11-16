# Đề tài 13: Dự đoán nhân viên có khả năng nghỉ việc (Employee Attrition)

* **Học phần:** Nhập môn Học máy (FIT4013)
* **Thành viên nhóm:** Nhóm 5

## Giới thiệu

StayWise là ứng dụng web minh họa cho đồ án môn Nhập môn Học máy. Mã nguồn được đặt trực tiếp trong thư mục dự án, không tách thành `frontend/` và `backend/`:

```text
index.html                Giao diện chính
styles.css                Điểm nạp các stylesheet
css/                      CSS chia theo từng trang/chức năng
js/                       JavaScript chia theo từng chức năng
app.py                    Điểm chạy Flask và phục vụ giao diện
auth_routes.py            Đăng nhập và API tài khoản/phân quyền
model.py                  Công thức ước tính rủi ro minh họa
storage.py                Lưu dữ liệu JSON cục bộ
employee_routes.py        API quản lý hồ sơ nhân viên
prediction_routes.py      API dự đoán và lịch sử
seed_data.py              Dữ liệu nhân viên mẫu
data/employees.json       Tự tạo khi chạy lần đầu
tests/                    Kiểm thử API
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
   python app.py
   ```

4. Mở <http://127.0.0.1:5000>.

Flask phục vụ giao diện và API trên cùng địa chỉ, nên trình duyệt không cần cấu hình CORS. Dữ liệu hồ sơ được lưu trong `data/employees.json`; tệp này được tạo tự động ở lần chạy đầu tiên. Dừng máy chủ bằng `Ctrl+C`.

## Tài khoản và phân quyền

1. Tạo tài khoản quản trị đầu tiên trong terminal dự án:

   ```powershell
   python -m flask --app app create-admin
   ```

   Lệnh sẽ hỏi email và mật khẩu (ít nhất 10 ký tự). Không có đăng ký admin công khai.
2. Mở ứng dụng, đăng nhập bằng tài khoản admin vừa tạo. Nhân viên có thể tự đăng ký bằng email và mật khẩu; ứng dụng tạo hồ sơ cá nhân mới cho tài khoản đó.
3. Admin vào **Tài khoản & yêu cầu** để xem danh sách tài khoản, khóa/mở khóa, cấp/hạ quyền admin và cập nhật trạng thái yêu cầu hỗ trợ.
4. Nhân viên có thể chỉnh sửa hồ sơ cá nhân, đổi mật khẩu, xem lịch sử dự đoán riêng và gửi yêu cầu hỗ trợ riêng tới admin.

Mật khẩu chỉ được lưu dưới dạng hash. Cookie phiên được đặt `HttpOnly` và `SameSite=Lax`; dùng `STAYWISE_SECRET_KEY` cố định khi triển khai để phiên không bị vô hiệu hóa sau khi khởi động lại, và bật `STAYWISE_COOKIE_SECURE=1` khi phục vụ qua HTTPS. Có thể đặt `STAYWISE_DATA_FILE` để chọn tệp JSON dữ liệu khác. Bản demo mặc định chỉ lắng nghe trên `127.0.0.1`; không triển khai trực tiếp ra Internet nếu chưa bổ sung các biện pháp bảo vệ vận hành phù hợp.

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
| `POST` | `/api/auth/register` | Đăng ký tài khoản nhân viên |
| `POST` | `/api/auth/login` | Đăng nhập |
| `POST` | `/api/auth/logout` | Đăng xuất |
| `GET` | `/api/auth/me` | Xem tài khoản đang đăng nhập |
| `PUT` | `/api/me` | Cập nhật hồ sơ nhân viên của mình |
| `POST` | `/api/me/password` | Đổi mật khẩu |
| `GET/POST` | `/api/me/predictions`, `/api/me/predict` | Xem lịch sử và dự đoán cá nhân |
| `GET` | `/api/admin/accounts` | Admin xem tài khoản |
| `PATCH` | `/api/admin/accounts/<id>` | Admin khóa/mở khóa và cấp/hạ quyền |
| `GET` | `/api/admin/support-requests` | Admin xem yêu cầu hỗ trợ |
| `PATCH` | `/api/admin/support-requests/<id>` | Admin cập nhật trạng thái yêu cầu |

## Chức năng giao diện

- Dashboard, danh sách nhân viên, tìm kiếm và lọc.
- Thêm/xóa hồ sơ, nhập CSV, xuất CSV và sao lưu JSON.
- Chỉnh sửa hồ sơ, sắp xếp theo tên/rủi ro/thâm niên, lọc và phân trang.
- Dự đoán nguy cơ, xem các yếu tố ảnh hưởng và gợi ý trao đổi.
- Admin có thể xem, thống kê, xuất CSV và xóa lịch sử dự đoán; lịch sử của nhân viên được tách riêng theo tài khoản.
- Phân tích dữ liệu, kế hoạch giữ chân và giải thích Logistic Regression.
- Đăng nhập/đăng ký nhân viên; hồ sơ cá nhân, đổi mật khẩu, lịch sử riêng và gửi yêu cầu hỗ trợ.
- Khu vực admin quản lý hồ sơ nhân viên, tài khoản, phân quyền và yêu cầu hỗ trợ.
- Thiết kế responsive cho máy tính và thiết bị di động.

## Định dạng CSV

Các cột cần thiết cho dữ liệu nhập: `name`, `department`, `role`, `tenure`, `satisfaction`, `salary`, `overtime`, `distance`. Có thể thêm `email`, `age`, `balance`. Hàng đầu tiên là tên cột; trường `name` là bắt buộc. Dùng nút **Tải tệp CSV mẫu** trong mục **Dữ liệu & báo cáo** để lấy tệp ví dụ.

## Giới hạn của mô hình hiện tại

Dữ liệu ban đầu là dữ liệu tổng hợp phục vụ học tập. `model.py` đang dùng công thức sigmoid có trọng số đặt trước để minh họa luồng API, không phải mô hình đã huấn luyện trên dữ liệu doanh nghiệp. Các chỉ số Accuracy, Precision, Recall và F1-score vì vậy không được giả lập. Không sử dụng kết quả cho quyết định nhân sự thực tế.
