import React, { useState } from 'react';
import { EmployeeProfile, RetentionPlan } from '../types/staywise';
import { formatDateVi, getSuggestedIntervention } from '../utils/staywiseModel';

interface RetentionActionsViewProps {
  employees: EmployeeProfile[];
  plans: RetentionPlan[];
  onCreatePlan: (payload: Omit<RetentionPlan, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: RetentionPlan['status']) => void;
  onDeletePlan: (id: string) => void;
}

export const RetentionActionsView: React.FC<RetentionActionsViewProps> = ({
  employees,
  plans,
  onCreatePlan,
  onUpdateStatus,
  onDeletePlan,
}) => {
  const defaultEmp = employees[0];
  const [employeeId, setEmployeeId] = useState(defaultEmp?.id ?? '');
  const [actionTitle, setActionTitle] = useState(
    defaultEmp ? getSuggestedIntervention(defaultEmp) : ''
  );
  const [owner, setOwner] = useState('Bùi Thanh Trúc (Nhân sự)');
  const [dueDate, setDueDate] = useState('2026-12-15');
  const [notes, setNotes] = useState('');

  const handleEmployeeSelect = (id: string) => {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setActionTitle(getSuggestedIntervention(emp));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((item) => item.id === employeeId);
    if (!emp || !actionTitle.trim()) return;
    onCreatePlan({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      riskAtCreation: emp.risk,
      actionTitle: actionTitle.trim(),
      owner: owner.trim() || 'Bộ phận Nhân sự',
      dueDate,
      status: 'Chờ thực hiện',
      notes: notes.trim(),
    });
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
          Hành động nhân sự
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
          Kế hoạch giữ chân nhân tài
        </h1>
        <p className="text-sm text-[#74788d]">
          Chuyển tín hiệu rủi ro thành kế hoạch hỗ trợ 1-1 cụ thể và theo dõi tiến độ thực hiện.
        </p>
      </div>

      {/* Create plan form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5"
      >
        <h2 className="text-sm font-bold text-[#20243a]">
          Tạo kế hoạch hỗ trợ mới
        </h2>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Nhân viên</span>
            <select
              value={employeeId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            >
              {[...employees]
                .sort((a, b) => b.risk - a.risk)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.risk}% · {emp.department})
                  </option>
                ))}
            </select>
          </label>

          <label className="block space-y-1 lg:col-span-2">
            <span className="text-xs font-medium text-[#393d51]">
              Biện pháp đề xuất <span className="text-[#dc2626]">*</span>
            </span>
            <input
              type="text"
              required
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Hạn hoàn thành</span>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#393d51]">Người phụ trách</span>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-[#393d51]">Ghi chú trao đổi</span>
            <input
              type="text"
              placeholder="Nội dung cần chuẩn bị trước buổi gặp 1-1..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2]"
        >
          Lưu kế hoạch giữ chân
        </button>
      </form>

      {/* Plans list */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">
            Theo dõi kế hoạch ({plans.length})
          </h2>
        </div>

        <div className="divide-y divide-[#f1f2f7] px-5">
          {plans.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8b8fa3]">
              Chưa có kế hoạch giữ chân nào được tạo.
            </p>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-[#20243a]">
                      {plan.employeeName}
                    </span>
                    <span aria-hidden="true" className="text-[#c1c5d6]">
                      ·
                    </span>
                    <span className="text-[#74788d]">{plan.department}</span>
                    <span aria-hidden="true" className="text-[#c1c5d6]">
                      ·
                    </span>
                    <span className="font-mono-num font-semibold text-[#dc2626]">
                      Rủi ro {plan.riskAtCreation}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#393d51]">
                    {plan.actionTitle}
                  </p>
                  {plan.notes && (
                    <p className="text-xs text-[#62677c]">{plan.notes}</p>
                  )}
                  <p className="text-[11px] text-[#8b8fa3]">
                    Phụ trách: {plan.owner} · Hạn:{' '}
                    <span className="font-mono-num">{plan.dueDate}</span> · Tạo ngày{' '}
                    <span className="font-mono-num">
                      {formatDateVi(plan.createdAt)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={plan.status}
                    onChange={(e) =>
                      onUpdateStatus(
                        plan.id,
                        e.target.value as RetentionPlan['status']
                      )
                    }
                    aria-label={`Trạng thái kế hoạch ${plan.employeeName}`}
                    className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1.5 text-xs font-medium text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                  >
                    <option value="Chờ thực hiện">Chờ thực hiện</option>
                    <option value="Đang triển khai">Đang triển khai</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => onDeletePlan(plan.id)}
                    className="rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs font-medium text-[#c5474d] hover:bg-[#fff1f2]"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
