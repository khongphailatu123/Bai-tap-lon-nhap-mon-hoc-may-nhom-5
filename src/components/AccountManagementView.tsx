import React, { useEffect, useState } from 'react';
import {
  EmployeeProfile,
  SecurityActivityItem,
  UserAccount,
} from '../types/staywise';
import { formatDateTimeVi, formatDateVi, riskLabel, riskLevel } from '../utils/staywiseModel';
import { AvatarDisplay } from './AvatarDisplay';

interface AccountManagementViewProps {
  user: UserAccount;
  employee: EmployeeProfile;
  predictionCount: number;
  securityLogs: SecurityActivityItem[];
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  onUpdateProfile: (updates: {
    name: string;
    email: string;
    department: string;
    tenure: number;
    age: number;
    salary: number;
    overtime: number;
    distance: number;
    satisfaction: number;
    balance: number;
  }) => void;
  onTriggerAvatarUpload: () => void;
  onRemoveAvatar: () => void;
  onChangePassword: (currentPassword: string, newPassword: string) => boolean;
  onRequestRevokeSessions: () => void;
  onExportMyData: () => void;
  onNotify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountManagementView: React.FC<AccountManagementViewProps> = ({
  user,
  employee,
  predictionCount,
  securityLogs,
  passwordInputRef,
  onUpdateProfile,
  onTriggerAvatarUpload,
  onRemoveAvatar,
  onChangePassword,
  onRequestRevokeSessions,
  onExportMyData,
  onNotify,
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(employee.department);
  const [tenure, setTenure] = useState(String(employee.tenure));
  const [age, setAge] = useState(String(employee.age));
  const [salary, setSalary] = useState(String(employee.salary));
  const [overtime, setOvertime] = useState(String(employee.overtime));
  const [distance, setDistance] = useState(String(employee.distance));
  const [satisfaction, setSatisfaction] = useState(String(employee.satisfaction));
  const [balance, setBalance] = useState(String(employee.balance));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setDepartment(employee.department);
    setTenure(String(employee.tenure));
    setAge(String(employee.age));
    setSalary(String(employee.salary));
    setOvertime(String(employee.overtime));
    setDistance(String(employee.distance));
    setSatisfaction(String(employee.satisfaction));
    setBalance(String(employee.balance));
  }, [user, employee]);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      onNotify('Vui lòng nhập đầy đủ họ tên và email.', 'error');
      return;
    }
    onUpdateProfile({
      name: name.trim(),
      email: email.trim(),
      department: department.trim() || 'Khác',
      tenure: Math.min(40, Math.max(0, Number(tenure) || 0)),
      age: Math.min(90, Math.max(18, Number(age) || 25)),
      salary: Math.min(1000000, Math.max(0, Number(salary) || 0)),
      overtime: Math.min(100, Math.max(0, Number(overtime) || 0)),
      distance: Math.min(1000, Math.max(0, Number(distance) || 0)),
      satisfaction: Math.min(5, Math.max(1, Number(satisfaction) || 3)),
      balance: Math.min(5, Math.max(1, Number(balance) || 3)),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      onNotify('Mật khẩu mới phải có ít nhất 10 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('Mật khẩu mới nhập lại chưa khớp.', 'error');
      return;
    }
    const ok = onChangePassword(currentPassword, newPassword);
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const isAdmin = user.role === 'admin';
  const currentLevel = riskLevel(employee.risk);
  const riskColorClass =
    currentLevel === 'high'
      ? 'text-[#dc2626]'
      : currentLevel === 'medium'
        ? 'text-[#d97706]'
        : 'text-[#16a34a]';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
          Cài đặt cá nhân
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
          Quản lý tài khoản
        </h1>
        <p className="text-sm text-[#74788d]">
          {isAdmin
            ? 'Cập nhật thông tin quản trị viên, ảnh đại diện và thiết lập bảo mật tài khoản.'
            : 'Cập nhật thông tin hồ sơ, ảnh đại diện và thiết lập bảo mật cho tài khoản nhân viên của bạn.'}
        </p>
      </div>

      {/* Summary metrics strip (employee only) */}
      {!isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#eceef4] bg-white p-5">
            <p className="text-xs font-medium text-[#74788d]">
              Mức rủi ro tham khảo hiện tại
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className={`font-mono-num text-3xl font-bold ${riskColorClass}`}>
                {employee.risk}%
              </span>
              <span className="text-xs font-medium text-[#52576c]">
                {riskLabel(currentLevel)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#8b8fa3]">
              Tự động cập nhật khi bạn thay đổi thông số công việc bên dưới.
            </p>
          </div>

          <div className="rounded-xl border border-[#eceef4] bg-white p-5">
            <p className="text-xs font-medium text-[#74788d]">
              Lịch sử phân tích cá nhân
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-mono-num text-3xl font-bold text-[#6f5ce8]">
                {predictionCount}
              </span>
              <span className="text-xs font-medium text-[#52576c]">
                lần dự đoán đã lưu
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#8b8fa3]">
              Thuộc hồ sơ nhân viên {employee.id} · {employee.department}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left main column */}
        <div className="space-y-5 lg:col-span-7">
          {/* Avatar Card */}
          <section className="flex flex-col gap-4 rounded-xl border border-[#eceef4] bg-white p-5 sm:flex-row sm:items-center">
            <AvatarDisplay name={user.name} avatarUrl={user.avatarDataUrl} size="xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="text-sm font-bold text-[#20243a]">Ảnh đại diện</h2>
              <p className="text-xs text-[#74788d]">
                Hỗ trợ PNG, JPEG hoặc WebP, dung lượng tối đa 512 KB.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onTriggerAvatarUpload}
                  className="rounded-lg border border-[#d9dcf0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:bg-[#f7f6ff] hover:text-[#5542d2] whitespace-nowrap"
                >
                  Chọn ảnh mới
                </button>
                <button
                  type="button"
                  disabled={!user.avatarDataUrl}
                  onClick={onRemoveAvatar}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#6f5ce8] transition-colors hover:bg-[#f4f2ff] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                >
                  Xóa ảnh
                </button>
              </div>
              <p className="text-[11px] text-[#8b8fa3]">
                {user.avatarDataUrl
                  ? 'Ảnh hiển thị đồng bộ ở thanh trên cùng và thanh bên.'
                  : 'Đang dùng chữ viết tắt từ họ tên của bạn.'}
              </p>
            </div>
          </section>

          {/* Profile Form */}
          <form
            onSubmit={handleProfileSubmit}
            className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5"
          >
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                {isAdmin ? 'Thông tin tài khoản' : 'Thông tin tài khoản & công việc'}
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                {isAdmin
                  ? 'Đổi tên hiển thị hoặc email đăng nhập của tài khoản quản trị.'
                  : 'Cập nhật họ tên, email đăng nhập và các thông số hồ sơ cá nhân.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Họ tên <span className="text-[#dc2626]">*</span>
                </span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Email đăng nhập <span className="text-[#dc2626]">*</span>
                </span>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              {!isAdmin && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-[#393d51]">Phòng ban</span>
                <input
                  type="text"
                  maxLength={80}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Thâm niên (năm)
                </span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  step={0.1}
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">Tuổi</span>
                <input
                  type="number"
                  min={18}
                  max={90}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Lương tháng (USD)
                </span>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Giờ làm thêm / tuần
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Khoảng cách đi làm (km)
                </span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Mức hài lòng (1–5)
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={satisfaction}
                  onChange={(e) => setSatisfaction(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#393d51]">
                  Cân bằng công việc (1–5)
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="rounded-lg bg-[#6f5ce8] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>

        {/* Right security & metadata column */}
        <div className="space-y-5 lg:col-span-5">
          {/* Account details */}
          <section className="space-y-3.5 rounded-xl border border-[#eceef4] bg-white p-5">
            <h2 className="text-sm font-bold text-[#20243a]">Chi tiết tài khoản</h2>
            <dl className="divide-y divide-[#f1f2f7] text-xs">
              <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-[#74788d]">Vai trò</dt>
                <dd className="font-semibold text-[#20243a]">
                  {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[#74788d]">Ngày tạo tài khoản</dt>
                <dd className="font-mono-num font-medium text-[#20243a]">
                  {formatDateVi(user.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-[#74788d]">Email đăng nhập</dt>
                <dd className="truncate font-medium text-[#20243a]">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                <dt className="text-[#74788d]">Đổi mật khẩu gần nhất</dt>
                <dd className="font-mono-num text-[#52576c]">
                  {formatDateTimeVi(user.lastPasswordChangeAt)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Change password */}
          <form
            id="password-section"
            onSubmit={handlePasswordSubmit}
            className="space-y-3.5 rounded-xl border border-[#eceef4] bg-white p-5"
          >
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">Đổi mật khẩu</h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Sử dụng mật khẩu dài tối thiểu 10 ký tự để bảo vệ tài khoản.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#393d51]">
                Mật khẩu hiện tại
              </span>
              <input
                ref={passwordInputRef}
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#393d51]">Mật khẩu mới</span>
              <input
                type="password"
                required
                minLength={10}
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Ít nhất 10 ký tự"
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#393d51]">
                Nhập lại mật khẩu mới
              </span>
              <input
                type="password"
                required
                minLength={10}
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Xác nhận mật khẩu mới"
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg border border-[#d9dcf0] bg-white px-4 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:bg-[#f7f6ff] hover:text-[#5542d2] whitespace-nowrap"
            >
              Cập nhật mật khẩu
            </button>
          </form>

          {/* Session revocation & personal data */}
          <section className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">Bảo mật phiên</h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Đăng xuất tài khoản này ở các trình duyệt và thiết bị khác.
              </p>
              {user.otherSessionsRevokedAt && (
                <p className="mt-1.5 text-[11px] font-medium text-[#16a34a]">
                  Đã thu hồi các phiên khác lúc{' '}
                  <span className="font-mono-num">
                    {formatDateTimeVi(user.otherSessionsRevokedAt)}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onRequestRevokeSessions}
              className="rounded-lg border border-[#d9dcf0] bg-white px-4 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:bg-[#f7f6ff] hover:text-[#5542d2] whitespace-nowrap"
            >
              Đăng xuất phiên khác
            </button>
          </section>

          <section className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">Dữ liệu cá nhân</h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Tải bản sao thông tin tài khoản, hồ sơ và lịch sử dự đoán dưới dạng JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={onExportMyData}
              className="rounded-lg border border-[#d9dcf0] bg-white px-4 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:bg-[#f7f6ff] hover:text-[#5542d2] whitespace-nowrap"
            >
              Tải dữ liệu của tôi (JSON)
            </button>
          </section>

          <section className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Nhật ký hoạt động tài khoản
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Các sự kiện bảo mật và cập nhật hồ sơ gần đây.
              </p>
            </div>
            <ul className="divide-y divide-[#f1f2f7]">
              {securityLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="py-2.5 first:pt-1 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#20243a]">
                      {log.action}
                    </span>
                    <span className="font-mono-num text-[10px] text-[#8b8fa3]">
                      {formatDateTimeVi(log.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#62677c]">{log.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
