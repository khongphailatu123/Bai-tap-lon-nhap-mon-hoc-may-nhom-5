import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  HeartHandshake,
  LifeBuoy,
  Printer,
  TrendingUp,
} from 'lucide-react';
import {
  AttendanceRecord,
  BenefitPackageItem,
  CourseItem,
  EmployeeProfile,
  GoalItem,
  HrSupportRequest,
  ModelWeights,
  RetentionPlan,
  SelfReviewItem,
} from '../types/staywise';
import {
  downloadJson,
  formatDateVi,
  getSuggestedIntervention,
  predictRisk,
  riskLabel,
  riskLevel,
} from '../utils/staywiseModel';

interface EmployeeCareerViewProps {
  employee: EmployeeProfile;
  weights: ModelWeights;
  attendanceLogs: AttendanceRecord[];
  benefits: BenefitPackageItem[];
  hrRequests: HrSupportRequest[];
  retentionPlans: RetentionPlan[];
  courses: CourseItem[];
  goals: GoalItem[];
  selfReviews: SelfReviewItem[];
  onClockIn: (workMode: AttendanceRecord['workMode']) => void;
  onClockOut: (recordId: string) => void;
  onToggleBenefit: (benefitId: string) => void;
  onSubmitHrRequest: (payload: {
    category: HrSupportRequest['category'];
    detail: string;
  }) => void;
  onApplyBalanceGoal: (updates: {
    satisfaction: number;
    balance: number;
    overtime: number;
    distance: number;
  }) => void;
}

const HR_CATEGORIES: HrSupportRequest['category'][] = [
  'Đặt lịch trao đổi 1-1 với Quản lý',
  'Giảm giờ tăng ca / Phân bổ việc',
  'Đăng ký làm việc từ xa',
  'Điều chỉnh lương & phụ cấp',
  'Hỗ trợ thiết bị & phúc lợi',
];

const BENEFIT_ANNUAL_LIMIT = 1500;

export const EmployeeCareerView: React.FC<EmployeeCareerViewProps> = ({
  employee,
  weights,
  attendanceLogs,
  benefits,
  hrRequests,
  retentionPlans,
  courses,
  goals,
  selfReviews,
  onClockIn,
  onClockOut,
  onToggleBenefit,
  onSubmitHrRequest,
  onApplyBalanceGoal,
}) => {
  const [workMode, setWorkMode] = useState<AttendanceRecord['workMode']>('Văn phòng');

  const [hrCategory, setHrCategory] = useState<HrSupportRequest['category']>(
    HR_CATEGORIES[0]
  );
  const [hrDetail, setHrDetail] = useState('');

  const [simOvertime, setSimOvertime] = useState(Math.max(0, employee.overtime - 4));
  const [simBalance, setSimBalance] = useState(Math.min(5, employee.balance + 1));
  const [simSatisfaction, setSimSatisfaction] = useState(
    Math.min(5, employee.satisfaction + 1)
  );
  const [remoteDaysPerWeek, setRemoteDaysPerWeek] = useState(2);

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeShift = attendanceLogs.find(
    (item) => item.date === todayIso && item.checkOut === null
  );
  const completedToday = attendanceLogs.find(
    (item) => item.date === todayIso && item.checkOut !== null
  );

  const totalLoggedHours = useMemo(
    () =>
      Number(
        attendanceLogs.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)
      ),
    [attendanceLogs]
  );

  const usedBenefitBudget = useMemo(
    () =>
      benefits
        .filter((b) => b.enrolled)
        .reduce((sum, b) => sum + b.annualValue, 0),
    [benefits]
  );

  const myHrRequests = useMemo(
    () => hrRequests.filter((r) => r.employeeName === employee.name),
    [hrRequests, employee.name]
  );

  const myRetentionPlans = useMemo(
    () =>
      retentionPlans.filter(
        (p) => p.employeeId === employee.id || p.employeeName === employee.name
      ),
    [retentionPlans, employee.id, employee.name]
  );

  // Payslip breakdown
  const baseSalary = employee.salary;
  const otAllowance = Math.round(employee.overtime * 4 * 18);
  const mealAndTravel = 320;
  const grossPay = baseSalary + otAllowance + mealAndTravel;
  const insuranceDeduction = Math.round(baseSalary * 0.105);
  const netEstimatedPay = Math.max(0, grossPay - insuranceDeduction);

  // Effective commuting distance adjusted by remote days
  const effectiveDistance = Math.max(
    0,
    Math.round(employee.distance * ((5 - remoteDaysPerWeek) / 5))
  );

  const currentEval = useMemo(
    () => predictRisk(employee, weights),
    [employee, weights]
  );
  const targetEval = useMemo(
    () =>
      predictRisk(
        {
          ...employee,
          overtime: simOvertime,
          balance: simBalance,
          satisfaction: simSatisfaction,
          distance: effectiveDistance,
        },
        weights
      ),
    [employee, simOvertime, simBalance, simSatisfaction, effectiveDistance, weights]
  );

  const targetLevel = riskLevel(targetEval.risk, weights.threshold);
  const riskDelta = targetEval.risk - currentEval.risk;

  // Career roadmap progress computed from real employee records
  const avgGoalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round(
      goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
    );
  }, [goals]);

  const completedCoursesCount = useMemo(
    () => courses.filter((c) => c.enrolled && c.progress >= 80).length,
    [courses]
  );

  const nextRoleLabel =
    employee.role === 'Nhân viên'
      ? 'Chuyên viên'
      : employee.role === 'Chuyên viên'
        ? 'Chuyên viên cao cấp / Trưởng nhóm'
        : employee.role === 'Trưởng nhóm'
          ? 'Quản lý bộ phận'
          : 'Quản lý cấp cao';

  const careerMilestones = [
    {
      label: 'Thâm niên tối thiểu 2.0 năm tại bộ phận',
      current: `${employee.tenure} năm`,
      done: employee.tenure >= 2,
    },
    {
      label: 'Hoàn thành ít nhất 2 khóa đào tạo nội bộ (≥ 80%)',
      current: `${completedCoursesCount}/2 khóa`,
      done: completedCoursesCount >= 2,
    },
    {
      label: 'Tiến độ mục tiêu cá nhân (OKR) trung bình ≥ 70%',
      current: `${avgGoalProgress}%`,
      done: avgGoalProgress >= 70,
    },
    {
      label: 'Đã hoàn tất tự đánh giá định kỳ',
      current: `${selfReviews.length} phiếu`,
      done: selfReviews.length >= 1,
    },
  ];
  const milestoneRatio = Math.round(
    (careerMilestones.filter((m) => m.done).length / careerMilestones.length) * 100
  );

  const handleHrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrDetail.trim()) return;
    onSubmitHrRequest({
      category: hrCategory,
      detail: hrDetail.trim(),
    });
    setHrDetail('');
  };

  const handleDownloadPayslip = () => {
    downloadJson(
      {
        employeeName: employee.name,
        department: employee.department,
        role: employee.role,
        period: new Date().toISOString().slice(0, 7),
        baseSalary,
        overtimeHoursPerWeek: employee.overtime,
        otAllowance,
        mealAndTravelAllowance: mealAndTravel,
        grossPay,
        insuranceDeduction,
        netEstimatedPay,
        generatedAt: new Date().toISOString(),
      },
      `phieu-luong-${employee.id}.json`
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
          Phúc lợi, Lương thưởng &amp; Lộ trình
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
          Chấm công, Lương &amp; Phúc lợi
        </h1>
        <p className="text-sm text-[#74788d]">
          Theo dõi giờ làm việc, phiếu lương hàng tháng, đăng ký gói phúc lợi, gửi yêu cầu hỗ trợ HR và theo dõi lộ trình phát triển.
        </p>
      </div>

      {/* 4 KPI summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Trạng thái ca hôm nay</p>
          <p
            className={`mt-1 text-lg font-bold ${
              activeShift
                ? 'text-[#16a34a]'
                : completedToday
                  ? 'text-[#6f5ce8]'
                  : 'text-[#20243a]'
            }`}
          >
            {activeShift
              ? 'Đang làm việc'
              : completedToday
                ? 'Đã hoàn thành ca'
                : 'Chưa chấm công'}
          </p>
          <p className="font-mono-num mt-0.5 text-[11px] text-[#8b8fa3]">
            {activeShift
              ? `Vào ca ${activeShift.checkIn} · ${activeShift.workMode}`
              : completedToday
                ? `${completedToday.checkIn} → ${completedToday.checkOut}`
                : 'Sẵn sàng check-in'}
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Tổng giờ công gần đây</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#20243a]">
            {totalLoggedHours}h
          </p>
          <p className="font-mono-num mt-0.5 text-[11px] text-[#8b8fa3]">
            {attendanceLogs.length} ngày đã ghi nhận
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Thực nhận dự kiến / tháng</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#6f5ce8]">
            ${netEstimatedPay.toLocaleString('en-US')}
          </p>
          <p className="font-mono-num mt-0.5 text-[11px] text-[#8b8fa3]">
            Phụ cấp OT ${otAllowance.toLocaleString('en-US')}
          </p>
        </div>

        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Ngân sách phúc lợi năm</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#16a34a]">
            ${usedBenefitBudget.toLocaleString('en-US')}
          </p>
          <p className="font-mono-num mt-0.5 text-[11px] text-[#8b8fa3]">
            Hạn mức tối đa ${BENEFIT_ANNUAL_LIMIT.toLocaleString('en-US')}
          </p>
        </div>
      </div>

      {/* Burnout / Overtime Alert + Manager Retention Support */}
      {(employee.overtime >= 10 || myRetentionPlans.length > 0) && (
        <section className="rounded-xl border border-[#eceef4] bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-[#6f5ce8]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#20243a]">
              Chế độ hỗ trợ &amp; cảnh báo cân bằng công việc
            </h2>
          </div>

          {employee.overtime >= 10 && (
            <div className="rounded-lg bg-[#fffbeb] px-3.5 py-2.5 text-xs text-[#92400e]">
              <strong>Lưu ý quá tải:</strong> Thời gian làm thêm tuần của bạn đang ở mức{' '}
              <span className="font-mono-num font-bold">{employee.overtime}h/tuần</span>.
              Bạn có thể gửi yêu cầu điều chỉnh khối lượng việc hoặc đăng ký ngày làm việc từ xa bên dưới.
            </div>
          )}

          {myRetentionPlans.length > 0 && (
            <div className="divide-y divide-[#f1f2f7]">
              {myRetentionPlans.map((plan) => (
                <div key={plan.id} className="py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#20243a]">
                      Kế hoạch hỗ trợ từ Quản lý: {plan.actionTitle}
                    </span>
                    <span className="font-semibold text-[#6f5ce8]">{plan.status}</span>
                  </div>
                  <p className="mt-0.5 text-[#62677c]">
                    Phụ trách: {plan.owner} · Hạn dự kiến:{' '}
                    <span className="font-mono-num">{plan.dueDate}</span> · {plan.notes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Attendance Check-in / Check-out */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Chấm công ca làm việc
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Chọn hình thức làm việc và bấm Check-in / Check-out theo thời gian thực.
              </p>
            </div>
            <Clock className="h-4 w-4 text-[#6f5ce8]" aria-hidden="true" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#faf9ff] p-3.5">
            <div className="flex items-center gap-1 rounded-lg border border-[#eceef4] bg-white p-1">
              {(['Văn phòng', 'Làm việc từ xa'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={Boolean(activeShift)}
                  onClick={() => setWorkMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    workMode === mode
                      ? 'bg-[#6f5ce8] text-white'
                      : 'text-[#62677c] hover:text-[#20243a]'
                  } disabled:opacity-60`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {activeShift ? (
              <button
                type="button"
                onClick={() => onClockOut(activeShift.id)}
                className="rounded-lg bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#b91c1c] whitespace-nowrap"
              >
                Check-out tan ca
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onClockIn(workMode)}
                className="rounded-lg bg-[#16a34a] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#15803d] whitespace-nowrap"
              >
                Check-in vào ca
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#eceef4] text-[11px] font-semibold text-[#74788d]">
                  <th className="py-2 pr-3">Ngày</th>
                  <th className="py-2 pr-3">Hình thức</th>
                  <th className="py-2 pr-3">Giờ vào</th>
                  <th className="py-2 pr-3">Giờ ra</th>
                  <th className="py-2 text-right">Tổng giờ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f7]">
                {attendanceLogs.slice(0, 6).map((row) => (
                  <tr key={row.id} className="hover:bg-[#fafafe]">
                    <td className="font-mono-num py-2.5 pr-3 font-medium text-[#20243a]">
                      {row.date}
                    </td>
                    <td className="py-2.5 pr-3 text-[#52576c]">{row.workMode}</td>
                    <td className="font-mono-num py-2.5 pr-3 text-[#16a34a]">
                      {row.checkIn}
                    </td>
                    <td className="font-mono-num py-2.5 pr-3 text-[#62677c]">
                      {row.checkOut ?? 'Đang trực'}
                    </td>
                    <td className="font-mono-num py-2.5 text-right font-semibold text-[#20243a]">
                      {row.checkOut ? `${row.totalHours.toFixed(1)}h` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payslip Estimator */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Phiếu lương dự kiến tháng hiện tại
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Tính theo bậc lương hồ sơ · {employee.department} · {employee.role}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPayslip}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs font-medium text-[#393d51] hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Tải JSON
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e3e5ef] px-2.5 py-1.5 text-xs font-medium text-[#393d51] hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                In phiếu
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#f1f2f7] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#52576c]">Lương cơ bản theo hợp đồng</span>
              <span className="font-mono-num font-semibold text-[#20243a]">
                ${baseSalary.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#52576c]">
                Phụ cấp làm thêm giờ ({employee.overtime}h/tuần)
              </span>
              <span className="font-mono-num font-semibold text-[#16a34a]">
                +${otAllowance.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#52576c]">Phụ cấp ăn trưa &amp; đi lại</span>
              <span className="font-mono-num font-semibold text-[#16a34a]">
                +${mealAndTravel.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#52576c]">Khấu trừ BHXH / BHYT ước tính (10.5%)</span>
              <span className="font-mono-num font-semibold text-[#dc2626]">
                -${insuranceDeduction.toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 text-sm">
              <span className="font-bold text-[#20243a]">Tổng thực nhận dự kiến</span>
              <span className="font-mono-num font-bold text-[#6f5ce8]">
                ${netEstimatedPay.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </section>

        {/* Personal Work-Life Balance Simulator */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Mô phỏng Cân bằng Công việc Cá nhân
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Thử đặt mục tiêu giảm tăng ca hoặc làm việc từ xa để xem mức độ rủi ro thay đổi ra sao.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">
                  Giờ tăng ca mục tiêu / tuần
                </span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {simOvertime}h
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={simOvertime}
                onChange={(e) => setSimOvertime(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">
                  Số ngày làm việc từ xa / tuần (giảm di chuyển)
                </span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {remoteDaysPerWeek} ngày · TB {effectiveDistance} km
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                value={remoteDaysPerWeek}
                onChange={(e) => setRemoteDaysPerWeek(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">
                  Cân bằng công việc / cuộc sống (1–5)
                </span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {simBalance}/5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={simBalance}
                onChange={(e) => setSimBalance(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#393d51]">
                  Mức hài lòng mục tiêu (1–5)
                </span>
                <span className="font-mono-num font-bold text-[#6f5ce8]">
                  {simSatisfaction}/5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={simSatisfaction}
                onChange={(e) => setSimSatisfaction(Number(e.target.value))}
                className="w-full accent-[#6f5ce8]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#faf9ff] p-3.5 text-xs">
            <div>
              <p className="text-[#74788d]">
                Hiện tại:{' '}
                <strong className="font-mono-num text-[#20243a]">
                  {currentEval.risk}%
                </strong>{' '}
                · Sau điều chỉnh:{' '}
                <strong
                  className={`font-mono-num ${
                    targetLevel === 'high'
                      ? 'text-[#dc2626]'
                      : targetLevel === 'medium'
                        ? 'text-[#d97706]'
                        : 'text-[#16a34a]'
                  }`}
                >
                  {targetEval.risk}% ({riskLabel(targetLevel)})
                </strong>
              </p>
              <p className="mt-1 text-[11px] text-[#52576c]">
                Chênh lệch:{' '}
                <span className="font-mono-num font-semibold">
                  {riskDelta > 0 ? `+${riskDelta}%` : `${riskDelta}%`}
                </span>{' '}
                · Gợi ý: {getSuggestedIntervention(employee)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onApplyBalanceGoal({
                  satisfaction: simSatisfaction,
                  balance: simBalance,
                  overtime: simOvertime,
                  distance: effectiveDistance,
                })
              }
              className="rounded-lg bg-[#6f5ce8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5542d2] whitespace-nowrap"
            >
              Lưu mục tiêu vào hồ sơ
            </button>
          </div>
        </section>

        {/* Career Progression & Readiness Roadmap */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Lộ trình Thăng tiến &amp; Phát triển
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Cấp bậc hiện tại: <strong>{employee.role}</strong> · Mục tiêu tiếp theo:{' '}
                <strong className="text-[#6f5ce8]">{nextRoleLabel}</strong>
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-[#6f5ce8]" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#52576c]">Mức độ sẵn sàng thăng bậc</span>
              <span className="font-mono-num font-bold text-[#6f5ce8]">
                {milestoneRatio}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#efeff5]">
              <div
                className="h-full rounded-full bg-[#6f5ce8] transition-all duration-200"
                style={{ width: `${milestoneRatio}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-1">
            {careerMilestones.map((ms) => (
              <div
                key={ms.label}
                className="flex items-center justify-between gap-3 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      ms.done ? 'text-[#16a34a]' : 'text-[#c9ccda]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={ms.done ? 'text-[#20243a] font-medium' : 'text-[#62677c]'}>
                    {ms.label}
                  </span>
                </div>
                <span className="font-mono-num shrink-0 font-semibold text-[#52576c]">
                  {ms.current}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Flexible Benefits Enrollment */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Đăng ký Gói Phúc lợi Linh hoạt
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Chọn các gói phúc lợi phù hợp nhu cầu trong hạn mức{' '}
                <span className="font-mono-num font-semibold text-[#20243a]">
                  ${BENEFIT_ANNUAL_LIMIT.toLocaleString('en-US')}/năm
                </span>
                .
              </p>
            </div>
            <Briefcase className="h-4 w-4 text-[#6f5ce8]" aria-hidden="true" />
          </div>

          <div className="divide-y divide-[#f1f2f7]">
            {benefits.map((item) => {
              const wouldExceed =
                !item.enrolled &&
                usedBenefitBudget + item.annualValue > BENEFIT_ANNUAL_LIMIT;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#20243a]">{item.title}</span>
                      <span aria-hidden="true" className="text-[#c1c5d6]">
                        ·
                      </span>
                      <span className="font-mono-num font-semibold text-[#6f5ce8]">
                        ${item.annualValue}/năm
                      </span>
                    </div>
                    <p className="text-xs text-[#62677c]">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={wouldExceed}
                    onClick={() => onToggleBenefit(item.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      item.enrolled
                        ? 'border border-[#c6ebd8] bg-[#f1fbf6] text-[#17784d] hover:bg-[#e1f6eb]'
                        : 'border border-[#e3e5ef] bg-white text-[#393d51] hover:border-[#6f5ce8] hover:text-[#5542d2] disabled:cursor-not-allowed disabled:opacity-45'
                    }`}
                  >
                    {item.enrolled
                      ? 'Đang sử dụng'
                      : wouldExceed
                        ? 'Vượt hạn mức'
                        : 'Đăng ký gói'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* HR Support Requests & 1-1 Scheduling */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#20243a]">
                Yêu cầu Hỗ trợ Nhân sự &amp; Lịch hẹn 1-1
              </h2>
              <p className="mt-0.5 text-xs text-[#74788d]">
                Gửi trực tiếp đề xuất điều chỉnh công việc, lương thưởng hoặc đặt lịch trao đổi 1-1 với Quản lý / HR.
              </p>
            </div>
            <LifeBuoy className="h-4 w-4 text-[#6f5ce8]" aria-hidden="true" />
          </div>

          <form onSubmit={handleHrSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Nhóm yêu cầu
              </span>
              <select
                value={hrCategory}
                onChange={(e) =>
                  setHrCategory(e.target.value as HrSupportRequest['category'])
                }
                className="w-full rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a]"
              >
                {HR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Nội dung đề xuất <span className="text-[#dc2626]">*</span>
              </span>
              <textarea
                rows={2}
                required
                placeholder="Mô tả cụ thể mong muốn hoặc thời gian bạn có thể trao đổi..."
                value={hrDetail}
                onChange={(e) => setHrDetail(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] p-2.5 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5542d2]"
            >
              Gửi yêu cầu tới HR
            </button>
          </form>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-2">
            {myHrRequests.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#8b8fa3]">
                Bạn chưa gửi yêu cầu hỗ trợ nhân sự nào.
              </p>
            ) : (
              myHrRequests.map((req) => (
                <div key={req.id} className="space-y-1 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#20243a]">{req.category}</span>
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
                  <p className="text-[#62677c]">{req.detail}</p>
                  <p className="font-mono-num text-[11px] text-[#8b8fa3]">
                    Gửi ngày {formatDateVi(req.createdAt)}
                  </p>
                  {req.adminNote && (
                    <p className="rounded-lg bg-[#f4f2ff] px-3 py-1.5 text-xs text-[#4b3bc0]">
                      <strong>Phản hồi HR:</strong> {req.adminNote}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
