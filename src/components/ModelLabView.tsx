import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { EmployeeProfile, ModelWeights } from '../types/staywise';
import {
  DEFAULT_MODEL_WEIGHTS,
  evaluateModelMetrics,
} from '../utils/staywiseModel';

interface ModelLabViewProps {
  employees: EmployeeProfile[];
  weights: ModelWeights;
  onApplyWeights: (weights: ModelWeights) => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({
  employees,
  weights,
  onApplyWeights,
}) => {
  const [draft, setDraft] = useState<ModelWeights>(weights);

  const metrics = useMemo(
    () => evaluateModelMetrics(employees, draft),
    [employees, draft]
  );

  const hasChanges =
    JSON.stringify(draft) !== JSON.stringify(weights);

  const handleReset = () => {
    setDraft(DEFAULT_MODEL_WEIGHTS);
    onApplyWeights(DEFAULT_MODEL_WEIGHTS);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
            Hiệu chỉnh &amp; Đánh giá
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
            Mô hình Logistic Regression
          </h1>
          <p className="text-sm text-[#74788d]">
            Điều chỉnh ngưỡng phân loại và trọng số đặc trưng để kiểm tra độ nhạy, ma trận nhầm lẫn trên {employees.length} hồ sơ.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e5ef] bg-white px-3.5 py-2 text-xs font-semibold text-[#393d51] hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục mặc định</span>
          </button>
          <button
            type="button"
            disabled={!hasChanges}
            onClick={() => onApplyWeights(draft)}
            className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
          >
            Áp dụng trọng số cho toàn hệ thống
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Accuracy</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#20243a]">
            {metrics.accuracy}%
          </p>
          <p className="mt-1 text-[11px] text-[#8b8fa3]">Độ chính xác tổng thể</p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Precision</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#6f5ce8]">
            {metrics.precision}%
          </p>
          <p className="mt-1 text-[11px] text-[#8b8fa3]">Độ chuẩn cảnh báo nghỉ</p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">Recall</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#d97706]">
            {metrics.recall}%
          </p>
          <p className="mt-1 text-[11px] text-[#8b8fa3]">Độ phủ phát hiện rủi ro</p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-5">
          <p className="text-xs font-medium text-[#74788d]">F1-Score</p>
          <p className="font-mono-num mt-2 text-3xl font-bold text-[#16a34a]">
            {metrics.f1}%
          </p>
          <p className="mt-1 text-[11px] text-[#8b8fa3]">Trung bình điều hòa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Weights & Threshold Tuning */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-7">
          <div className="border-b border-[#f1f2f7] pb-3">
            <h2 className="text-sm font-bold text-[#20243a]">
              Hiệu chỉnh ngưỡng &amp; trọng số đặc trưng (β)
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Thay đổi hệ số để quan sát phản ứng của ma trận nhầm lẫn và điểm F1.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5 rounded-lg bg-[#faf9ff] p-3.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#20243a]">
                  Ngưỡng cảnh báo rủi ro cao (Decision Threshold)
                </span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {draft.threshold}%
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={85}
                step={1}
                value={draft.threshold}
                onChange={(e) =>
                  setDraft({ ...draft, threshold: Number(e.target.value) })
                }
                className="w-full accent-[#6f5ce8]"
              />
              <p className="text-[11px] text-[#74788d]">
                Hồ sơ có xác suất ≥ {draft.threshold}% sẽ được gắn nhãn "Nguy cơ cao".
              </p>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WeightSlider
                label="Trọng số Mức hài lòng"
                value={draft.satisfaction}
                min={0.1}
                max={1.5}
                step={0.05}
                onChange={(v) => setDraft({ ...draft, satisfaction: v })}
              />
              <WeightSlider
                label="Trọng số Cân bằng công việc"
                value={draft.balance}
                min={0.1}
                max={1.5}
                step={0.05}
                onChange={(v) => setDraft({ ...draft, balance: v })}
              />
              <WeightSlider
                label="Trọng số Tăng ca (mỗi giờ)"
                value={draft.overtime}
                min={0.01}
                max={0.2}
                step={0.005}
                onChange={(v) => setDraft({ ...draft, overtime: v })}
              />
              <WeightSlider
                label="Trọng số Thâm niên (< 3 năm)"
                value={draft.tenure}
                min={0.05}
                max={1.0}
                step={0.02}
                onChange={(v) => setDraft({ ...draft, tenure: v })}
              />
              <WeightSlider
                label="Trọng số Mức lương"
                value={draft.salary}
                min={0.05}
                max={1.2}
                step={0.02}
                onChange={(v) => setDraft({ ...draft, salary: v })}
              />
              <WeightSlider
                label="Trọng số Khoảng cách (km)"
                value={draft.distance}
                min={0.005}
                max={0.05}
                step={0.005}
                onChange={(v) => setDraft({ ...draft, distance: v })}
              />
            </div>
          </div>
        </section>

        {/* Confusion Matrix */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-5">
          <div className="border-b border-[#f1f2f7] pb-3">
            <h2 className="text-sm font-bold text-[#20243a]">
              Ma trận nhầm lẫn (Confusion Matrix)
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              So sánh dự đoán tại ngưỡng {draft.threshold}% với tập kiểm chuẩn ({employees.length} mẫu)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-[#f1fbf6] p-4">
              <p className="text-[11px] font-semibold text-[#17784d]">
                True Positive (TP)
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#16a34a]">
                {metrics.tp}
              </p>
              <p className="mt-1 text-[10px] text-[#52576c]">
                Dự đoán đúng có nguy cơ nghỉ
              </p>
            </div>

            <div className="rounded-lg bg-[#fff7eb] p-4">
              <p className="text-[11px] font-semibold text-[#b45309]">
                False Positive (FP)
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#d97706]">
                {metrics.fp}
              </p>
              <p className="mt-1 text-[10px] text-[#52576c]">
                Báo động giả (thực tế ổn định)
              </p>
            </div>

            <div className="rounded-lg bg-[#fff5f5] p-4">
              <p className="text-[11px] font-semibold text-[#b91c1c]">
                False Negative (FN)
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#dc2626]">
                {metrics.fn}
              </p>
              <p className="mt-1 text-[10px] text-[#52576c]">
                Bỏ sót nhân sự có nguy cơ
              </p>
            </div>

            <div className="rounded-lg bg-[#f6f7fb] p-4">
              <p className="text-[11px] font-semibold text-[#393d51]">
                True Negative (TN)
              </p>
              <p className="font-mono-num mt-1 text-2xl font-bold text-[#20243a]">
                {metrics.tn}
              </p>
              <p className="mt-1 text-[10px] text-[#52576c]">
                Dự đoán đúng trạng thái ổn định
              </p>
            </div>
          </div>

          <p className="rounded-lg bg-[#f9f9fd] p-3 text-[11px] leading-relaxed text-[#62677c]">
            <strong>Gợi ý học thuật:</strong> Trong bài toán giữ chân nhân tài, giảm{' '}
            <em>False Negative (bỏ sót)</em> thường được ưu tiên hơn bằng cách hạ nhẹ ngưỡng phân loại (ví dụ 55–65%) để tăng chỉ số <strong>Recall</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};

function WeightSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-[#393d51]">{label}</span>
        <span className="font-mono-num font-semibold text-[#20243a]">
          {value.toFixed(3)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#6f5ce8]"
      />
    </label>
  );
}
