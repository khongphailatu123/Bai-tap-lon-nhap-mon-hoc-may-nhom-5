import React from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { EmployeePageId, EmployeeProfile, RetentionPlan } from '../types/staywise';
import {
  downloadEmployeesCsv,
  getSuggestedIntervention,
  riskLabel,
  riskLevel,
} from '../utils/staywiseModel';

interface AdminOverviewViewProps {
  employees: EmployeeProfile[];
  retentionPlans: RetentionPlan[];
  onNavigate: (page: EmployeePageId) => void;
  onCreateQuickRetentionPlan: (employee: EmployeeProfile) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  employees,
  retentionPlans,
  onNavigate,
  onCreateQuickRetentionPlan,
}) => {
  const total = employees.length;
  const highRiskList = employees.filter((e) => riskLevel(e.risk) === 'high');
  const mediumRiskList = employees.filter((e) => riskLevel(e.risk) === 'medium');
  const lowRiskList = employees.filter((e) => riskLevel(e.risk) === 'low');

  const avgRisk =
    total > 0
      ? Math.round(employees.reduce((sum, e) => sum + e.risk, 0) / total)
      : 0;
  const highRate = total > 0 ? Math.round((highRiskList.length / total) * 100) : 0;

  // Group by department
  const departmentMap = new Map<
    string,
    { name: string; count: number; totalRisk: number; highCount: number }
  >();
  employees.forEach((emp) => {
    const existing = departmentMap.get(emp.department) ?? {
      name: emp.department,
      count: 0,
      totalRisk: 0,
      highCount: 0,
    };
    existing.count += 1;
    existing.totalRisk += emp.risk;
    if (riskLevel(emp.risk) === 'high') existing.highCount += 1;
    departmentMap.set(emp.department, existing);
  });

  const departments = Array.from(departmentMap.values()).sort(
    (a, b) => b.totalRisk / b.count - a.totalRisk / a.count
  );

  const priorityWatchlist = [...employees]
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5);

  const activePlansCount = retentionPlans.filter(
    (p) => p.status !== 'Hoàn thành'
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Bảng điều khiển nhân sự
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Tổng quan rủi ro nghỉ việc
          </h1>
          <p className="text-sm text-[#74788d]">
            Theo dõi sức khỏe đội ngũ, cảnh báo sớm theo phòng ban và kích hoạt kế hoạch giữ chân.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadEmployeesCsv(employees)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e3e5ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất CSV nhân sự</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('predict')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6f5ce8] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
          >
            <span>Mô phỏng What-If ML</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4-column KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Tổng nhân viên</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#20243a]">
            {total}
          </p>
          <p className="mt-1.5 text-xs text-[#8b8fa3]">
            {departments.length} phòng ban đang theo dõi
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Nguy cơ nghỉ việc cao</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-num text-3xl font-bold text-[#dc2626]">
              {highRiskList.length}
            </span>
            <span className="font-mono-num text-xs font-semibold text-[#dc2626]">
              ({highRate}%)
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[#8b8fa3]">
            Điểm rủi ro từ 65% trở lên
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Nguy cơ trung bình</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#d97706]">
            {mediumRiskList.length}
          </p>
          <p className="mt-1.5 text-xs text-[#8b8fa3]">
            Ổn định: <span className="font-mono-num">{lowRiskList.length}</span> nhân sự
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Rủi ro trung bình toàn công ty</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#6f5ce8]">
            {avgRisk}%
          </p>
          <p className="mt-1.5 text-xs text-[#8b8fa3]">
            Kế hoạch đang chạy: <span className="font-mono-num">{activePlansCount}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Department risk breakdown */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[#f1f2f7] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Rủi ro theo phòng ban
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Điểm rủi ro trung bình của từng bộ phận
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('employees')}
              className="text-xs font-semibold text-[#6f5ce8] hover:underline whitespace-nowrap"
            >
              Xem hồ sơ
            </button>
          </div>

          <div className="space-y-3.5">
            {departments.map((dept) => {
              const avg = Math.round(dept.totalRisk / dept.count);
              const level = riskLevel(avg);
              const barColor =
                level === 'high'
                  ? 'bg-[#dc2626]'
                  : level === 'medium'
                    ? 'bg-[#e99847]'
                    : 'bg-[#28a879]';

              return (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#20243a]">
                      {dept.name}{' '}
                      <span className="font-normal text-[#8b8fa3]">
                        · {dept.count} NV
                      </span>
                    </span>
                    <span className="font-mono-num font-semibold text-[#20243a]">
                      {avg}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef0f6]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Priority watchlist */}
        <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#f1f2f7] px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Nhân sự ưu tiên hỗ trợ sớm
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                5 hồ sơ có điểm rủi ro cao nhất và gợi ý hành động từ mô hình
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('actions')}
              className="text-xs font-semibold text-[#6f5ce8] hover:underline whitespace-nowrap"
            >
              Kế hoạch giữ chân
            </button>
          </div>

          <div className="divide-y divide-[#f1f2f7] px-5">
            {priorityWatchlist.map((emp) => {
              const level = riskLevel(emp.risk);
              const hasPlan = retentionPlans.some(
                (p) => p.employeeId === emp.id && p.status !== 'Hoàn thành'
              );
              return (
                <div
                  key={emp.id}
                  className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#20243a]">{emp.name}</span>
                      <span aria-hidden="true" className="text-[#c1c5d6]">
                        ·
                      </span>
                      <span className="text-[#74788d]">
                        {emp.department} · {emp.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52576c]">
                      Gợi ý: {getSuggestedIntervention(emp)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`font-mono-num text-sm font-bold ${
                          level === 'high'
                            ? 'text-[#dc2626]'
                            : level === 'medium'
                              ? 'text-[#d97706]'
                              : 'text-[#16a34a]'
                        }`}
                      >
                        {emp.risk}%
                      </span>
                      <span className="block text-[10px] text-[#8b8fa3]">
                        {riskLabel(level)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={hasPlan}
                      onClick={() => onCreateQuickRetentionPlan(emp)}
                      className="rounded-lg border border-[#d7d3fb] bg-[#f7f6ff] px-3 py-1.5 text-[11px] font-semibold text-[#5542d2] transition-colors hover:bg-[#efecff] disabled:border-[#e3e5ef] disabled:bg-[#f7f7fb] disabled:text-[#8b8fa3] whitespace-nowrap"
                    >
                      {hasPlan ? 'Đã có kế hoạch' : 'Tạo kế hoạch'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
