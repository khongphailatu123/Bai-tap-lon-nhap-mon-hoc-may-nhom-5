import React, { useState } from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';
import {
  AnnouncementItem,
  CourseItem,
  GoalItem,
  LeaveRequest,
  PulseCheckInItem,
  SelfReviewItem,
  TaskItem,
} from '../types/staywise';
import { formatDateVi } from '../utils/staywiseModel';

interface EmployeeToolsViewProps {
  leaveRequests: LeaveRequest[];
  goals: GoalItem[];
  announcements: AnnouncementItem[];
  tasks: TaskItem[];
  courses: CourseItem[];
  selfReviews: SelfReviewItem[];
  pulseCheckIns: PulseCheckInItem[];
  onCreateLeave: (request: Omit<LeaveRequest, 'id' | 'employeeName' | 'status' | 'createdAt'>) => void;
  onCancelLeave: (id: string) => void;
  onCreateGoal: (title: string, targetDate: string) => void;
  onUpdateGoalProgress: (id: string, progress: number) => void;
  onDeleteGoal: (id: string) => void;
  onToggleAnnouncementRead: (id: string) => void;
  onCreateTask: (title: string, priority: TaskItem['priority'], dueDate: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEnrollCourse: (id: string) => void;
  onUpdateCourseProgress: (id: string, progress: number) => void;
  onSubmitFeedback: (topic: string, message: string) => void;
  onSubmitSelfReview: (payload: {
    period: string;
    achievements: string;
    blockers: string;
    rating: number;
  }) => void;
  onSubmitPulseCheckIn: (payload: {
    satisfaction: number;
    balance: number;
    overtime: number;
    note: string;
  }) => void;
}

export const EmployeeToolsView: React.FC<EmployeeToolsViewProps> = ({
  leaveRequests,
  goals,
  announcements,
  tasks,
  courses,
  selfReviews,
  pulseCheckIns,
  onCreateLeave,
  onCancelLeave,
  onCreateGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  onToggleAnnouncementRead,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onEnrollCourse,
  onUpdateCourseProgress,
  onSubmitFeedback,
  onSubmitSelfReview,
  onSubmitPulseCheckIn,
}) => {
  const [leaveType, setLeaveType] = useState('Nghỉ phép năm');
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2026-12-02');
  const [reason, setReason] = useState('');

  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('2026-12-30');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskItem['priority']>('Trung bình');
  const [taskDue, setTaskDue] = useState('2026-11-30');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [taskSearch, setTaskSearch] = useState('');

  const [fbTopic, setFbTopic] = useState('Khối lượng công việc');
  const [fbMessage, setFbMessage] = useState('');

  const [revPeriod, setRevPeriod] = useState('Quý IV / 2026');
  const [revAchievements, setRevAchievements] = useState('');
  const [revBlockers, setRevBlockers] = useState('');
  const [revRating, setRevRating] = useState(4);

  const [pulseSat, setPulseSat] = useState(4);
  const [pulseBal, setPulseBal] = useState(3);
  const [pulseOt, setPulseOt] = useState(6);
  const [pulseNote, setPulseNote] = useState('');

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onCreateLeave({
      type: leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    });
    setReason('');
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    onCreateGoal(goalTitle.trim(), goalDate);
    setGoalTitle('');
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onCreateTask(taskTitle.trim(), taskPriority, taskDue);
    setTaskTitle('');
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbMessage.trim()) return;
    onSubmitFeedback(fbTopic, fbMessage.trim());
    setFbMessage('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revAchievements.trim()) return;
    onSubmitSelfReview({
      period: revPeriod,
      achievements: revAchievements.trim(),
      blockers: revBlockers.trim() || 'Không có',
      rating: revRating,
    });
    setRevAchievements('');
    setRevBlockers('');
  };

  const handlePulseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitPulseCheckIn({
      satisfaction: pulseSat,
      balance: pulseBal,
      overtime: pulseOt,
      note: pulseNote.trim() || 'Cập nhật trạng thái tuần làm việc',
    });
    setPulseNote('');
  };

  const usedAnnualLeaveDays = leaveRequests
    .filter((r) => r.type === 'Nghỉ phép năm' && r.status !== 'Đã hủy')
    .length * 2;
  const remainingLeaveDays = Math.max(0, 12 - usedAnnualLeaveDays);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b8fa3]">
          Cổng nhân viên mở rộng
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#20243a]">
          Tiện ích nhân viên
        </h1>
        <p className="text-sm text-[#74788d]">
          Quản lý đơn nghỉ phép, check-in sức khỏe công việc, việc cần làm, OKR, khóa học nội bộ, góp ý ẩn danh và tự đánh giá.
        </p>
      </div>

      {/* 4-card quick summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Phép năm còn lại</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#16a34a]">
            {remainingLeaveDays}/12 ngày
          </p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Việc chưa xong</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#20243a]">
            {tasks.filter((t) => !t.done).length}
          </p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Khóa học đang tham gia</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#6f5ce8]">
            {courses.filter((c) => c.enrolled).length}
          </p>
        </div>
        <div className="rounded-xl border border-[#eceef4] bg-white p-4">
          <p className="text-xs text-[#74788d]">Thông báo chưa đọc</p>
          <p className="font-mono-num mt-1 text-2xl font-bold text-[#d97706]">
            {announcements.filter((a) => !a.read).length}
          </p>
        </div>
      </div>

      {/* Weekly Pulse Check-in */}
      <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Check-in Sức khỏe công việc hàng tuần (Pulse Survey)
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Gửi đánh giá nhanh cuối tuần — hệ thống sẽ cập nhật hồ sơ &amp; điểm rủi ro cá nhân của bạn.
            </p>
          </div>
          <span className="font-mono-num text-xs text-[#8b8fa3]">
            Đã gửi {pulseCheckIns.length} tuần
          </span>
        </div>

        <form onSubmit={handlePulseSubmit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-4">
          <label className="block space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#393d51]">Hài lòng tuần này</span>
              <span className="font-mono-num font-bold text-[#6f5ce8]">{pulseSat}/5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={pulseSat}
              onChange={(e) => setPulseSat(Number(e.target.value))}
              className="w-full accent-[#6f5ce8]"
            />
          </label>

          <label className="block space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#393d51]">Cân bằng cuộc sống</span>
              <span className="font-mono-num font-bold text-[#6f5ce8]">{pulseBal}/5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={pulseBal}
              onChange={(e) => setPulseBal(Number(e.target.value))}
              className="w-full accent-[#6f5ce8]"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[#393d51]">Giờ tăng ca thực tế</span>
            <input
              type="number"
              min={0}
              max={60}
              value={pulseOt}
              onChange={(e) => setPulseOt(Number(e.target.value))}
              className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-1.5 text-xs"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5542d2] whitespace-nowrap"
            >
              Gửi Check-in tuần
            </button>
          </div>

          <input
            type="text"
            placeholder="Ghi chú nhanh về khối lượng công việc tuần này (tùy chọn)..."
            value={pulseNote}
            onChange={(e) => setPulseNote(e.target.value)}
            className="sm:col-span-4 rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs focus:border-[#6f5ce8] focus:outline-none"
          />
        </form>

        <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-2">
          {pulseCheckIns.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
            >
              <div>
                <span className="font-semibold text-[#20243a]">{item.weekLabel}</span>
                <span className="mx-2 text-[#c1c5d6]">·</span>
                <span className="text-[#62677c]">{item.note}</span>
              </div>
              <div className="font-mono-num text-[11px] text-[#52576c]">
                Hài lòng {item.satisfaction}/5 · Cân bằng {item.balance}/5 · Tăng ca{' '}
                {item.overtime}h
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Leave Requests */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">Đăng ký nghỉ phép</h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Gửi yêu cầu nghỉ phép hoặc làm việc từ xa tới quản lý.
            </p>
          </div>

          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">Loại yêu cầu</span>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                >
                  <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                  <option value="Làm việc từ xa">Làm việc từ xa</option>
                  <option value="Nghỉ ốm">Nghỉ ốm</option>
                  <option value="Nghỉ bù">Nghỉ bù</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">Từ ngày</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[#393d51]">Đến ngày</span>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">Lý do</span>
              <input
                type="text"
                required
                placeholder="Nhập lý do cụ thể..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
            >
              Gửi yêu cầu
            </button>
          </form>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-3">
            {leaveRequests.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-1 last:pb-0"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#20243a]">{item.type}</span>
                    <span aria-hidden="true" className="text-[#c1c5d6]">
                      ·
                    </span>
                    <span className="font-mono-num text-[#74788d]">
                      {item.startDate} → {item.endDate}
                    </span>
                  </div>
                  <p className="text-xs text-[#62677c]">{item.reason}</p>
                  <p className="text-[11px] font-medium text-[#52576c]">
                    Trạng thái:{' '}
                    <span
                      className={
                        item.status === 'Đã duyệt'
                          ? 'text-[#16a34a]'
                          : item.status === 'Đã hủy'
                            ? 'text-[#8b8fa3]'
                            : 'text-[#d97706]'
                      }
                    >
                      {item.status}
                    </span>
                  </p>
                </div>
                {item.status === 'Chờ duyệt' && (
                  <button
                    type="button"
                    onClick={() => onCancelLeave(item.id)}
                    className="shrink-0 rounded-lg border border-[#e3e5ef] px-2.5 py-1 text-[11px] font-semibold text-[#c5474d] transition-colors hover:bg-[#fff1f2] whitespace-nowrap"
                  >
                    Hủy đơn
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Personal Tasks Checklist */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">Việc cần làm cá nhân</h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Lịch công việc ưu tiên hàng tuần của bạn.
            </p>
          </div>

          <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <input
              type="text"
              required
              placeholder="Thêm việc cần làm..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs sm:col-span-6 focus:border-[#6f5ce8] focus:outline-none"
            />
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskItem['priority'])}
              className="rounded-lg border border-[#e3e5ef] bg-white px-2 py-2 text-xs sm:col-span-3"
            >
              <option value="Cao">Ưu tiên Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[#6f5ce8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5542d2] sm:col-span-3 whitespace-nowrap"
            >
              Thêm việc
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-[#f5f5fa] p-1">
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'pending', label: 'Chưa xong' },
                  { id: 'done', label: 'Đã xong' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    taskFilter === tab.id
                      ? 'bg-white text-[#6f5ce8] shadow-xs'
                      : 'text-[#74788d] hover:text-[#20243a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="Tìm công việc..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full rounded-lg border border-[#e3e5ef] px-2.5 py-1 text-xs sm:w-44 focus:border-[#6f5ce8] focus:outline-none"
            />
          </div>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-2">
            {tasks
              .filter((t) => {
                if (taskFilter === 'pending' && t.done) return false;
                if (taskFilter === 'done' && !t.done) return false;
                if (
                  taskSearch.trim() &&
                  !t.title.toLowerCase().includes(taskSearch.trim().toLowerCase())
                ) {
                  return false;
                }
                return true;
              })
              .map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                  {task.done ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#8b8fa3]" />
                  )}
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-medium ${
                        task.done
                          ? 'text-[#8b8fa3] line-through'
                          : 'text-[#20243a]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="block text-[10px] text-[#8b8fa3]">
                      Ưu tiên {task.priority} · Hạn{' '}
                      <span className="font-mono-num">{task.dueDate}</span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  aria-label="Xóa việc"
                  className="rounded-lg p-1 text-[#8b8fa3] hover:bg-[#fff1f2] hover:text-[#c5474d]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Goals */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">Mục tiêu cá nhân (OKR)</h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Thêm mục tiêu công việc và kéo thanh tiến độ để cập nhật.
            </p>
          </div>

          <form onSubmit={handleGoalSubmit} className="flex flex-col gap-2.5 sm:flex-row">
            <input
              type="text"
              required
              placeholder="Tên mục tiêu mới..."
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="flex-1 rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
            <input
              type="date"
              required
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              className="font-mono-num rounded-lg border border-[#e3e5ef] px-2.5 py-2 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
            >
              Thêm
            </button>
          </form>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-3">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-2 py-3 first:pt-1 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#20243a]">{goal.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#74788d]">
                      Hạn hoàn thành:{' '}
                      <span className="font-mono-num">{goal.targetDate}</span> · Tiến độ:{' '}
                      <span className="font-mono-num font-semibold text-[#6f5ce8]">
                        {goal.progress}%
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteGoal(goal.id)}
                    aria-label={`Xóa mục tiêu ${goal.title}`}
                    className="rounded-lg p-1.5 text-[#8b8fa3] transition-colors hover:bg-[#fff1f2] hover:text-[#c5474d]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={goal.progress}
                  onChange={(e) =>
                    onUpdateGoalProgress(goal.id, Number(e.target.value))
                  }
                  aria-label={`Tiến độ ${goal.title}`}
                  className="h-1.5 w-full cursor-pointer accent-[#6f5ce8]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Anonymous Feedback & Self Review */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Góp ý ẩn danh tới Ban quản trị
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Hệ thống không lưu tên hay email của bạn khi gửi góp ý này.
            </p>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">Chủ đề</span>
              <select
                value={fbTopic}
                onChange={(e) => setFbTopic(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] bg-white px-2.5 py-2 text-xs"
              >
                <option value="Khối lượng công việc">Khối lượng công việc</option>
                <option value="Môi trường làm việc">Môi trường làm việc</option>
                <option value="Chính sách & phúc lợi">Chính sách &amp; phúc lợi</option>
                <option value="Đào tạo & phát triển">Đào tạo &amp; phát triển</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">Nội dung góp ý</span>
              <textarea
                rows={3}
                required
                placeholder="Chia sẻ đề xuất cải thiện môi trường làm việc..."
                value={fbMessage}
                onChange={(e) => setFbMessage(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] p-2.5 text-xs text-[#20243a] focus:border-[#6f5ce8] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg border border-[#d7d3fb] bg-[#f7f6ff] px-4 py-2 text-xs font-semibold text-[#5542d2] hover:bg-[#efecff]"
            >
              Gửi góp ý ẩn danh
            </button>
          </form>
        </section>

        {/* Internal Training Courses */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Khóa học phát triển nội bộ
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Đăng ký khóa học và cập nhật tiến độ học tập cá nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col justify-between gap-3 rounded-lg bg-[#faf9ff] p-4"
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[#6f5ce8]">
                    {course.category} ·{' '}
                    <span className="font-mono-num">{course.durationHours}h</span>
                  </p>
                  <h3 className="text-xs font-bold leading-snug text-[#20243a]">
                    {course.title}
                  </h3>
                </div>

                {course.enrolled ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-[#52576c]">
                      <span>Tiến độ</span>
                      <span className="font-mono-num font-semibold text-[#16a34a]">
                        {course.progress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={course.progress}
                      onChange={(e) =>
                        onUpdateCourseProgress(course.id, Number(e.target.value))
                      }
                      className="h-1.5 w-full accent-[#6f5ce8]"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEnrollCourse(course.id)}
                    className="w-full rounded-lg border border-[#d7d3fb] bg-white py-1.5 text-xs font-semibold text-[#5542d2] transition-colors hover:bg-[#f0edff]"
                  >
                    Đăng ký học
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Self-Review */}
        <section className="space-y-4 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">
              Phiếu tự đánh giá định kỳ
            </h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Gửi kết quả tự đánh giá để quản lý trực tiếp nắm bắt khó khăn và phản hồi kịp thời.
            </p>
          </div>

          <form onSubmit={handleReviewSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">Kỳ đánh giá</span>
              <input
                type="text"
                required
                value={revPeriod}
                onChange={(e) => setRevPeriod(e.target.value)}
                className="w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Tự chấm mức độ hoàn thành (1–5)
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={revRating}
                onChange={(e) => setRevRating(Number(e.target.value))}
                className="font-mono-num w-full rounded-lg border border-[#e3e5ef] px-3 py-2 text-xs"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Kết quả nổi bật <span className="text-[#dc2626]">*</span>
              </span>
              <textarea
                rows={2}
                required
                value={revAchievements}
                onChange={(e) => setRevAchievements(e.target.value)}
                placeholder="Các đầu việc chính đã hoàn thành..."
                className="w-full rounded-lg border border-[#e3e5ef] p-2.5 text-xs"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#393d51]">
                Khó khăn / Đề xuất hỗ trợ
              </span>
              <textarea
                rows={2}
                value={revBlockers}
                onChange={(e) => setRevBlockers(e.target.value)}
                placeholder="Điểm nghẽn cần quản lý tháo gỡ..."
                className="w-full rounded-lg border border-[#e3e5ef] p-2.5 text-xs"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5542d2]"
              >
                Gửi phiếu tự đánh giá
              </button>
            </div>
          </form>

          <div className="divide-y divide-[#f1f2f7] border-t border-[#f1f2f7] pt-3">
            {selfReviews.map((rev) => (
              <div key={rev.id} className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#20243a]">{rev.period}</span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span className="font-mono-num font-semibold text-[#6f5ce8]">
                    Điểm tự chấm: {rev.rating}/5
                  </span>
                  <span aria-hidden="true" className="text-[#c1c5d6]">
                    ·
                  </span>
                  <span className="font-mono-num text-[#8b8fa3]">
                    {formatDateVi(rev.createdAt)}
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
                    <strong>Phản hồi quản lý:</strong> {rev.adminReply}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="space-y-3 rounded-xl border border-[#eceef4] bg-white p-5 lg:col-span-2">
          <div>
            <h2 className="text-sm font-bold text-[#20243a]">Thông báo nội bộ</h2>
            <p className="mt-0.5 text-xs text-[#74788d]">
              Cập nhật chính sách và lịch trình chung từ bộ phận nhân sự.
            </p>
          </div>
          <div className="divide-y divide-[#f1f2f7]">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#20243a]">{item.title}</span>
                    <span aria-hidden="true" className="text-[#c1c5d6]">
                      ·
                    </span>
                    <span className="font-mono-num text-[#8b8fa3]">
                      {formatDateVi(item.date)}
                    </span>
                    <span aria-hidden="true" className="text-[#c1c5d6]">
                      ·
                    </span>
                    <span
                      className={
                        item.read
                          ? 'text-[#8b8fa3]'
                          : 'font-semibold text-[#6f5ce8]'
                      }
                    >
                      {item.read ? 'Đã đọc' : 'Chưa đọc'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#62677c]">{item.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAnnouncementRead(item.id)}
                  className="shrink-0 rounded-lg border border-[#e3e5ef] px-3 py-1.5 text-xs font-medium text-[#393d51] transition-colors hover:border-[#6f5ce8] hover:text-[#5542d2] whitespace-nowrap"
                >
                  {item.read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
