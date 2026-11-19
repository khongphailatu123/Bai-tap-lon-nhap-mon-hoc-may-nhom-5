import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, roleHint?: 'admin' | 'employee') => void;
  onRegister: (
    name: string,
    email: string,
    department: string,
    role: 'admin' | 'employee'
  ) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@staywise.vn');
  const [password, setPassword] = useState('Admin@StayWise2026');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Quản trị hệ thống');
  const [registerRole, setRegisterRole] = useState<'admin' | 'employee'>('admin');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Vui lòng nhập email và mật khẩu.');
        return;
      }
      onLogin(email.trim().toLowerCase());
    } else {
      if (!name.trim() || !email.trim() || password.length < 10) {
        setError('Vui lòng nhập họ tên, email và mật khẩu từ 10 ký tự.');
        return;
      }
      onRegister(
        name.trim(),
        email.trim().toLowerCase(),
        department.trim() || (registerRole === 'admin' ? 'Quản trị hệ thống' : 'Kỹ thuật'),
        registerRole
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#eceef4] bg-white p-8 shadow-lg shadow-[#252254]/5">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-6 items-end gap-0.5 -skew-x-12">
            <span className="block h-3.5 w-1.5 rounded-sm bg-[#6f5ce8]" />
            <span className="block h-5 w-1.5 rounded-sm bg-[#9b8cff]" />
            <span className="block h-6 w-1.5 rounded-sm bg-[#b6aaff]" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-[#20243a]">
            staywise<span className="text-[#6f5ce8]">.</span>
          </span>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-[#85899c]">
          Cổng thông tin nhân sự
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#20243a]">
          {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
        </h1>
        <p className="mt-1 text-xs text-[#74788d]">
          {mode === 'login'
            ? 'Đăng nhập bằng tài khoản Quản trị viên (Admin) hoặc Nhân viên.'
            : 'Chọn vai trò Quản trị viên hoặc Nhân viên để khởi tạo tài khoản.'}
        </p>

        <div className="my-5 grid grid-cols-2 gap-1 rounded-lg bg-[#f5f5fa] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setEmail('admin@staywise.vn');
              setPassword('Admin@StayWise2026');
              setShowPassword(false);
              setError('');
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-white text-[#6f5ce8] shadow-xs'
                : 'text-[#74788d] hover:text-[#20243a]'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setEmail('');
              setPassword('');
              setShowPassword(false);
              setError('');
            }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-white text-[#6f5ce8] shadow-xs'
                : 'text-[#74788d] hover:text-[#20243a]'
            }`}
          >
            Tạo tài khoản
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">
                  Loại tài khoản
                </span>
                <select
                  value={registerRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as 'admin' | 'employee';
                    setRegisterRole(nextRole);
                    setDepartment(
                      nextRole === 'admin' ? 'Quản trị hệ thống' : 'Kỹ thuật'
                    );
                  }}
                  className="w-full rounded-lg border border-[#e3e5ef] bg-white px-3 py-2 text-sm text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                >
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="employee">Nhân viên (Employee)</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">
                  Họ tên <span className="text-[#dc2626]">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    registerRole === 'admin'
                      ? 'Ví dụ: Quản trị viên'
                      : 'Ví dụ: Nguyễn Minh Anh'
                  }
                  className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">Phòng ban</span>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>
            </>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@staywise.vn"
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-sm focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <div className="space-y-1">
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-[#393d51]"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 10 ký tự"
                className="w-full rounded-lg border border-[#e3e5ef] py-2 pl-3 pr-10 text-sm focus:border-[#6f5ce8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                title={showPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#74788d] transition-colors hover:text-[#20243a]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-[#f3cccc] bg-[#fff0f0] px-3 py-2 text-xs text-[#ae4242]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-[#6f5ce8] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2]"
          >
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản & Đăng nhập'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-5 border-t border-[#f0f1f6] pt-4">
            <p className="mb-2 text-[11px] font-medium text-[#74788d]">
              Đăng nhập nhanh tài khoản mẫu:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onLogin('admin@staywise.vn', 'admin')}
                className="rounded-lg border border-[#d7d3fb] bg-[#f7f6ff] px-3 py-2 text-xs font-semibold text-[#5542d2] transition-colors hover:bg-[#efecff]"
              >
                Vào quyền Admin
              </button>
              <button
                type="button"
                onClick={() => onLogin('minhanh.nguyen@staywise.vn', 'employee')}
                className="rounded-lg border border-[#e3e5ef] bg-white px-3 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:bg-[#f7f7fb]"
              >
                Vào quyền Nhân viên
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
