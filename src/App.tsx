import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Cpu,
  HeartHandshake,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AccountManagementView } from './components/AccountManagementView';
import { AdminAccountsView } from './components/AdminAccountsView';
import { AdminOverviewView } from './components/AdminOverviewView';
import { AnalyticsRoiView } from './components/AnalyticsRoiView';
import { AuthScreen } from './components/AuthScreen';
import { AvatarDisplay } from './components/AvatarDisplay';
import { AvatarMenuDropdown } from './components/AvatarMenuDropdown';
import { ConfirmDialog } from './components/ConfirmDialog';
import { EmployeeCareerView } from './components/EmployeeCareerView';
import { EmployeesDirectoryView } from './components/EmployeesDirectoryView';
import { EmployeeToolsView } from './components/EmployeeToolsView';
import { ModelLabView } from './components/ModelLabView';
import { MyHistoryView } from './components/MyHistoryView';
import { PredictionLabView } from './components/PredictionLabView';
import { RetentionActionsView } from './components/RetentionActionsView';
import {
  AccountDirectoryItem,
  AnnouncementItem,
  AnonymousFeedbackItem,
  AttendanceRecord,
  BenefitPackageItem,
  CourseItem,
  EmployeePageId,
  EmployeeProfile,
  GoalItem,
  HrSupportRequest,
  LeaveRequest,
  ModelWeights,
  PredictionRecord,
  PulseCheckInItem,
  RetentionPlan,
  SecurityActivityItem,
  SelfReviewItem,
  TaskItem,
  ToastMessage,
  UserAccount,
} from './types/staywise';
import {
  DEFAULT_MODEL_WEIGHTS,
  downloadJson,
  getSuggestedIntervention,
  INITIAL_ACCOUNTS,
  INITIAL_ADMIN_USER,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_BENEFITS,
  INITIAL_COURSES,
  INITIAL_EMPLOYEE,
  INITIAL_EMPLOYEES,
  INITIAL_FEEDBACK,
  INITIAL_GOALS,
  INITIAL_HR_REQUESTS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PREDICTIONS,
  INITIAL_PULSE_CHECKINS,
  INITIAL_RETENTION_PLANS,
  INITIAL_SECURITY_LOG,
  INITIAL_SELF_REVIEWS,
  INITIAL_TASKS,
  INITIAL_USER,
  predictRisk,
  readFileAsDataUrl,
  riskLevel,
} from './utils/staywiseModel';

const STORAGE_KEY = 'staywise_portal_state_v4';

interface StoredState {
  isAuthenticated: boolean;
  user: UserAccount;
  employee: EmployeeProfile;
  employees: EmployeeProfile[];
  accounts: AccountDirectoryItem[];
  predictions: PredictionRecord[];
  leaveRequests: LeaveRequest[];
  goals: GoalItem[];
  announcements: AnnouncementItem[];
  tasks: TaskItem[];
  courses: CourseItem[];
  feedbackList: AnonymousFeedbackItem[];
  selfReviews: SelfReviewItem[];
  retentionPlans: RetentionPlan[];
  modelWeights: ModelWeights;
  securityLogs: SecurityActivityItem[];
  pulseCheckIns: PulseCheckInItem[];
  attendanceLogs: AttendanceRecord[];
  benefits: BenefitPackageItem[];
  hrRequests: HrSupportRequest[];
}

function loadInitialState(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (parsed.user && parsed.employee && parsed.employees) {
        return {
          isAuthenticated: parsed.isAuthenticated ?? true,
          user: parsed.user,
          employee: parsed.employee,
          employees: parsed.employees,
          accounts: parsed.accounts ?? INITIAL_ACCOUNTS,
          predictions: parsed.predictions ?? INITIAL_PREDICTIONS,
          leaveRequests: parsed.leaveRequests ?? INITIAL_LEAVE_REQUESTS,
          goals: parsed.goals ?? INITIAL_GOALS,
          announcements: parsed.announcements ?? INITIAL_ANNOUNCEMENTS,
          tasks: parsed.tasks ?? INITIAL_TASKS,
          courses: parsed.courses ?? INITIAL_COURSES,
          feedbackList: parsed.feedbackList ?? INITIAL_FEEDBACK,
          selfReviews: parsed.selfReviews ?? INITIAL_SELF_REVIEWS,
          retentionPlans: parsed.retentionPlans ?? INITIAL_RETENTION_PLANS,
          modelWeights: parsed.modelWeights ?? DEFAULT_MODEL_WEIGHTS,
          securityLogs: parsed.securityLogs ?? INITIAL_SECURITY_LOG,
          pulseCheckIns: parsed.pulseCheckIns ?? INITIAL_PULSE_CHECKINS,
          attendanceLogs: parsed.attendanceLogs ?? INITIAL_ATTENDANCE_LOGS,
          benefits: parsed.benefits ?? INITIAL_BENEFITS,
          hrRequests: parsed.hrRequests ?? INITIAL_HR_REQUESTS,
        };
      }
    }
  } catch {
    // Fallback to defaults
  }
  return {
    isAuthenticated: true,
    user: INITIAL_ADMIN_USER,
    employee: INITIAL_EMPLOYEE,
    employees: INITIAL_EMPLOYEES,
    accounts: INITIAL_ACCOUNTS,
    predictions: INITIAL_PREDICTIONS,
    leaveRequests: INITIAL_LEAVE_REQUESTS,
    goals: INITIAL_GOALS,
    announcements: INITIAL_ANNOUNCEMENTS,
    tasks: INITIAL_TASKS,
    courses: INITIAL_COURSES,
    feedbackList: INITIAL_FEEDBACK,
    selfReviews: INITIAL_SELF_REVIEWS,
    retentionPlans: INITIAL_RETENTION_PLANS,
    modelWeights: DEFAULT_MODEL_WEIGHTS,
    securityLogs: INITIAL_SECURITY_LOG,
    pulseCheckIns: INITIAL_PULSE_CHECKINS,
    attendanceLogs: INITIAL_ATTENDANCE_LOGS,
    benefits: INITIAL_BENEFITS,
    hrRequests: INITIAL_HR_REQUESTS,
  };
}

const PAGE_LABELS: Record<EmployeePageId, string> = {
  overview: 'Tổng quan rủi ro',
  employees: 'Danh sách nhân viên',
  analytics: 'Phân tích & Chi phí ROI',
  predict: 'Mô phỏng What-If ML',
  model: 'Mô hình & Trọng số ML',
  actions: 'Kế hoạch giữ chân',
  admin: 'Tài khoản & yêu cầu',
  tools: 'Tiện ích nhân viên',
  career: 'Chấm công, Lương & Phúc lợi',
  history: 'Lịch sử của tôi',
  account: 'Quản lý tài khoản',
};

export default function App() {
  const [initial] = useState<StoredState>(loadInitialState);
  const [isAuthenticated, setIsAuthenticated] = useState(initial.isAuthenticated);
  const [activePage, setActivePage] = useState<EmployeePageId>(
    initial.user.role === 'admin' ? 'overview' : 'tools'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<UserAccount>(initial.user);
  const [employee, setEmployee] = useState<EmployeeProfile>(initial.employee);
  const [employees, setEmployees] = useState<EmployeeProfile[]>(initial.employees);
  const [accounts, setAccounts] = useState<AccountDirectoryItem[]>(initial.accounts);
  const [predictions, setPredictions] = useState<PredictionRecord[]>(
    initial.predictions
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(
    initial.leaveRequests
  );
  const [goals, setGoals] = useState<GoalItem[]>(initial.goals);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(
    initial.announcements
  );
  const [tasks, setTasks] = useState<TaskItem[]>(initial.tasks);
  const [courses, setCourses] = useState<CourseItem[]>(initial.courses);
  const [feedbackList, setFeedbackList] = useState<AnonymousFeedbackItem[]>(
    initial.feedbackList
  );
  const [selfReviews, setSelfReviews] = useState<SelfReviewItem[]>(
    initial.selfReviews
  );
  const [retentionPlans, setRetentionPlans] = useState<RetentionPlan[]>(
    initial.retentionPlans
  );
  const [modelWeights, setModelWeights] = useState<ModelWeights>(
    initial.modelWeights
  );
  const [securityLogs, setSecurityLogs] = useState<SecurityActivityItem[]>(
    initial.securityLogs
  );
  const [pulseCheckIns, setPulseCheckIns] = useState<PulseCheckInItem[]>(
    initial.pulseCheckIns
  );
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>(
    initial.attendanceLogs
  );
  const [benefits, setBenefits] = useState<BenefitPackageItem[]>(
    initial.benefits
  );
  const [hrRequests, setHrRequests] = useState<HrSupportRequest[]>(
    initial.hrRequests
  );

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const topAvatarTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarAvatarTriggerRef = useRef<HTMLButtonElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const payload: StoredState = {
        isAuthenticated,
        user,
        employee,
        employees,
        accounts,
        predictions,
        leaveRequests,
        goals,
        announcements,
        tasks,
        courses,
        feedbackList,
        selfReviews,
        retentionPlans,
        modelWeights,
        securityLogs,
        pulseCheckIns,
        attendanceLogs,
        benefits,
        hrRequests,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    isAuthenticated,
    user,
    employee,
    employees,
    accounts,
    predictions,
    leaveRequests,
    goals,
    announcements,
    tasks,
    courses,
    feedbackList,
    selfReviews,
    retentionPlans,
    modelWeights,
    securityLogs,
    pulseCheckIns,
    attendanceLogs,
    benefits,
    hrRequests,
  ]);

  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        notifPanelRef.current &&
        !notifPanelRef.current.contains(target) &&
        notifTriggerRef.current &&
        !notifTriggerRef.current.contains(target)
      ) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  const showToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, text, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    []
  );

  const appendSecurityLog = useCallback((action: string, detail: string) => {
    setSecurityLogs((prev) => [
      {
        id: `sec-${Date.now()}`,
        action,
        detail,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const navigateTo = useCallback((page: EmployeePageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    setTopMenuOpen(false);
    setSidebarMenuOpen(false);
    setNotifOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenPasswordSection = useCallback(() => {
    navigateTo('account');
    window.setTimeout(() => {
      const section = document.getElementById('password-section');
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      passwordInputRef.current?.focus();
    }, 80);
  }, [navigateTo]);

  const handleTriggerAvatarUpload = useCallback(() => {
    avatarFileInputRef.current?.click();
  }, []);

  const handleAvatarFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP.', 'error');
      input.value = '';
      return;
    }

    if (file.size > 512 * 1024) {
      showToast('Ảnh đại diện không được lớn hơn 512 KB.', 'error');
      input.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUser((prev) => ({ ...prev, avatarDataUrl: dataUrl }));
      appendSecurityLog('Đổi ảnh đại diện', `Cập nhật ảnh ${file.name}`);
      showToast(`Đã cập nhật ảnh đại diện (${file.name}).`);
    } catch {
      showToast('Không thể đọc tệp ảnh đại diện.', 'error');
    } finally {
      input.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setUser((prev) => ({ ...prev, avatarDataUrl: null }));
    appendSecurityLog('Xóa ảnh đại diện', 'Quay về chữ viết tắt mặc định');
    showToast('Đã xóa ảnh đại diện; đang dùng chữ viết tắt từ tên.');
  };

  const handleUpdateProfile = (updates: {
    name: string;
    email: string;
    department: string;
    tenure: number;
    age: number;
    salary: number;
    overtime: number;
    distance: number;
    satisfaction: number;
    balance: number;
  }) => {
    setUser((prev) => ({
      ...prev,
      name: updates.name,
      email: updates.email,
    }));

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === user.id
          ? { ...acc, name: updates.name, email: updates.email }
          : acc
      )
    );

    if (user.role === 'employee') {
      const nextEmployeeBase: Omit<EmployeeProfile, 'risk'> = {
        ...employee,
        ...updates,
      };
      const { risk } = predictRisk(nextEmployeeBase, modelWeights);
      const updatedEmp: EmployeeProfile = { ...nextEmployeeBase, risk };
      setEmployee(updatedEmp);
      setEmployees((prev) =>
        prev.map((item) => (item.id === updatedEmp.id ? updatedEmp : item))
      );
    }
    appendSecurityLog('Cập nhật hồ sơ', `Tên hiển thị: ${updates.name}`);
    showToast('Đã lưu thay đổi thông tin tài khoản.');
  };

  const handleChangePassword = (
    currentPassword: string,
    newPassword: string
  ): boolean => {
    if (!currentPassword.trim()) {
      showToast('Vui lòng nhập mật khẩu hiện tại.', 'error');
      return false;
    }
    setUser((prev) => ({
      ...prev,
      passwordLength: newPassword.length,
      lastPasswordChangeAt: new Date().toISOString(),
    }));
    appendSecurityLog('Đổi mật khẩu', 'Mật khẩu tài khoản đã được thay đổi');
    showToast('Đã cập nhật mật khẩu mới thành công.');
    return true;
  };

  const handleConfirmRevokeSessions = () => {
    setRevokeDialogOpen(false);
    setUser((prev) => ({
      ...prev,
      otherSessionsRevokedAt: new Date().toISOString(),
    }));
    appendSecurityLog(
      'Thu hồi phiên đăng nhập khác',
      'Đã đăng xuất khỏi các thiết bị khác'
    );
    showToast('Đã đăng xuất tất cả phiên trên thiết bị khác.');
  };

  const handleExportMyData = () => {
    downloadJson(
      {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        securityLogs,
        ...(user.role === 'admin'
          ? { accounts, employees, retentionPlans, leaveRequests, modelWeights }
          : {
              employee,
              predictions,
              leaveRequests,
              goals,
              tasks,
              courses,
              pulseCheckIns,
              attendanceLogs,
              benefits,
              hrRequests,
            }),
      },
      'staywise-du-lieu-tai-khoan.json'
    );
    showToast('Đã tải bản sao dữ liệu cá nhân (JSON).');
  };

  // Apply Model Weights across all employees
  const handleApplyModelWeights = (nextWeights: ModelWeights) => {
    setModelWeights(nextWeights);
    setEmployees((prev) =>
      prev.map((emp) => ({
        ...emp,
        risk: predictRisk(emp, nextWeights).risk,
      }))
    );
    setEmployee((prev) => ({
      ...prev,
      risk: predictRisk(prev, nextWeights).risk,
    }));
    showToast(
      `Đã áp dụng trọng số mới & ngưỡng ${nextWeights.threshold}% cho toàn bộ hệ thống.`
    );
  };

  // Employee CRUD & CSV
  const handleSaveEmployee = (
    data: Omit<EmployeeProfile, 'id' | 'risk'>,
    existingId?: string
  ) => {
    const id = existingId || `sw-${Date.now().toString().slice(-4)}`;
    const { risk } = predictRisk({ ...data, id }, modelWeights);
    const record: EmployeeProfile = { ...data, id, risk };

    if (existingId) {
      setEmployees((prev) => prev.map((e) => (e.id === existingId ? record : e)));
      showToast(`Đã cập nhật hồ sơ ${record.name}.`);
    } else {
      setEmployees((prev) => [record, ...prev]);
      showToast(`Đã thêm nhân viên ${record.name} (Rủi ro: ${risk}%).`);
    }
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    showToast('Đã xóa hồ sơ nhân viên.', 'info');
  };

  const handleImportEmployees = (imported: EmployeeProfile[]) => {
    const recalculated = imported.map((emp) => ({
      ...emp,
      risk: predictRisk(emp, modelWeights).risk,
    }));
    setEmployees((prev) => [...recalculated, ...prev]);
    showToast(`Đã nhập ${recalculated.length} hồ sơ nhân viên từ tệp CSV.`);
  };

  // Retention Plans
  const handleCreateQuickRetentionPlan = (emp: EmployeeProfile) => {
    const newPlan: RetentionPlan = {
      id: `ret-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      riskAtCreation: emp.risk,
      actionTitle: getSuggestedIntervention(emp),
      owner: 'Bùi Thanh Trúc (Nhân sự)',
      dueDate: '2026-12-20',
      status: 'Chờ thực hiện',
      notes: 'Tạo nhanh từ danh sách cảnh báo rủi ro cao.',
      createdAt: new Date().toISOString(),
    };
    setRetentionPlans((prev) => [newPlan, ...prev]);
    showToast(`Đã tạo kế hoạch giữ chân cho ${emp.name}.`);
  };

  const handleCreateRetentionPlan = (
    payload: Omit<RetentionPlan, 'id' | 'createdAt'>
  ) => {
    setRetentionPlans((prev) => [
      { id: `ret-${Date.now()}`, ...payload, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    showToast(`Đã lưu kế hoạch giữ chân cho ${payload.employeeName}.`);
  };

  const handleUpdateRetentionStatus = (
    id: string,
    status: RetentionPlan['status']
  ) => {
    setRetentionPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    showToast(`Đã chuyển trạng thái kế hoạch sang "${status}".`);
  };

  const handleDeleteRetentionPlan = (id: string) => {
    setRetentionPlans((prev) => prev.filter((p) => p.id !== id));
    showToast('Đã xóa kế hoạch giữ chân.', 'info');
  };

  // Predictions & Pulse Check-in
  const handleRunPersonalCheck = () => {
    const evaluation = predictRisk(employee, modelWeights);
    const nextRecord: PredictionRecord = {
      id: `pred-${Date.now()}`,
      employeeName: employee.name,
      createdAt: new Date().toISOString(),
      risk: evaluation.risk,
      level: riskLevel(evaluation.risk, modelWeights.threshold),
      satisfaction: employee.satisfaction,
      balance: employee.balance,
      overtime: employee.overtime,
      salary: employee.salary,
      factors: evaluation.factors,
    };
    setEmployee((prev) => ({ ...prev, risk: evaluation.risk }));
    setPredictions((prev) => [nextRecord, ...prev]);
    showToast(`Dự đoán tham khảo mới: ${evaluation.risk}%.`);
  };

  const handleSaveSimulationPrediction = (record: PredictionRecord) => {
    setPredictions((prev) => [record, ...prev]);
    showToast(`Đã lưu kết quả mô phỏng (${record.risk}%) vào lịch sử.`);
  };

  const handleSubmitPulseCheckIn = (payload: {
    satisfaction: number;
    balance: number;
    overtime: number;
    note: string;
  }) => {
    const weekNumber = Math.max(1, 47 + pulseCheckIns.length);
    const nextPulse: PulseCheckInItem = {
      id: `pulse-${Date.now()}`,
      weekLabel: `Tuần ${weekNumber} / 2026`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    setPulseCheckIns((prev) => [nextPulse, ...prev]);

    const nextBase: Omit<EmployeeProfile, 'risk'> = {
      ...employee,
      satisfaction: payload.satisfaction,
      balance: payload.balance,
      overtime: payload.overtime,
    };
    const evaluation = predictRisk(nextBase, modelWeights);
    const updatedEmp: EmployeeProfile = { ...nextBase, risk: evaluation.risk };
    setEmployee(updatedEmp);
    setEmployees((prev) =>
      prev.map((item) => (item.id === updatedEmp.id ? updatedEmp : item))
    );
    setPredictions((prev) => [
      {
        id: `pred-${Date.now()}`,
        employeeName: updatedEmp.name,
        createdAt: new Date().toISOString(),
        risk: evaluation.risk,
        level: riskLevel(evaluation.risk, modelWeights.threshold),
        satisfaction: payload.satisfaction,
        balance: payload.balance,
        overtime: payload.overtime,
        salary: updatedEmp.salary,
        factors: evaluation.factors,
      },
      ...prev,
    ]);
    showToast(`Đã ghi nhận Check-in tuần & cập nhật rủi ro: ${evaluation.risk}%.`);
  };

  // Employee Attendance, Benefits, HR Support & Balance Goal
  const handleClockIn = (workMode: AttendanceRecord['workMode']) => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const dateIso = now.toISOString().slice(0, 10);
    const nextRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      date: dateIso,
      checkIn: hhmm,
      checkOut: null,
      workMode,
      totalHours: 0,
    };
    setAttendanceLogs((prev) => [nextRecord, ...prev]);
    showToast(`Đã chấm công vào ca lúc ${hhmm} (${workMode}).`);
  };

  const handleClockOut = (recordId: string) => {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    setAttendanceLogs((prev) =>
      prev.map((item) => {
        if (item.id !== recordId) return item;
        const [inH, inM] = item.checkIn.split(':').map(Number);
        const [outH, outM] = hhmm.split(':').map(Number);
        const diffHours = Math.max(
          0.5,
          Number((((outH * 60 + outM) - (inH * 60 + inM)) / 60).toFixed(1))
        );
        return { ...item, checkOut: hhmm, totalHours: diffHours };
      })
    );
    showToast(`Đã chấm công tan ca lúc ${hhmm}.`);
  };

  const handleToggleBenefit = (benefitId: string) => {
    setBenefits((prev) =>
      prev.map((b) => (b.id === benefitId ? { ...b, enrolled: !b.enrolled } : b))
    );
    showToast('Đã cập nhật gói phúc lợi cá nhân.');
  };

  const handleSubmitHrRequest = (payload: {
    category: HrSupportRequest['category'];
    detail: string;
  }) => {
    const nextReq: HrSupportRequest = {
      id: `hr-${Date.now()}`,
      employeeName: user.name,
      ...payload,
      status: 'Chờ xử lý',
      adminNote: null,
      createdAt: new Date().toISOString(),
    };
    setHrRequests((prev) => [nextReq, ...prev]);
    showToast('Đã gửi yêu cầu hỗ trợ tới bộ phận Nhân sự.');
  };

  const handleUpdateHrRequest = (
    id: string,
    status: HrSupportRequest['status'],
    adminNote: string
  ) => {
    setHrRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, adminNote } : r))
    );
    showToast(`Đã cập nhật yêu cầu hỗ trợ sang trạng thái "${status}".`);
  };

  const handleApplyBalanceGoal = (updates: {
    satisfaction: number;
    balance: number;
    overtime: number;
    distance: number;
  }) => {
    const nextBase: Omit<EmployeeProfile, 'risk'> = {
      ...employee,
      ...updates,
    };
    const evaluation = predictRisk(nextBase, modelWeights);
    const updatedEmp: EmployeeProfile = { ...nextBase, risk: evaluation.risk };
    setEmployee(updatedEmp);
    setEmployees((prev) =>
      prev.map((item) => (item.id === updatedEmp.id ? updatedEmp : item))
    );
    showToast(
      `Đã cập nhật mục tiêu cân bằng vào hồ sơ (Rủi ro mới: ${evaluation.risk}%).`
    );
  };

  // Employee tools handlers
  const handleCreateLeave = (
    payload: Omit<LeaveRequest, 'id' | 'employeeName' | 'status' | 'createdAt'>
  ) => {
    const next: LeaveRequest = {
      id: `lv-${Date.now()}`,
      employeeName: user.name,
      ...payload,
      status: 'Chờ duyệt',
      createdAt: new Date().toISOString(),
    };
    setLeaveRequests((prev) => [next, ...prev]);
    showToast('Đã gửi đơn đăng ký nghỉ phép.');
  };

  const handleCancelLeave = (id: string) => {
    setLeaveRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Đã hủy' } : item
      )
    );
    showToast('Đã hủy đơn nghỉ phép.', 'info');
  };

  const handleUpdateLeaveStatus = (id: string, status: LeaveRequest['status']) => {
    setLeaveRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    showToast(`Đã cập nhật trạng thái đơn: ${status}.`);
  };

  const handleCreateGoal = (title: string, targetDate: string) => {
    setGoals((prev) => [
      { id: `goal-${Date.now()}`, title, targetDate, progress: 0 },
      ...prev,
    ]);
    showToast('Đã thêm mục tiêu cá nhân mới.');
  };

  const handleUpdateGoalProgress = (id: string, progress: number) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, progress } : goal))
    );
  };

  const handleDeleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    showToast('Đã xóa mục tiêu.', 'info');
  };

  const handleToggleAnnouncementRead = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item
      )
    );
  };

  const handleCreateTask = (
    title: string,
    priority: TaskItem['priority'],
    dueDate: string
  ) => {
    setTasks((prev) => [
      { id: `task-${Date.now()}`, title, priority, dueDate, done: false },
      ...prev,
    ]);
    showToast('Đã thêm việc cần làm mới.');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEnrollCourse = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enrolled: true, progress: 10 } : c))
    );
    showToast('Đã đăng ký khóa học nội bộ.');
  };

  const handleUpdateCourseProgress = (id: string, progress: number) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, progress } : c))
    );
  };

  const handleSubmitFeedback = (topic: string, message: string) => {
    setFeedbackList((prev) => [
      {
        id: `fb-${Date.now()}`,
        topic,
        message,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast('Đã gửi góp ý ẩn danh tới Ban quản trị.');
  };

  const handleSubmitSelfReview = (payload: {
    period: string;
    achievements: string;
    blockers: string;
    rating: number;
  }) => {
    setSelfReviews((prev) => [
      {
        id: `rev-${Date.now()}`,
        employeeName: user.name,
        ...payload,
        adminReply: null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    showToast('Đã gửi phiếu tự đánh giá định kỳ.');
  };

  const handlePublishAnnouncement = (title: string, body: string) => {
    setAnnouncements((prev) => [
      {
        id: `ann-${Date.now()}`,
        title,
        body,
        date: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
    showToast('Đã phát hành thông báo mới tới toàn thể nhân viên.');
  };

  const handleReplySelfReview = (id: string, reply: string) => {
    setSelfReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, adminReply: reply } : r))
    );
    showToast('Đã gửi phản hồi phiếu tự đánh giá.');
  };

  // Account management
  const handleCreateAccount = (payload: {
    name: string;
    email: string;
    role: 'admin' | 'employee';
    department: string;
    password: string;
  }): boolean => {
    if (!payload.name || !payload.email) {
      showToast('Vui lòng nhập họ tên và email.', 'error');
      return false;
    }
    if (payload.password.length < 10) {
      showToast('Mật khẩu phải có từ 10 đến 128 ký tự.', 'error');
      return false;
    }
    if (accounts.some((a) => a.email.toLowerCase() === payload.email.toLowerCase())) {
      showToast('Email này đã có tài khoản.', 'error');
      return false;
    }

    const created: AccountDirectoryItem = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email: payload.email.toLowerCase(),
      role: payload.role,
      active: true,
      department: payload.department,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [created, ...prev]);
    showToast(
      `Đã tạo tài khoản ${payload.role === 'admin' ? 'Admin' : 'Nhân viên'}: ${created.email}`
    );
    return true;
  };

  const handleToggleAccountActive = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, active: !acc.active } : acc))
    );
    showToast('Đã cập nhật trạng thái hoạt động của tài khoản.');
  };

  const handleToggleAccountRole = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? { ...acc, role: acc.role === 'admin' ? 'employee' : 'admin' }
          : acc
      )
    );
    showToast('Đã cập nhật vai trò tài khoản.');
  };

  const handleLogout = () => {
    setTopMenuOpen(false);
    setSidebarMenuOpen(false);
    setNotifOpen(false);
    setIsAuthenticated(false);
    showToast('Bạn đã đăng xuất khỏi StayWise.', 'info');
  };

  const handleLogin = (emailInput: string, roleHint?: 'admin' | 'employee') => {
    const matched = accounts.find(
      (a) => a.email.toLowerCase() === emailInput.toLowerCase()
    );

    if (matched && !matched.active) {
      showToast('Tài khoản này đã bị khóa.', 'error');
      return;
    }

    const resolvedRole =
      matched?.role ?? roleHint ?? (emailInput.includes('admin') ? 'admin' : 'employee');

    if (resolvedRole === 'admin') {
      setUser({
        ...INITIAL_ADMIN_USER,
        id: matched?.id ?? INITIAL_ADMIN_USER.id,
        name: matched?.name ?? 'Quản trị viên StayWise',
        email: matched?.email ?? emailInput,
      });
      setActivePage('overview');
    } else {
      const empName = matched?.name ?? INITIAL_USER.name;
      setUser({
        ...INITIAL_USER,
        id: matched?.id ?? INITIAL_USER.id,
        name: empName,
        email: matched?.email ?? emailInput,
      });
      setEmployee((prev) => ({
        ...prev,
        name: empName,
        email: matched?.email ?? emailInput,
        department: matched?.department ?? prev.department,
      }));
      setActivePage('tools');
    }

    appendSecurityLog('Đăng nhập phiên mới', `Tài khoản ${emailInput}`);
    setIsAuthenticated(true);
    showToast(
      `Đăng nhập thành công (${resolvedRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}).`
    );
  };

  const handleRegister = (
    nameInput: string,
    emailInput: string,
    departmentInput: string,
    roleInput: 'admin' | 'employee'
  ) => {
    if (accounts.some((a) => a.email.toLowerCase() === emailInput.toLowerCase())) {
      showToast('Email này đã tồn tại trong hệ thống.', 'error');
      return;
    }

    const newId = `usr-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newAccount: AccountDirectoryItem = {
      id: newId,
      name: nameInput,
      email: emailInput,
      role: roleInput,
      active: true,
      department: departmentInput,
      createdAt,
    };

    setAccounts((prev) => [newAccount, ...prev]);

    setUser({
      id: newId,
      name: nameInput,
      email: emailInput,
      role: roleInput,
      avatarDataUrl: null,
      createdAt,
      passwordLength: 12,
      lastPasswordChangeAt: null,
      otherSessionsRevokedAt: null,
    });

    if (roleInput === 'employee') {
      const newBase: Omit<EmployeeProfile, 'risk'> = {
        ...INITIAL_EMPLOYEE,
        id: `sw-${Math.floor(200 + Math.random() * 700)}`,
        name: nameInput,
        email: emailInput,
        department: departmentInput,
      };
      const evaluation = predictRisk(newBase, modelWeights);
      const createdEmp = { ...newBase, risk: evaluation.risk };
      setEmployee(createdEmp);
      setEmployees((prev) => [createdEmp, ...prev]);
      setActivePage('tools');
    } else {
      setActivePage('overview');
    }

    appendSecurityLog('Khởi tạo tài khoản', `${emailInput} (${roleInput})`);
    setIsAuthenticated(true);
    showToast(
      roleInput === 'admin'
        ? `Đã tạo tài khoản Admin: ${emailInput}`
        : `Đã tạo tài khoản Nhân viên: ${emailInput}`
    );
  };

  const isAdmin = user.role === 'admin';

  const notifications = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; target: EmployeePageId }> = [];
    if (isAdmin) {
      const highWithoutPlan = employees.filter(
        (e) =>
          e.risk >= modelWeights.threshold &&
          !retentionPlans.some(
            (p) => p.employeeId === e.id && p.status !== 'Hoàn thành'
          )
      );
      if (highWithoutPlan.length > 0) {
        items.push({
          id: 'n-high',
          title: `${highWithoutPlan.length} nhân sự rủi ro cao chưa có kế hoạch`,
          detail: 'Nhấn để mở Tổng quan rủi ro và tạo kế hoạch hỗ trợ.',
          target: 'overview',
        });
      }
      const pendingLeave = leaveRequests.filter((r) => r.status === 'Chờ duyệt').length;
      if (pendingLeave > 0) {
        items.push({
          id: 'n-leave',
          title: `${pendingLeave} đơn nghỉ phép đang chờ duyệt`,
          detail: 'Chuyển tới Tài khoản & yêu cầu để phê duyệt.',
          target: 'admin',
        });
      }
      const pendingHr = hrRequests.filter((r) => r.status === 'Chờ xử lý').length;
      if (pendingHr > 0) {
        items.push({
          id: 'n-hr',
          title: `${pendingHr} yêu cầu hỗ trợ nhân sự mới`,
          detail: 'Mở Tài khoản & yêu cầu để phản hồi nhân viên.',
          target: 'admin',
        });
      }
    } else {
      const unreadAnn = announcements.filter((a) => !a.read).length;
      if (unreadAnn > 0) {
        items.push({
          id: 'n-ann',
          title: `${unreadAnn} thông báo nội bộ chưa đọc`,
          detail: 'Xem trong mục Tiện ích nhân viên.',
          target: 'tools',
        });
      }
      const pendingTasks = tasks.filter((t) => !t.done).length;
      if (pendingTasks > 0) {
        items.push({
          id: 'n-task',
          title: `Bạn còn ${pendingTasks} đầu việc chưa hoàn thành`,
          detail: 'Kiểm tra danh sách việc cần làm.',
          target: 'tools',
        });
      }
      if (employee.overtime >= 10) {
        items.push({
          id: 'n-ot',
          title: `Cảnh báo tăng ca ${employee.overtime}h/tuần`,
          detail: 'Xem chế độ hỗ trợ cân bằng trong Chấm công, Lương & Phúc lợi.',
          target: 'career',
        });
      }
    }
    return items;
  }, [
    isAdmin,
    employees,
    modelWeights.threshold,
    retentionPlans,
    leaveRequests,
    hrRequests,
    announcements,
    tasks,
    employee.overtime,
  ]);

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
        <ToastStack toasts={toasts} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#20243a]">
      {/* Hidden shared avatar file picker */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleAvatarFileSelected}
        className="sr-only"
        aria-label="Chọn ảnh đại diện"
      />

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#181b2e]/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-[#eeeff4] bg-white px-4 py-6 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-7 flex items-center justify-between px-2">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              navigateTo(isAdmin ? 'overview' : 'tools');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
          >
            <span className="flex h-6 items-end gap-0.5 -skew-x-12">
              <span className="block h-3.5 w-1.5 rounded-sm bg-[#6f5ce8]" />
              <span className="block h-5 w-1.5 rounded-sm bg-[#9b8cff]" />
              <span className="block h-6 w-1.5 rounded-sm bg-[#b6aaff]" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-[#20243a]">
              staywise<span className="text-[#6f5ce8]">.</span>
            </span>
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng thanh điều hướng"
            className="rounded-lg p-1.5 text-[#74788d] hover:bg-[#f4f2ff] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Điều hướng">
          {isAdmin ? (
            <>
              <div>
                <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#a7a9b5]">
                  Phân tích &amp; Học máy
                </p>
                <div className="space-y-1">
                  <NavButton
                    active={activePage === 'overview'}
                    icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
                    label="Tổng quan rủi ro"
                    onClick={() => navigateTo('overview')}
                  />
                  <NavButton
                    active={activePage === 'employees'}
                    icon={<Users className="h-4 w-4 shrink-0" />}
                    label="Danh sách nhân viên"
                    count={employees.length}
                    onClick={() => navigateTo('employees')}
                  />
                  <NavButton
                    active={activePage === 'analytics'}
                    icon={<BarChart3 className="h-4 w-4 shrink-0" />}
                    label="Phân tích & Chi phí ROI"
                    onClick={() => navigateTo('analytics')}
                  />
                  <NavButton
                    active={activePage === 'predict'}
                    icon={<Activity className="h-4 w-4 shrink-0" />}
                    label="Mô phỏng What-If ML"
                    onClick={() => navigateTo('predict')}
                  />
                  <NavButton
                    active={activePage === 'model'}
                    icon={<Cpu className="h-4 w-4 shrink-0" />}
                    label="Mô hình & Trọng số ML"
                    onClick={() => navigateTo('model')}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#a7a9b5]">
                  Quản lý nhân sự
                </p>
                <div className="space-y-1">
                  <NavButton
                    active={activePage === 'actions'}
                    icon={<HeartHandshake className="h-4 w-4 shrink-0" />}
                    label="Kế hoạch giữ chân"
                    count={retentionPlans.length}
                    onClick={() => navigateTo('actions')}
                  />
                  <NavButton
                    active={activePage === 'admin'}
                    icon={<ShieldCheck className="h-4 w-4 shrink-0" />}
                    label="Tài khoản & yêu cầu"
                    count={accounts.length}
                    onClick={() => navigateTo('admin')}
                  />
                  <NavButton
                    active={activePage === 'account'}
                    icon={<UserCog className="h-4 w-4 shrink-0" />}
                    label="Quản lý tài khoản"
                    onClick={() => navigateTo('account')}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#a7a9b5]">
                Không gian nhân viên
              </p>
              <div className="space-y-1">
                <NavButton
                  active={activePage === 'tools'}
                  icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
                  label="Tiện ích nhân viên"
                  onClick={() => navigateTo('tools')}
                />
                <NavButton
                  active={activePage === 'career'}
                  icon={<Briefcase className="h-4 w-4 shrink-0" />}
                  label="Chấm công, Lương & Phúc lợi"
                  onClick={() => navigateTo('career')}
                />
                <NavButton
                  active={activePage === 'history'}
                  icon={<History className="h-4 w-4 shrink-0" />}
                  label="Lịch sử của tôi"
                  count={predictions.length}
                  onClick={() => navigateTo('history')}
                />
                <NavButton
                  active={activePage === 'account'}
                  icon={<UserCog className="h-4 w-4 shrink-0" />}
                  label="Quản lý tài khoản"
                  onClick={() => navigateTo('account')}
                />
              </div>
            </div>
          )}

          {/* Quick role switch helper */}
          <div className="rounded-xl border border-[#eceef4] bg-[#faf9ff] p-3">
            <p className="text-[11px] font-semibold text-[#393d51]">
              Chuyển nhanh vai trò
            </p>
            <p className="mt-0.5 text-[11px] text-[#74788d]">
              Đang xem: {isAdmin ? 'Quản trị viên' : 'Nhân viên'}
            </p>
            <button
              type="button"
              onClick={() =>
                handleLogin(
                  isAdmin ? 'minhanh.nguyen@staywise.vn' : 'admin@staywise.vn',
                  isAdmin ? 'employee' : 'admin'
                )
              }
              className="mt-2 w-full rounded-lg border border-[#d7d3fb] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5542d2] transition-colors hover:bg-[#f0edff]"
            >
              {isAdmin ? 'Thử cổng Nhân viên' : 'Vào trang Admin'}
            </button>
          </div>
        </nav>

        {/* Bottom Sidebar Clickable Avatar & Menu */}
        <div className="relative mt-4 border-t border-[#f0f0f4] pt-3.5">
          <div className="flex items-center gap-2">
            <button
              ref={sidebarAvatarTriggerRef}
              type="button"
              onClick={() => {
                setTopMenuOpen(false);
                setNotifOpen(false);
                setSidebarMenuOpen((prev) => !prev);
              }}
              aria-haspopup="menu"
              aria-expanded={sidebarMenuOpen}
              aria-label="Mở menu tài khoản"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-[#f7f6ff] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <AvatarDisplay
                name={user.name}
                avatarUrl={user.avatarDataUrl}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-[#20243a]">
                  {user.name}
                </span>
                <span className="block truncate text-[10px] text-[#8b8fa3]">
                  {user.email}
                </span>
              </span>
              <ChevronUp
                className={`h-3.5 w-3.5 shrink-0 text-[#8b8fa3] transition-transform duration-150 ${
                  sidebarMenuOpen ? 'rotate-180 text-[#6f5ce8]' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#74788d] transition-colors hover:bg-[#fff1f2] hover:text-[#c5474d]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <AvatarMenuDropdown
            isOpen={sidebarMenuOpen}
            onClose={() => setSidebarMenuOpen(false)}
            triggerRef={sidebarAvatarTriggerRef}
            placement="top-left"
            user={user}
            employee={employee}
            onNavigate={navigateTo}
            onOpenPasswordSection={handleOpenPasswordSection}
            onTriggerAvatarUpload={handleTriggerAvatarUpload}
            onExportMyData={handleExportMyData}
            onRequestRevokeSessions={() => setRevokeDialogOpen(true)}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[240px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-4 border-b border-[#eceef3] bg-white/95 px-4 backdrop-blur-xs sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#52576c] hover:bg-[#f4f2ff] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-xs text-[#8b8fa3]">
              <span className="hidden whitespace-nowrap sm:inline">
                Không gian làm việc
              </span>
              <span className="hidden text-[#d3d4dc] sm:inline">/</span>
              <strong className="truncate font-semibold text-[#20243a]">
                {PAGE_LABELS[activePage]}
              </strong>
            </div>
          </div>

          {/* Right Topbar: Notification Bell + Avatar Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <button
                ref={notifTriggerRef}
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  setSidebarMenuOpen(false);
                  setNotifOpen((prev) => !prev);
                }}
                aria-label="Thông báo hệ thống"
                aria-expanded={notifOpen}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#eceef4] bg-white text-[#52576c] transition-colors hover:border-[#d5d0fa] hover:bg-[#faf9ff] hover:text-[#6f5ce8]"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="font-mono-num absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#6f5ce8] px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  ref={notifPanelRef}
                  className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#e6e8f0] bg-white p-3 shadow-lg shadow-[#1b2343]/10"
                >
                  <div className="border-b border-[#f0f1f6] pb-2">
                    <h3 className="text-xs font-bold text-[#20243a]">
                      Thông báo &amp; Nhắc việc
                    </h3>
                  </div>
                  <div className="divide-y divide-[#f1f2f7] pt-1">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#8b8fa3]">
                        Hiện không có thông báo mới.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => navigateTo(n.target)}
                          className="block w-full rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[#f7f6ff]"
                        >
                          <p className="text-xs font-semibold text-[#20243a]">
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#74788d]">
                            {n.detail}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                ref={topAvatarTriggerRef}
                type="button"
                onClick={() => {
                  setSidebarMenuOpen(false);
                  setNotifOpen(false);
                  setTopMenuOpen((prev) => !prev);
                }}
                aria-haspopup="menu"
                aria-expanded={topMenuOpen}
                aria-label="Mở menu tài khoản"
                className="flex items-center gap-2 rounded-full border border-[#eceef4] bg-white py-1 pl-1 pr-2.5 transition-colors hover:border-[#d5d0fa] hover:bg-[#faf9ff] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
              >
                <AvatarDisplay
                  name={user.name}
                  avatarUrl={user.avatarDataUrl}
                  size="sm"
                />
                <span className="hidden max-w-[160px] truncate text-xs font-semibold text-[#20243a] sm:inline">
                  {user.name}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#74788d] transition-transform duration-150 ${
                    topMenuOpen ? 'rotate-180 text-[#6f5ce8]' : ''
                  }`}
                />
              </button>

              <AvatarMenuDropdown
                isOpen={topMenuOpen}
                onClose={() => setTopMenuOpen(false)}
                triggerRef={topAvatarTriggerRef}
                placement="bottom-right"
                user={user}
                employee={employee}
                onNavigate={navigateTo}
                onOpenPasswordSection={handleOpenPasswordSection}
                onTriggerAvatarUpload={handleTriggerAvatarUpload}
                onExportMyData={handleExportMyData}
                onRequestRevokeSessions={() => setRevokeDialogOpen(true)}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {/* Active View */}
        <main className="mx-auto max-w-[1200px] px-4 py-7 sm:px-8">
          {activePage === 'overview' && isAdmin && (
            <AdminOverviewView
              employees={employees}
              retentionPlans={retentionPlans}
              onNavigate={navigateTo}
              onCreateQuickRetentionPlan={handleCreateQuickRetentionPlan}
            />
          )}

          {activePage === 'employees' && isAdmin && (
            <EmployeesDirectoryView
              employees={employees}
              onSaveEmployee={handleSaveEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onImportEmployees={handleImportEmployees}
              onNotify={showToast}
            />
          )}

          {activePage === 'analytics' && isAdmin && (
            <AnalyticsRoiView
              employees={employees}
              highThreshold={modelWeights.threshold}
            />
          )}

          {activePage === 'predict' && isAdmin && (
            <PredictionLabView
              employees={employees}
              predictions={predictions}
              onSavePrediction={handleSaveSimulationPrediction}
            />
          )}

          {activePage === 'model' && isAdmin && (
            <ModelLabView
              employees={employees}
              weights={modelWeights}
              onApplyWeights={handleApplyModelWeights}
            />
          )}

          {activePage === 'actions' && isAdmin && (
            <RetentionActionsView
              employees={employees}
              plans={retentionPlans}
              onCreatePlan={handleCreateRetentionPlan}
              onUpdateStatus={handleUpdateRetentionStatus}
              onDeletePlan={handleDeleteRetentionPlan}
            />
          )}

          {activePage === 'admin' && isAdmin && (
            <AdminAccountsView
              currentUserId={user.id}
              accounts={accounts}
              leaveRequests={leaveRequests}
              feedbackList={feedbackList}
              selfReviews={selfReviews}
              hrRequests={hrRequests}
              onCreateAccount={handleCreateAccount}
              onToggleActive={handleToggleAccountActive}
              onToggleRole={handleToggleAccountRole}
              onUpdateLeaveStatus={handleUpdateLeaveStatus}
              onPublishAnnouncement={handlePublishAnnouncement}
              onReplySelfReview={handleReplySelfReview}
              onUpdateHrRequest={handleUpdateHrRequest}
            />
          )}

          {activePage === 'account' && (
            <AccountManagementView
              user={user}
              employee={employee}
              predictionCount={predictions.length}
              securityLogs={securityLogs}
              passwordInputRef={passwordInputRef}
              onUpdateProfile={handleUpdateProfile}
              onTriggerAvatarUpload={handleTriggerAvatarUpload}
              onRemoveAvatar={handleRemoveAvatar}
              onChangePassword={handleChangePassword}
              onRequestRevokeSessions={() => setRevokeDialogOpen(true)}
              onExportMyData={handleExportMyData}
              onNotify={showToast}
            />
          )}

          {activePage === 'tools' && !isAdmin && (
            <EmployeeToolsView
              leaveRequests={leaveRequests}
              goals={goals}
              announcements={announcements}
              tasks={tasks}
              courses={courses}
              selfReviews={selfReviews}
              pulseCheckIns={pulseCheckIns}
              onCreateLeave={handleCreateLeave}
              onCancelLeave={handleCancelLeave}
              onCreateGoal={handleCreateGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onDeleteGoal={handleDeleteGoal}
              onToggleAnnouncementRead={handleToggleAnnouncementRead}
              onCreateTask={handleCreateTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onEnrollCourse={handleEnrollCourse}
              onUpdateCourseProgress={handleUpdateCourseProgress}
              onSubmitFeedback={handleSubmitFeedback}
              onSubmitSelfReview={handleSubmitSelfReview}
              onSubmitPulseCheckIn={handleSubmitPulseCheckIn}
            />
          )}

          {activePage === 'career' && !isAdmin && (
            <EmployeeCareerView
              employee={employee}
              weights={modelWeights}
              attendanceLogs={attendanceLogs}
              benefits={benefits}
              hrRequests={hrRequests}
              retentionPlans={retentionPlans}
              courses={courses}
              goals={goals}
              selfReviews={selfReviews}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onToggleBenefit={handleToggleBenefit}
              onSubmitHrRequest={handleSubmitHrRequest}
              onApplyBalanceGoal={handleApplyBalanceGoal}
            />
          )}

          {activePage === 'history' && !isAdmin && (
            <MyHistoryView
              employee={employee}
              predictions={predictions}
              onRunPersonalCheck={handleRunPersonalCheck}
            />
          )}
        </main>
      </div>

      {/* In-app confirmation modal for revoking other sessions */}
      <ConfirmDialog
        open={revokeDialogOpen}
        title="Đăng xuất khỏi các thiết bị khác?"
        description="Tất cả phiên đăng nhập trên trình duyệt hoặc thiết bị khác sẽ bị thu hồi ngay lập tức. Phiên làm việc hiện tại của bạn vẫn được giữ nguyên."
        confirmLabel="Xác nhận đăng xuất phiên khác"
        onConfirm={handleConfirmRevokeSessions}
        onCancel={() => setRevokeDialogOpen(false)}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#f0edff] font-semibold text-[#5946d5]'
          : 'text-[#62677c] hover:bg-[#f7f6ff] hover:text-[#5946d5]'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {typeof count === 'number' && (
        <span className="font-mono-num ml-auto text-[11px] text-[#8b8fa3]">
          {count}
        </span>
      )}
    </button>
  );
}

function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone =
          toast.type === 'error'
            ? 'border-[#f3cccc] bg-[#fff5f5] text-[#a5383c]'
            : toast.type === 'info'
              ? 'border-[#d7d3fb] bg-[#f6f4ff] text-[#4c3bc4]'
              : 'border-[#c6ebd8] bg-[#f1fbf6] text-[#17784d]';

        return (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-2.5 text-xs font-medium shadow-md ${tone}`}
          >
            {toast.text}
          </div>
        );
      })}
    </div>
  );
}
