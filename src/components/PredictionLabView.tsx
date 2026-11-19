import React, { useMemo, useState } from 'react';
import { EmployeeProfile, PredictionRecord } from '../types/staywise';
import {
  formatDateTimeVi,
  predictRisk,
  riskLabel,
  riskLevel,
} from '../utils/staywiseModel';

interface PredictionLabViewProps {
  employees: EmployeeProfile[];
  predictions: PredictionRecord[];
  onSavePrediction: (record: PredictionRecord) => void;
}

export const PredictionLabView: React.FC<PredictionLabViewProps> = ({
  employees,
  predictions,
  onSavePrediction,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    employees[0]?.id ?? 'custom'
  );
  const [name, setName] = useState(employees[0]?.name ?? 'Hồ sơ mô phỏng');
  const [satisfaction, setSatisfaction] = useState(employees[0]?.satisfaction ?? 2);
  const [balance, setBalance] = useState(employees[0]?.balance ?? 2);
  const [overtime, setOvertime] = useState(employees[0]?.overtime ?? 16);
  const [salary, setSalary] = useState(employees[0]?.salary ?? 8000);
  const [tenure, setTenure] = useState(employees[0]?.tenure ?? 1.5);
  const [distance, setDistance] = useState(employees[0]?.distance ?? 18);

  // What-If intervention deltas
  const [salaryBoostPct, setSalaryBoostPct] = useState(15);
  const [targetOvertime, setTargetOvertime] = useState(5);
  const [targetSatisfaction, setTargetSatisfaction] = useState(4);

  const handleLoadEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const found = employees.find((e) => e.id === empId);
    if (!found) return;
    setName(found.name);
    setSatisfaction(found.satisfaction);
    setBalance(found.balance);
    setOvertime(found.overtime);
    setSalary(found.salary);
    setTenure(found.tenure);
    setDistance(found.distance);
  };

  const baselineEval = useMemo(
    () =>
      predictRisk({
        id: selectedEmpId,
        name,
        email: '',
        department: 'Kỹ thuật',
        role: 'Chuyên viên',
        age: 28,
        satisfaction,
        balance,
        overtime,
        salary,
        tenure,
        distance,
      }),
    [selectedEmpId, name, satisfaction, balance, overtime, salary, tenure, distance]
  );

  const simulatedSalary = Math.round(salary * (1 + salaryBoostPct / 100));
  const simulatedEval = useMemo(
    () =>
      predictRisk({
        id: selectedEmpId,
        name,
        email: '',
        department: 'Kỹ thuật',
        role: 'Chuyên viên',
        age: 28,
        satisfaction: Math.max(satisfaction, targetSatisfaction),
        balance: Math.min(5, balance + (overtime > targetOvertime ? 1 : 0)),
        overtime: Math.min(overtime, targetOvertime),
        salary: simulatedSalary,
        tenure,
        distance,
      }),
    [
      selectedEmpId,
      name,
      satisfaction,
      targetSatisfaction,
      balance,
      overtime,
      targetOvertime,
      simulatedSalary,
      tenure,
      distance,
    ]
  );

  const baseLevel = riskLevel(baselineEval.risk);
  const simLevel = riskLevel(simulatedEval.risk);
  const deltaRisk = simulatedEval.risk - baselineEval.risk;

  const handleSave = () => {
    onSavePrediction({
      id: `pred-${Date.now()}`,
      employeeName: name,
      createdAt: new Date().toISOString(),
      risk: baselineEval.risk,
      level: baseLevel,
      satisfaction,
      balance,
      overtime,
      salary,
      factors: baselineEval.factors,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Mô hình Logistic Regression
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Dự đoán &amp; Mô phỏng What-If
          </h1>
          <p className="text-sm text-[#74788d]">
            Điều chỉnh thông số nhân sự theo thời gian thực và thử nghiệm kịch bản can thiệp giữ chân.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-[#6f5ce8] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap shrink-0"
        >
          Lưu kết quả vào lịch sử
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Input controls */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f2f7] pb-3">
            <h2 className="text-sm font-bold text-[#20243a]">Thông số đầu vào</h2>
            <select
              value={selectedEmpId}
              onChange={(e) => handleLoadEmployee(e.target.value)}
              aria-label="Nạp nhanh từ nhân viên"
              className="rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-1.5 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  Nạp hồ sơ: {emp.name} ({emp.risk}%)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-[#393d51]">
                Tên hồ sơ dự đoán
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">Mức hài lòng</span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {satisfaction}/5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={satisfaction}
                onChange={(e) => setSatisfaction(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">Cân bằng công việc</span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {balance}/5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">Tăng ca / tuần</span>
                <span className="font-mono-num font-bold text-[#20243a]">
                  {overtime} giờ
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={overtime}
                onChange={(e) => setOvertime(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">Khoảng cách đi làm</span>
                <span className="font-mono-num font-bold text-[#20243a]">
                  {distance} km
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Lương tháng (USD)
              </span>
              <input
                type="number"
                min={1000}
                max={50000}
                step={200}
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
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
                step={0.5}
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Right: Real-time output + What-If comparison */}
        <div className="space-y-5 lg:col-span-6">
          <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#f1f2f7] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#20243a]">
                  Kết quả dự đoán trực tiếp
                </h2>
                <p className="mt-0.5 text-xs text-[#74788d]">
                  Đóng góp từng biến vào xác suất nghỉ việc
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono-num text-3xl font-bold ${
                    baseLevel === 'high'
                      ? 'text-[#dc2626]'
                      : baseLevel === 'medium'
                        ? 'text-[#d97706]'
                        : 'text-[#16a34a]'
                  }`}
                >
                  {baselineEval.risk}%
                </span>
                <span className="block text-[11px] font-semibold text-[#52576c]">
                  {riskLabel(baseLevel)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {baselineEval.factors.map((f) => {
                const widthPct = Math.min(100, Math.round(Math.abs(f.effect) * 55));
                const up = f.effect > 0;
                return (
                  <div key={f.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#393d51]">{f.label}</span>
                      <span
                        className={`font-mono-num font-semibold ${
                          up ? 'text-[#d97706]' : 'text-[#16a34a]'
                        }`}
                      >
                        {up ? `+${f.effect.toFixed(2)}` : f.effect.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eef0f6]">
                      <div
                        className={`h-full rounded-full ${
                          up ? 'bg-[#e99847]' : 'bg-[#28a879]'
                        }`}
                        style={{ width: `${Math.max(6, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* What-If Retention Scenario */}
          <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Mô phỏng kịch bản can thiệp (What-If)
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Thử điều chỉnh lương, giảm tăng ca và cải thiện hài lòng để xem mức giảm rủi ro.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#393d51]">
                  Tăng lương (+%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={salaryBoostPct}
                  onChange={(e) => setSalaryBoostPct(Number(e.target.value))}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#393d51]">
                  Trần tăng ca (h/tuần)
                </span>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={targetOvertime}
                  onChange={(e) => setTargetOvertime(Number(e.target.value))}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#393d51]">
                  Mục tiêu hài lòng
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={targetSatisfaction}
                  onChange={(e) => setTargetSatisfaction(Number(e.target.value))}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#faf9ff] p-3.5">
              <div>
                <p className="text-xs font-medium text-[#52576c]">
                  Sau can thiệp (lương{' '}
                  <span className="font-mono-num">
                    ${simulatedSalary.toLocaleString('vi-VN')}
                  </span>
                  )
                </p>
                <p className="mt-0.5 text-[11px] text-[#8b8fa3]">
                  Mức độ mới: {riskLabel(simLevel)}
                </p>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono-num text-2xl font-bold text-[#16a34a]">
                  {simulatedEval.risk}%
                </span>
                <span className="font-mono-num text-xs font-semibold text-[#6f5ce8]">
                  ({deltaRisk <= 0 ? `${deltaRisk}%` : `+${deltaRisk}%`})
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Recent saved predictions */}
      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">
            Lịch sử dự đoán đã lưu ({predictions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                <th className="px-5 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Hồ sơ</th>
                <th className="px-4 py-3 text-right font-semibold">Hài lòng</th>
                <th className="px-4 py-3 text-right font-semibold">Tăng ca</th>
                <th className="px-4 py-3 text-right font-semibold">Lương</th>
                <th className="px-5 py-3 text-right font-semibold">Rủi ro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f2f7]">
              {predictions.slice(0, 8).map((item) => (
                <tr key={item.id} className="hover:bg-[#faf9ff]">
                  <td className="font-mono-num px-5 py-3 text-[#52576c]">
                    {formatDateTimeVi(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#20243a]">
                    {item.employeeName || 'Mô phỏng nhanh'}
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    {item.satisfaction}/5
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    {item.overtime}h
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    ${item.salary.toLocaleString('vi-VN')}
                  </td>
                  <td className="font-mono-num px-5 py-3 text-right font-bold text-[#6f5ce8]">
                    {item.risk}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
