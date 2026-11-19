import React, { useMemo, useRef, useState } from 'react';
import { Download, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { EmployeeProfile, RiskLevel } from '../types/staywise';
import {
  downloadEmployeesCsv,
  parseEmployeesCsv,
  riskLabel,
  riskLevel,
} from '../utils/staywiseModel';

interface EmployeesDirectoryViewProps {
  employees: EmployeeProfile[];
  onSaveEmployee: (
    data: Omit<EmployeeProfile, 'id' | 'risk'>,
    existingId?: string
  ) => void;
  onDeleteEmployee: (id: string) => void;
  onImportEmployees: (imported: EmployeeProfile[]) => void;
  onNotify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const EMPTY_FORM: Omit<EmployeeProfile, 'id' | 'risk'> = {
  name: '',
  email: '',
  department: 'Kỹ thuật',
  role: 'Chuyên viên',
  tenure: 2,
  satisfaction: 3,
  salary: 10000,
  overtime: 6,
  distance: 10,
  age: 28,
  balance: 3,
};

export const EmployeesDirectoryView: React.FC<EmployeesDirectoryViewProps> = ({
  employees,
  onSaveEmployee,
  onDeleteEmployee,
  onImportEmployees,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [sortBy, setSortBy] = useState<'risk-desc' | 'risk-asc' | 'salary-desc' | 'name'>('risk-desc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((emp) => {
        if (departmentFilter !== 'all' && emp.department !== departmentFilter) {
          return false;
        }
        if (riskFilter !== 'all' && riskLevel(emp.risk) !== riskFilter) {
          return false;
        }
        if (
          q &&
          !emp.name.toLowerCase().includes(q) &&
          !emp.email.toLowerCase().includes(q) &&
          !emp.id.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk-desc') return b.risk - a.risk;
        if (sortBy === 'risk-asc') return a.risk - b.risk;
        if (sortBy === 'salary-desc') return b.salary - a.salary;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [employees, search, departmentFilter, riskFilter, sortBy]);

  const openAddDialog = () => {
    setEditingId(undefined);
    setFormState(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (emp: EmployeeProfile) => {
    setEditingId(emp.id);
    setFormState({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      role: emp.role,
      tenure: emp.tenure,
      satisfaction: emp.satisfaction,
      salary: emp.salary,
      overtime: emp.overtime,
      distance: emp.distance,
      age: emp.age,
      balance: emp.balance,
    });
    setDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    onSaveEmployee(
      {
        ...formState,
        name: formState.name.trim(),
        email:
          formState.email.trim() ||
          `${formState.name.trim().toLowerCase().replace(/\s+/g, '.')}@staywise.vn`,
      },
      editingId
    );
    setDialogOpen(false);
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseEmployeesCsv(text);
      if (parsed.length === 0) {
        onNotify('Tệp CSV không có dòng dữ liệu hợp lệ (cần cột name).', 'error');
      } else {
        onImportEmployees(parsed);
      }
    } catch {
      onNotify('Không thể đọc tệp CSV.', 'error');
    } finally {
      input.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvChange}
        className="sr-only"
      />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Quản lý hồ sơ
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Danh sách nhân viên
          </h1>
          <p className="text-sm text-[#74788d]">
            Thêm, chỉnh sửa, lọc rủi ro và nhập/xuất dữ liệu CSV tự động tính điểm dự đoán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e5ef] bg-white px-3.5 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Nhập CSV</span>
          </button>
          <button
            type="button"
            onClick={() => downloadEmployeesCsv(filtered)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e5ef] bg-white px-3.5 py-2 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={openAddDialog}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm nhân viên</span>
          </button>
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#eceef4] bg-white p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b8fa3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email hoặc mã nhân viên..."
            className="w-full rounded-lg border border-[#e3e5ef] py-2 pl-9 pr-3 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#f4f5fa] p-1">
            {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  riskFilter === lvl
                    ? 'bg-white text-[#20243a] shadow-xs'
                    : 'text-[#62677c] hover:text-[#20243a]'
                }`}
              >
                {lvl === 'all'
                  ? 'Tất cả'
                  : lvl === 'high'
                    ? 'Cao'
                    : lvl === 'medium'
                      ? 'Trung bình'
                      : 'Thấp'}
              </button>
            ))}
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Lọc phòng ban"
            className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
          >
            <option value="all">Mọi phòng ban</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'risk-desc' | 'risk-asc' | 'salary-desc' | 'name'
              )
            }
            aria-label="Sắp xếp"
            className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
          >
            <option value="risk-desc">Rủi ro cao nhất</option>
            <option value="risk-asc">Rủi ro thấp nhất</option>
            <option value="salary-desc">Lương cao nhất</option>
            <option value="name">Tên A–Z</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                <th className="px-5 py-3 font-semibold">Nhân viên</th>
                <th className="px-4 py-3 font-semibold">Phòng ban · Chức vụ</th>
                <th className="px-4 py-3 text-right font-semibold">Thâm niên</th>
                <th className="px-4 py-3 text-right font-semibold">Lương (USD)</th>
                <th className="px-4 py-3 text-right font-semibold">Tăng ca</th>
                <th className="px-4 py-3 text-right font-semibold">Hài lòng</th>
                <th className="px-4 py-3 text-right font-semibold">Rủi ro</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f2f7]">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-xs text-[#8b8fa3]"
                  >
                    Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const lvl = riskLevel(emp.risk);
                  return (
                    <tr key={emp.id} className="hover:bg-[#faf9ff]">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[#20243a]">{emp.name}</div>
                        <div className="text-[11px] text-[#74788d]">
                          {emp.id} · {emp.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#52576c]">
                        {emp.department} · {emp.role}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {emp.tenure} năm
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {emp.salary.toLocaleString('vi-VN')}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {emp.overtime}h
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {emp.satisfaction}/5
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono-num font-bold ${
                            lvl === 'high'
                              ? 'text-[#dc2626]'
                              : lvl === 'medium'
                                ? 'text-[#d97706]'
                                : 'text-[#16a34a]'
                          }`}
                        >
                          {emp.risk}%
                        </span>
                        <span className="block text-[10px] text-[#8b8fa3]">
                          {riskLabel(lvl)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDialog(emp)}
                            className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2]"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(emp.id)}
                            aria-label={`Xóa ${emp.name}`}
                            className="rounded-lg p-1.5 text-[#8b8fa3] transition-colors hover:bg-[#fff1f2] hover:text-[#c5474d]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add/Edit Employee Modal */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#181b2e]/40 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#eceef4] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f1f2f7] pb-3">
              <h2 className="text-base font-bold text-[#20243a]">
                {editingId ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm nhân viên mới'}
              </h2>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg p-1.5 text-[#74788d] hover:bg-[#f4f2ff]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Họ tên <span className="text-[#dc2626]">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">Email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) =>
                      setFormState({ ...formState, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">Phòng ban</span>
                  <input
                    type="text"
                    value={formState.department}
                    onChange={(e) =>
                      setFormState({ ...formState, department: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">Chức vụ</span>
                  <input
                    type="text"
                    value={formState.role}
                    onChange={(e) =>
                      setFormState({ ...formState, role: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Thâm niên (năm)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    step={0.1}
                    value={formState.tenure}
                    onChange={(e) =>
                      setFormState({ ...formState, tenure: Number(e.target.value) })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Lương tháng (USD)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={formState.salary}
                    onChange={(e) =>
                      setFormState({ ...formState, salary: Number(e.target.value) })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Giờ làm thêm / tuần
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formState.overtime}
                    onChange={(e) =>
                      setFormState({ ...formState, overtime: Number(e.target.value) })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Khoảng cách đi làm (km)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={formState.distance}
                    onChange={(e) =>
                      setFormState({ ...formState, distance: Number(e.target.value) })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Mức hài lòng (1–5)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formState.satisfaction}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        satisfaction: Number(e.target.value),
                      })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[#393d51]">
                    Cân bằng công việc (1–5)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={formState.balance}
                    onChange={(e) =>
                      setFormState({ ...formState, balance: Number(e.target.value) })
                    }
                    className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border border-[#e3e5ef] bg-white px-4 py-2 text-xs font-semibold text-[#52576c]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5542d2]"
                >
                  {editingId ? 'Lưu cập nhật' : 'Thêm hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#181b2e]/40 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-[#eceef4] bg-white p-5 shadow-xl">
            <h2 className="text-sm font-bold text-[#20243a]">
              Xác nhận xóa hồ sơ?
            </h2>
            <p className="mt-1.5 text-xs text-[#62677c]">
              Hồ sơ nhân viên này sẽ bị xóa khỏi danh sách theo dõi.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-[#e3e5ef] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#52576c]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEmployee(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-[#dc2626] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#b91c1c]"
              >
                Xóa hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
