# StayWise — Cổng Nhân Sự & Dự Báo Rủi Ro Nghỉ Việc

Ứng dụng web **StayWise** (phiên bản React + TypeScript + Vite) phục vụ quản trị nhân sự, dự báo nguy cơ nghỉ việc bằng mô hình Logistic Regression, mô phỏng kịch bản giữ chân nhân tài và cổng tiện ích dành cho nhân viên.

---

## Tính năng chính

### 1. Xác thực & Cổng tài khoản
- **Đăng nhập / Tạo tài khoản mới**: Hỗ trợ chọn vai trò Quản trị viên (`admin`) hoặc Nhân viên (`employee`), đăng nhập nhanh tài khoản mẫu và **nút xem/ẩn mật khẩu** (`Eye` / `EyeOff`).
- **Menu Avatar tương tác**: Bấm vào avatar ở thanh trên cùng hoặc thanh bên để truy cập nhanh:
  - Quản lý tài khoản & thông tin cá nhân
  - Đổi ảnh đại diện (tải ảnh lên hoặc chọn avatar mặc định)
  - Đổi mật khẩu & thu hồi các phiên đăng nhập khác
  - Nhật ký hoạt động bảo mật tài khoản
  - Tải dữ liệu cá nhân dạng JSON

### 2. Phân hệ Quản trị viên (Admin)
- **Tổng quan rủi ro nhân sự**: Thống kê KPI theo phòng ban, danh sách nhân sự có nguy cơ nghỉ việc cao cần ưu tiên can thiệp.
- **Thư mục nhân sự (CRUD + CSV)**: Thêm, sửa, xóa nhân viên; tìm kiếm, lọc theo phòng ban/mức rủi ro; **nhập và xuất dữ liệu CSV**.
- **Phòng mô phỏng What-If (`PredictionLab`)**: Thử thay đổi mức hài lòng, giờ làm thêm, lương, thâm niên... để quan sát điểm rủi ro thay đổi theo thời gian thực.
- **Phòng thí nghiệm Mô hình & Trọng số ML (`ModelLab`)**:
  - Thanh trượt điều chỉnh ngưỡng phân loại (**Decision Threshold 30%–85%**).
  - Tinh chỉnh 6 trọng số đặc trưng Logistic Regression (`satisfaction`, `balance`, `overtime`, `tenure`, `salary`, `distance`).
  - Tính trực tiếp **Ma trận nhầm lẫn (TP/FP/TN/FN)** và **Accuracy, Precision, Recall, F1-Score**; áp dụng trọng số cho toàn hệ thống.
- **Phân tích Rủi ro & Chi phí ROI (`AnalyticsRoi`)**: Ước tính chi phí thay thế nhân sự, số tiền tiết kiệm dự kiến theo tỷ lệ giữ chân mục tiêu, phân nhóm Cohort theo thâm niên/khung lương và hỗ trợ in báo cáo.
- **Kế hoạch giữ chân & Phê duyệt**: Quản lý kế hoạch can thiệp nhân sự, duyệt đơn nghỉ phép, quản lý tài khoản, thông báo nội bộ, góp ý ẩn danh và tự đánh giá.
- **Trung tâm Thông báo trên Topbar**: Cảnh báo nhân sự rủi ro cao chưa có kế hoạch, đơn nghỉ phép chờ duyệt, thông báo chưa đọc và công việc cần xử lý.

### 3. Phân hệ Nhân viên (Employee)
- **Tiện ích nhân viên**: Theo dõi **số ngày phép năm còn lại**, nộp đơn nghỉ phép, quản lý công việc, khóa học phát triển kỹ năng, gửi góp ý ẩn danh và tự đánh giá định kỳ.
- **Pulse Survey hàng tuần**: Check-in mức độ hài lòng, cân bằng cuộc sống và khối lượng công việc để cập nhật điểm rủi ro cá nhân.
- **Lịch sử của tôi**: Xem lại lịch sử dự đoán rủi ro, đơn nghỉ phép, mục tiêu cá nhân và phản hồi.

---

## Công nghệ sử dụng
- **Frontend**: React 19, TypeScript, Vite
- **Styling & Icons**: Tailwind CSS v4, Lucide React
- **Lưu trữ trạng thái**: `localStorage` phía trình duyệt

---

## Tài khoản mẫu dùng thử

| Vai trò | Email | Mật khẩu mặc định |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@staywise.vn` | `Admin@StayWise2026` |
| **Nhân viên (Employee)** | `minhanh.nguyen@staywise.vn` | Bất kỳ (từ 10 ký tự) hoặc dùng nút **Vào quyền Nhân viên** |

---

## Cài đặt và chạy dự án

Yêu cầu máy đã cài **Node.js (>= 18)**.

```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Chạy server phát triển (mặc định tại http://localhost:3000)
npm run dev

# 3. Kiểm tra kiểu TypeScript
npm run lint

# 4. Build bản production
npm run build
```

---

## Hướng dẫn đẩy mã nguồn lên GitHub

### Đẩy lên nhánh mới của repo nhóm (giữ nguyên code Flask trên `main`)
```bash
git clone https://github.com/khongphailatu123/Bai-tap-lon-nhap-mon-hoc-may-nhom-5.git
# Chép toàn bộ thư mục dự án React này vào nhánh mới hoặc thư mục con
git checkout -b staywise-react-portal
git add .
git commit -m "feat: add StayWise React portal and README"
git push -u origin staywise-react-portal
```

### Hoặc đẩy lên một repository mới
```bash
git init
git add .
git commit -m "Initial commit: StayWise HR Portal"
git branch -M main
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```
