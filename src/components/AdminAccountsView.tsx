import React, { useState } from 'react';
import { Megaphone, MessageSquareOff, ShieldCheck, UserPlus } from 'lucide-react';
import {
  AccountDirectoryItem,
  AnonymousFeedbackItem,
  HrSupportRequest,
  LeaveRequest,
  SelfReviewItem,
} from '../types/staywise';
import { formatDateTimeVi, formatDateVi } from '../utils/staywiseModel';

interface AdminAccountsViewProps {
  currentUserId: string;
  accounts: AccountDirectoryItem[];
  leaveRequests: LeaveRequest[];
  feedbackList: AnonymousFeedbackItem[];
  selfReviews: SelfReviewItem[];
  hrRequests: HrSupportRequest[];
  onCreateAccount: (payload: {
    name: string;
    email: string;
    role: 'admin' | 'employee';
    department: string;
    password: string;
  }) => boolean;
  onToggleActive: (id: string) => void;
  onToggleRole: (id: string) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveRequest['status']) => void;
  onPublishAnnouncement: (title: string, body: string) => void;
  onReplySelfReview: (id: string, reply: string) => void;
  onUpdateHrRequest: (
    id: string,
    status: HrSupportRequest['status'],
    adminNote: string
  ) => void;
}

export const AdminAccountsView: React.FC<AdminAccountsViewProps> = ({
  currentUserId,
  accounts,
  leaveRequests,
  feedbackList,
  selfReviews,
  hrRequests,
  onCreateAccount,
  onToggleActive,
  onToggleRole,
  onUpdateLeaveStatus,
  onPublishAnnouncement,
  onReplySelfReview,
  onUpdateHrRequest,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Điều hành');
  const [role, setRole] = useState<'admin' | 'employee'>('admin');
  const [password, setPassword] = useState('');

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [hrNoteDrafts, setHrNoteDrafts] = useState<Record<string, string>>({});

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onCreateAccount({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      department: department.trim() || 'Điều hành',
      password,
    });
    if (ok) {
      setName('');
      setEmail('');
      setPassword('');
    }
  };

  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    onPublishAnnouncement(annTitle.trim(), annBody.trim());
    setAnnTitle('');
    setAnnBody('');
  };

  const adminCount = accounts.filter((a) => a.role === 'admin').length;
  const activeCount = accounts.filter((a) => a.active).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
          Quản trị hệ thống &amp; tương tác
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
          Tài khoản &amp; yêu cầu
        </h1>
        <p className="text-sm text-[#74788d]">
          Quản lý phân quyền tài khoản, duyệt đơn nghỉ phép, đăng thông báo, đọc góp ý ẩn danh và phản hồi tự đánh giá.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Tổng tài khoản</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#20243a]">
            {accounts.length}
          </p>
          <p className="mt-1 text-xs text-[#8b8fa3]">
            Hoạt động:{' '}
            <span className="font-mono-num font-semibold text-[#16a34a]">
              {activeCount}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Quản trị viên</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#6f5ce8]">
            {adminCount}
          </p>
          <p className="mt-1 text-xs text-[#8b8fa3]">Quyền quản trị toàn hệ thống</p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Đơn chờ duyệt</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#d97706]">
            {leaveRequests.filter((r) => r.status === 'Chờ duyệt').length}
          </p>
          <p className="mt-1 text-xs text-[#8b8fa3]">Yêu cầu nghỉ phép</p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Góp ý ẩn danh</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#20243a]">
            {feedbackList.length}
          </p>
          <p className="mt-1 text-xs text-[#8b8fa3]">Không lưu danh tính người gửi</p>
        </div>
      </div>

      {/* Create new admin/employee form */}
      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#6f5ce8]" />
          <h2 className="text-sm font-bold text-[#20243a]">
            Tạo tài khoản quản trị / nhân viên mới
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">
              Họ tên <span className="text-[#dc2626]">*</span>
            </span>
            <input
              type="text"
              required
              placeholder="Quản trị viên 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">
              Email <span className="text-[#dc2626]">*</span>
            </span>
            <input
              type="email"
              required
              placeholder="admin2@staywise.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Vai trò</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
              className="w-full rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            >
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="employee">Nhân viên (Employee)</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Phòng ban</span>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">
              Mật khẩu (≥ 10 ký tự) <span className="text-[#dc2626]">*</span>
            </span>
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              placeholder="Tối thiểu 10 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
        >
          Tạo tài khoản
        </button>
      </form>

      {/* Accounts Table */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="flex items-center justify-between border-b border-[#f1f2f7] px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#6f5ce8]" />
            <h2 className="text-sm font-bold text-[#20243a]">
              Danh sách tài khoản hệ thống
            </h2>
          </div>
          <span className="font-mono-num text-xs text-[#8b8fa3]">
            {accounts.length} tài khoản
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                <th className="px-5 py-3 font-semibold">Họ tên &amp; Email</th>
                <th className="px-4 py-3 font-semibold">Phòng ban</th>
                <th className="px-4 py-3 font-semibold">Vai trò</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f2f7]">
              {accounts.map((acc) => {
                const isSelf = acc.id === currentUserId;
                return (
                  <tr key={acc.id} className="hover:bg-[#faf9ff]">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-[#20243a]">
                        {acc.name}{' '}
                        {isSelf && (
                          <span className="text-[11px] font-medium text-[#6f5ce8]">
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#74788d]">{acc.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#52576c]">{acc.department}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          acc.role === 'admin'
                            ? 'text-[#6f5ce8]'
                            : 'text-[#393d51]'
                        }`}
                      >
                        {acc.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          acc.active ? 'text-[#16a34a]' : 'text-[#dc2626]'
                        }`}
                      >
                        {acc.active ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="font-mono-num px-4 py-3 text-[#52576c]">
                      {formatDateVi(acc.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => onToggleRole(acc.id)}
                          className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                        >
                          {acc.role === 'admin' ? 'Hạ xuống NV' : 'Cấp quyền Admin'}
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => onToggleActive(acc.id)}
                          className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#393d51] transition-colors hover:border-[#c5474d] hover:text-[#c5474d] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
                        >
                          {acc.active ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Publish Announcement */}
        <form
          onSubmit={handleAnnouncementSubmit}
          className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#6f5ce8]" />
            <h2 className="text-sm font-bold text-[#20243a]">
              Đăng thông báo nội bộ tới nhân viên
            </h2>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Tiêu đề</span>
            <input
              type="text"
              required
              placeholder="Ví dụ: Lịch nghỉ lễ & chính sách hỗ trợ..."
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Nội dung</span>
            <textarea
              rows={3}
              required
              placeholder="Thông báo sẽ hiển thị ngay trong Cổng nhân viên..."
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] p-2.5 text-xs"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5542d2]"
          >
            Phát hành thông báo
          </button>
        </form>

        {/* Anonymous Feedback Inbox */}
        <section className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex items-center gap-2">
            <MessageSquareOff className="h-4 w-4 text-[#6f5ce8]" />
            <h2 className="text-sm font-bold text-[#20243a]">
              Hộp thư góp ý ẩn danh
            </h2>
          </div>
          <div className="divide-y divide-[#f1f2f7]">
            {feedbackList.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8b8fa3]">
                Chưa có góp ý nào.
              </p>
            ) : (
              feedbackList.map((fb) => (
                <div key={fb.id} className="space-y-1 py-3 first:pt-1 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#20243a]">{fb.topic}</span>
                    <span className="font-mono-num text-[11px] text-[#8b8fa3]">
                      {formatDateTimeVi(fb.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#52576c]">
                    {fb.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Leave requests approval */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">
            Duyệt đơn nghỉ phép nhân viên
          </h2>
        </div>

        <div className="divide-y divide-[#f1f2f7] px-5">
          {leaveRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#20243a]">
                    {req.employeeName}
                  </span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span className="font-semibold text-[#393d51]">{req.type}</span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span className="font-mono-num text-[#74788d]">
                    {req.startDate} → {req.endDate}
                  </span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span
                    className={`font-semibold ${
                      req.status === 'Đã duyệt'
                        ? 'text-[#16a34a]'
                        : req.status === 'Đã hủy'
                          ? 'text-[#8b8fa3]'
                          : 'text-[#d97706]'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="text-xs text-[#62677c]">{req.reason}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={req.status === 'Đã duyệt'}
                  onClick={() => onUpdateLeaveStatus(req.id, 'Đã duyệt')}
                  className="rounded-lg border border-[#c6ebd8] bg-[#f1fbf6] px-3 py-1.5 text-[11px] font-semibold text-[#17784d] transition-colors hover:bg-[#e1f6eb] disabled:opacity-40 whitespace-nowrap"
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  disabled={req.status === 'Đã hủy'}
                  onClick={() => onUpdateLeaveStatus(req.id, 'Đã hủy')}
                  className="rounded-lg border border-[#e3e5ef] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#52576c] transition-colors hover:bg-[#fff1f2] hover:text-[#c5474d] disabled:opacity-40 whitespace-nowrap"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Self-review responses */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">
            Phiếu tự đánh giá cần phản hồi
          </h2>
        </div>

        <div className="divide-y divide-[#f1f2f7] px-5">
          {selfReviews.map((rev) => (
            <div key={rev.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-[#20243a]">{rev.employeeName}</span>
                <span aria-hidden="true" className="text-[#c1c5d6]">
                  ·
                </span>
                <span className="text-[#52576c]">{rev.period}</span>
                <span aria-hidden="true" className="text-[#c1c5d6]">
                  ·
                </span>
                <span className="font-mono-num font-semibold text-[#6f5ce8]">
                  Tự chấm {rev.rating}/5
                </span>
              </div>
              <p className="text-xs text-[#393d51]">
                <strong>Thành tựu:</strong> {rev.achievements}
              </p>
              <p className="text-xs text-[#62677c]">
                <strong>Khó khăn:</strong> {rev.blockers}
              </p>
              {rev.adminReply && (
                <p className="rounded-lg bg-[#f4f2ff] px-3 py-2 text-xs text-[#4b3bc0]">
                  <strong>Đã phản hồi:</strong> {rev.adminReply}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Nhập phản hồi của quản trị viên..."
                  value={replyDrafts[rev.id] ?? ''}
                  onChange={(e) =>
                    setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-[#e3e5ef] px-3 py-1.5 text-xs focus:border-[#6f5ce8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = (replyDrafts[rev.id] ?? '').trim();
                    if (!text) return;
                    onReplySelfReview(rev.id, text);
                    setReplyDrafts({ ...replyDrafts, [rev.id]: '' });
                  }}
                  className="rounded-lg bg-[#6f5ce8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#5542d2] whitespace-nowrap"
                >
                  Gửi phản hồi
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Employee HR Support Requests */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">
            Yêu cầu hỗ trợ nhân sự &amp; Lịch hẹn 1-1
          </h2>
        </div>

        <div className="divide-y divide-[#f1f2f7] px-5">
          {hrRequests.map((req) => (
            <div key={req.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#20243a]">{req.employeeName}</span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span className="font-semibold text-[#52576c]">{req.category}</span>
                </div>
                <span
                  className={`font-semibold ${
                    req.status === 'Đã giải quyết'
                      ? 'text-[#16a34a]'
                      : req.status === 'Đang xử lý'
                        ? 'text-[#6f5ce8]'
                        : 'text-[#d97706]'
                  }`}
                >
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-[#393d51]">{req.detail}</p>
              {req.adminNote && (
                <p className="rounded-lg bg-[#f4f2ff] px-3 py-1.5 text-xs text-[#4b3bc0]">
                  <strong>Ghi chú HR:</strong> {req.adminNote}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ghi chú phản hồi hoặc lịch hẹn 1-1..."
                  value={hrNoteDrafts[req.id] ?? ''}
                  onChange={(e) =>
                    setHrNoteDrafts({ ...hrNoteDrafts, [req.id]: e.target.value })
                  }
                  className="min-w-[200px] flex-1 rounded-lg border border-[#e3e5ef] px-3 py-1.5 text-xs focus:border-[#6f5ce8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateHrRequest(
                      req.id,
                      'Đang xử lý',
                      (hrNoteDrafts[req.id] ?? '').trim() ||
                        req.adminNote ||
                        'Đã tiếp nhận và đang sắp xếp.'
                    );
                    setHrNoteDrafts({ ...hrNoteDrafts, [req.id]: '' });
                  }}
                  className="rounded-lg border border-[#d7d3fb] bg-[#f7f6ff] px-3 py-1.5 text-xs font-semibold text-[#5542d2] hover:bg-[#efecff] whitespace-nowrap"
                >
                  Đang xử lý
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateHrRequest(
                      req.id,
                      'Đã giải quyết',
                      (hrNoteDrafts[req.id] ?? '').trim() ||
                        req.adminNote ||
                        'Đã xử lý xong yêu cầu của nhân viên.'
                    );
                    setHrNoteDrafts({ ...hrNoteDrafts, [req.id]: '' });
                  }}
                  className="rounded-lg bg-[#16a34a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#15803d] whitespace-nowrap"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
