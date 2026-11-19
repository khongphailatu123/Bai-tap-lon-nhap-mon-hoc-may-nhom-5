import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { EmployeeProfile } from '../types/staywise';
import { riskLevel } from '../utils/staywiseModel';

interface AnalyticsRoiViewProps {
  employees: EmployeeProfile[];
  highThreshold: number;
}

export const AnalyticsRoiView: React.FC<AnalyticsRoiViewProps> = ({
  employees,
  highThreshold,
}) => {
  const [replacementMonths, setReplacementMonths] = useState(6);
  const [retentionSuccessRate, setRetentionSuccessRate] = useState(60);

  const highRiskEmployees = useMemo(
    () => employees.filter((e) => e.risk >= highThreshold),
    [employees, highThreshold]
  );

  const estimatedExposure = useMemo(
    () =>
      highRiskEmployees.reduce(
        (sum, emp) => sum + emp.salary * replacementMonths,
        0
      ),
    [highRiskEmployees, replacementMonths]
  );

  const estimatedSavings = Math.round(
    (estimatedExposure * retentionSuccessRate) / 100
  );

  // Tenure cohorts
  const tenureCohorts = useMemo(() => {
    const buckets = [
      { label: 'Dưới 1 năm', min: 0, max: 1 },
      { label: '1 – 3 năm', min: 1, max: 3 },
      { label: '3 – 5 năm', min: 3, max: 5 },
      { label: 'Trên 5 năm', min: 5, max: 99 },
    ];
    return buckets.map((b) => {
      const list = employees.filter(
        (e) => e.tenure >= b.min && e.tenure < b.max
      );
      const avgRisk =
        list.length > 0
          ? Math.round(list.reduce((s, e) => s + e.risk, 0) / list.length)
          : 0;
      const avgSalary =
        list.length > 0
          ? Math.round(list.reduce((s, e) => s + e.salary, 0) / list.length)
          : 0;
      return {
        label: b.label,
        count: list.length,
        avgRisk,
        avgSalary,
      };
    });
  }, [employees]);

  // Salary bands
  const salaryBands = useMemo(() => {
    const bands = [
      { label: '< $8,000', min: 0, max: 8000 },
      { label: '$8,000 – $12,000', min: 8000, max: 12000 },
      { label: '$12,000 – $16,000', min: 12000, max: 16000 },
      { label: '> $16,000', min: 16000, max: 10000000 },
    ];
    return bands.map((b) => {
      const list = employees.filter(
        (e) => e.salary >= b.min && e.salary < b.max
      );
      const avgRisk =
        list.length > 0
          ? Math.round(list.reduce((s, e) => s + e.risk, 0) / list.length)
          : 0;
      const avgOvertime =
        list.length > 0
          ? (
              list.reduce((s, e) => s + e.overtime, 0) / list.length
            ).toFixed(1)
          : '0.0';
      return {
        label: b.label,
        count: list.length,
        avgRisk,
        avgOvertime,
      };
    });
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Phân tích chuyên sâu &amp; Tài chính nhân sự
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Phân tích dữ liệu &amp; Chi phí nghỉ việc
          </h1>
          <p className="text-sm text-[#74788d]">
            Ước tính rủi ro tài chính từ chi phí tuyển mới và phân rã rủi ro theo nhóm thâm niên, mức lương.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e3e5ef] bg-white px-4 py-2.5 text-xs font-semibold text-[#393d51] hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap shrink-0"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>In báo cáo phân tích</span>
        </button>
      </div>

      {/* Financial Impact & ROI Calculator */}
      <section className="rounded-xl border border-[#eceef4] bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-[#f1f2f7] pb-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Máy tính chi phí thay thế &amp; ROI giữ chân
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Tính trên {highRiskEmployees.length} nhân sự có điểm rủi ro ≥{' '}
              <span className="font-mono-num">{highThreshold}%</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <span className="text-[#52576c]">Hệ số chi phí thay thế:</span>
              <select
                value={replacementMonths}
                onChange={(e) => setReplacementMonths(Number(e.target.value))}
                className="font-mono-num rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value={3}>3 tháng lương</option>
                <option value={6}>6 tháng lương</option>
                <option value={9}>9 tháng lương</option>
                <option value={12}>12 tháng lương</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <span className="text-[#52576c]">Tỷ lệ giữ chân mục tiêu:</span>
              <span className="font-mono-num font-bold text-[#6f5ce8]">
                {retentionSuccessRate}%
              </span>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={retentionSuccessRate}
                onChange={(e) => setRetentionSuccessRate(Number(e.target.value))}
                className="w-24 accent-[#6f5ce8]"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-[#fff5f5] p-4">
            <p className="text-xs font-medium text-[#991b1b]">
              Chi phí rủi ro tiềm ẩn
            </p>
            <p className="font-mono-num mt-1.5 text-2xl font-bold text-[#dc2626]">
              ${estimatedExposure.toLocaleString('vi-VN')}
            </p>
            <p className="mt-1 text-[11px] text-[#7f1d1d]">
              Nếu toàn bộ nhóm rủi ro cao nghỉ việc
            </p>
          </div>

          <div className="rounded-lg bg-[#f1fbf6] p-4">
            <p className="text-xs font-medium text-[#166534]">
              Chi phí tiết kiệm dự kiến
            </p>
            <p className="font-mono-num mt-1.5 text-2xl font-bold text-[#16a34a]">
              ${estimatedSavings.toLocaleString('vi-VN')}
            </p>
            <p className="mt-1 text-[11px] text-[#14532d]">
              Khi giữ chân thành công {retentionSuccessRate}% nhân sự
            </p>
          </div>

          <div className="rounded-lg bg-[#faf9ff] p-4">
            <p className="text-xs font-medium text-[#4c3bc4]">
              Chi phí thay thế bình quân / người
            </p>
            <p className="font-mono-num mt-1.5 text-2xl font-bold text-[#6f5ce8]">
              $
              {highRiskEmployees.length > 0
                ? Math.round(
                    estimatedExposure / highRiskEmployees.length
                  ).toLocaleString('vi-VN')
                : 0}
            </p>
            <p className="mt-1 text-[11px] text-[#5b47d6]">
              Tính theo {replacementMonths} tháng lương bình quân
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Tenure Cohort Table */}
        <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
          <div className="border-b border-[#f1f2f7] px-5 py-4">
            <h2 className="text-sm font-bold text-[#20243a]">
              Phân nhóm theo thâm niên
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                  <th className="px-5 py-3 font-semibold">Nhóm thâm niên</th>
                  <th className="px-4 py-3 text-right font-semibold">Số NV</th>
                  <th className="px-4 py-3 text-right font-semibold">Lương TB</th>
                  <th className="px-5 py-3 text-right font-semibold">Rủi ro TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f7]">
                {tenureCohorts.map((row) => {
                  const lvl = riskLevel(row.avgRisk, highThreshold);
                  return (
                    <tr key={row.label} className="hover:bg-[#faf9ff]">
                      <td className="px-5 py-3 font-semibold text-[#20243a]">
                        {row.label}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {row.count}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        ${row.avgSalary.toLocaleString('vi-VN')}
                      </td>
                      <td
                        className={`font-mono-num px-5 py-3 text-right font-bold ${
                          lvl === 'high'
                            ? 'text-[#dc2626]'
                            : lvl === 'medium'
                              ? 'text-[#d97706]'
                              : 'text-[#16a34a]'
                        }`}
                      >
                        {row.avgRisk}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Salary Band Table */}
        <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
          <div className="border-b border-[#f1f2f7] px-5 py-4">
            <h2 className="text-sm font-bold text-[#20243a]">
              Phân nhóm theo mức thu nhập
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                  <th className="px-5 py-3 font-semibold">Khung lương (USD)</th>
                  <th className="px-4 py-3 text-right font-semibold">Số NV</th>
                  <th className="px-4 py-3 text-right font-semibold">Tăng ca TB</th>
                  <th className="px-5 py-3 text-right font-semibold">Rủi ro TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f7]">
                {salaryBands.map((row) => {
                  const lvl = riskLevel(row.avgRisk, highThreshold);
                  return (
                    <tr key={row.label} className="hover:bg-[#faf9ff]">
                      <td className="px-5 py-3 font-semibold text-[#20243a]">
                        {row.label}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {row.count}
                      </td>
                      <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                        {row.avgOvertime}h/tuần
                      </td>
                      <td
                        className={`font-mono-num px-5 py-3 text-right font-bold ${
                          lvl === 'high'
                            ? 'text-[#dc2626]'
                            : lvl === 'medium'
                              ? 'text-[#d97706]'
                              : 'text-[#16a34a]'
                        }`}
                      >
                        {row.avgRisk}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
