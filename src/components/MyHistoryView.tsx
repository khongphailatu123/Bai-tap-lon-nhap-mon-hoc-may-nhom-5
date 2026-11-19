import React from 'react';
import { EmployeeProfile, PredictionRecord } from '../types/staywise';
import { formatDateTimeVi, riskLabel } from '../utils/staywiseModel';

interface MyHistoryViewProps {
  employee: EmployeeProfile;
  predictions: PredictionRecord[];
  onRunPersonalCheck: () => void;
}

export const MyHistoryView: React.FC<MyHistoryViewProps> = ({
  employee,
  predictions,
  onRunPersonalCheck,
}) => {
  const latest = predictions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Phân tích cá nhân
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Lịch sử dự đoán của tôi
          </h1>
          <p className="text-sm text-[#74788d]">
            Theo dõi điểm rủi ro tham khảo theo các thông số hồ sơ của bạn qua từng thời điểm.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunPersonalCheck}
          className="rounded-lg bg-[#6f5ce8] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap shrink-0"
        >
          Chạy đánh giá mới ngay
        </button>
      </div>

      {latest && (
        <section className="rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#f1f2f7] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Các yếu tố ảnh hưởng gần nhất
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Tính theo hồ sơ hiện tại của {employee.name} · Lương{' '}
                <span className="font-mono-num">${employee.salary}</span> · Làm thêm{' '}
                <span className="font-mono-num">{employee.overtime}h/tuần</span>
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono-num text-2xl font-bold text-[#6f5ce8]">
                {latest.risk}%
              </span>
              <span className="ml-2 text-xs font-medium text-[#52576c]">
                {riskLabel(latest.level)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latest.factors.map((factor) => {
              const impactPct = Math.min(100, Math.round(Math.abs(factor.effect) * 60));
              const increasesRisk = factor.effect > 0;
              return (
                <div
                  key={factor.key}
                  className="space-y-1.5 rounded-lg bg-[#f9f9fd] p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#393d51]">{factor.label}</span>
                    <span
                      className={`font-mono-num font-semibold ${
                        increasesRisk ? 'text-[#d97706]' : 'text-[#16a34a]'
                      }`}
                    >
                      {increasesRisk ? '+' : ''}
                      {factor.effect.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8eaf3]">
                    <div
                      className={`h-full rounded-full ${
                        increasesRisk ? 'bg-[#e99847]' : 'bg-[#28a879]'
                      }`}
                      style={{ width: `${Math.max(8, impactPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-[#eceef4] bg-white">
        <div className="border-b border-[#f1f2f7] px-5 py-4">
          <h2 className="text-sm font-bold text-[#20243a]">Bảng lịch sử đánh giá</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#f1f2f7] bg-[#fafbfe] text-[#74788d]">
                <th className="px-5 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 text-right font-semibold">Điểm rủi ro</th>
                <th className="px-4 py-3 font-semibold">Mức độ</th>
                <th className="px-4 py-3 text-right font-semibold">Hài lòng</th>
                <th className="px-4 py-3 text-right font-semibold">Cân bằng</th>
                <th className="px-4 py-3 text-right font-semibold">Làm thêm</th>
                <th className="px-5 py-3 text-right font-semibold">Lương (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f2f7]">
              {predictions.map((row) => (
                <tr key={row.id} className="hover:bg-[#faf9ff]">
                  <td className="font-mono-num px-5 py-3 text-[#20243a]">
                    {formatDateTimeVi(row.createdAt)}
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right font-semibold text-[#20243a]">
                    {row.risk}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        row.level === 'high'
                          ? 'text-[#dc2626]'
                          : row.level === 'medium'
                            ? 'text-[#d97706]'
                            : 'text-[#16a34a]'
                      }`}
                    >
                      {riskLabel(row.level)}
                    </span>
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    {row.satisfaction}/5
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    {row.balance}/5
                  </td>
                  <td className="font-mono-num px-4 py-3 text-right text-[#52576c]">
                    {row.overtime}h
                  </td>
                  <td className="font-mono-num px-5 py-3 text-right text-[#52576c]">
                    {row.salary.toLocaleString('vi-VN')}
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
