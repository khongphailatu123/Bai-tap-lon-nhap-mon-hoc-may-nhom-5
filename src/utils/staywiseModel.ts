import {
  AccountDirectoryItem,
  AnnouncementItem,
  AnonymousFeedbackItem,
  AttendanceRecord,
  BenefitPackageItem,
  CourseItem,
  EmployeeProfile,
  GoalItem,
  HrSupportRequest,
  LeaveRequest,
  ModelWeights,
  PredictionRecord,
  PulseCheckInItem,
  RetentionPlan,
  RiskFactor,
  RiskLevel,
  SecurityActivityItem,
  SelfReviewItem,
  TaskItem,
  UserAccount,
} from '../types/staywise';

export const DEFAULT_AVATAR_URL =
  '/src/assets/images/avatar_employee_default_1795057870374.jpg';

export const DEFAULT_MODEL_WEIGHTS: ModelWeights = {
  intercept: -1.15,
  satisfaction: 0.7,
  balance: 0.52,
  overtime: 0.075,
  tenure: 0.32,
  salary: 0.48,
  distance: 0.015,
  threshold: 65,
};

const FACTOR_LABELS: Record<string, string> = {
  satisfaction: 'Mức hài lòng',
  balance: 'Cân bằng công việc / cuộc sống',
  overtime: 'Số giờ làm thêm',
  tenure: 'Thâm niên',
  salary: 'Mức lương',
  distance: 'Khoảng cách đi làm',
};

export function riskLevel(score: number, highThreshold = 65): RiskLevel {
  if (score >= highThreshold) return 'high';
  if (score >= Math.max(20, highThreshold - 30)) return 'medium';
  return 'low';
}

export function riskLabel(level: RiskLevel): string {
  if (level === 'high') return 'Rủi ro cao';
  if (level === 'medium') return 'Rủi ro trung bình';
  return 'Rủi ro thấp';
}

export function predictRisk(
  employee: Omit<EmployeeProfile, 'risk'>,
  weights: ModelWeights = DEFAULT_MODEL_WEIGHTS
): {
  risk: number;
  factors: RiskFactor[];
} {
  const effects: Record<string, number> = {
    satisfaction: (3 - employee.satisfaction) * weights.satisfaction,
    balance: (3 - employee.balance) * weights.balance,
    overtime: Math.max(0, employee.overtime - 5) * weights.overtime,
    tenure: Math.max(0, 3 - employee.tenure) * weights.tenure,
    salary: (Math.max(0, 12000 - employee.salary) / 12000) * weights.salary,
    distance: employee.distance * weights.distance,
  };

  const logit =
    weights.intercept +
    Object.values(effects).reduce((sum, val) => sum + val, 0);
  const score = Math.floor(100 / (1 + Math.exp(-logit)) + 0.5);
  const risk = Math.min(96, Math.max(4, score));

  const factors: RiskFactor[] = Object.entries(effects).map(([key, effect]) => ({
    key,
    label: FACTOR_LABELS[key] || key,
    effect,
  }));

  return { risk, factors };
}

export function evaluateModelMetrics(
  employees: EmployeeProfile[],
  weights: ModelWeights
) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  employees.forEach((emp) => {
    // Ground-truth benchmark label based on historical attrition pattern
    const actualLeave =
      emp.satisfaction <= 2 ||
      (emp.overtime >= 13 && emp.balance <= 3) ||
      (emp.tenure < 1.5 && emp.salary < 8000);
    const predScore = predictRisk(emp, weights).risk;
    const predictedLeave = predScore >= weights.threshold;

    if (predictedLeave && actualLeave) tp += 1;
    else if (predictedLeave && !actualLeave) fp += 1;
    else if (!predictedLeave && !actualLeave) tn += 1;
    else fn += 1;
  });

  const total = Math.max(1, tp + fp + tn + fn);
  const accuracy = Math.round(((tp + tn) / total) * 100);
  const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : 0;
  const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : 0;
  const f1 =
    precision + recall > 0
      ? Math.round((2 * precision * recall) / (precision + recall))
      : 0;

  return { tp, fp, tn, fn, accuracy, precision, recall, f1 };
}

export function getSuggestedIntervention(employee: EmployeeProfile): string {
  const { factors } = predictRisk(employee);
  const top = [...factors].sort((a, b) => b.effect - a.effect)[0];
  switch (top?.key) {
    case 'satisfaction':
      return 'Trao đổi 1-1 lắng nghe kỳ vọng công việc & lộ trình phát triển';
    case 'balance':
      return 'Áp dụng lịch làm việc linh hoạt & giảm áp lực ngoài giờ';
    case 'overtime':
      return 'Phân bổ lại khối lượng công việc, giới hạn tăng ca dưới 8h/tuần';
    case 'salary':
      return 'Rà soát bậc lương, thưởng hiệu suất và phụ cấp định kỳ';
    case 'distance':
      return 'Hỗ trợ làm việc từ xa 2 ngày/tuần hoặc phụ cấp đi lại';
    default:
      return 'Tăng cường kết nối mentor cho nhân sự có thâm niên dưới 3 năm';
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  return parts
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function formatDateVi(isoString: string | null): string {
  if (!isoString) return 'Chưa có';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Chưa xác định';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeVi(isoString: string | null): string {
  if (!isoString) return 'Chưa có';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Chưa xác định';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadEmployeesCsv(employees: EmployeeProfile[]): void {
  const headers = [
    'id',
    'name',
    'email',
    'department',
    'role',
    'tenure',
    'satisfaction',
    'salary',
    'overtime',
    'distance',
    'age',
    'balance',
    'risk',
  ];
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = employees.map((e) =>
    [
      e.id,
      e.name,
      e.email,
      e.department,
      e.role,
      e.tenure,
      e.satisfaction,
      e.salary,
      e.overtime,
      e.distance,
      e.age,
      e.balance,
      e.risk,
    ]
      .map(escapeCell)
      .join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'staywise-nhan-vien.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseEmployeesCsv(text: string): EmployeeProfile[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key);
  const results: EmployeeProfile[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const name = cols[idx('name')];
    if (!name) continue;

    const base: Omit<EmployeeProfile, 'risk'> = {
      id: `sw-${Date.now().toString().slice(-4)}-${i}`,
      name,
      email:
        cols[idx('email')] ||
        `${name.toLowerCase().replace(/\s+/g, '.')}@staywise.vn`,
      department: cols[idx('department')] || 'Kỹ thuật',
      role: cols[idx('role')] || 'Nhân viên',
      tenure: Math.min(40, Math.max(0, Number(cols[idx('tenure')]) || 1)),
      satisfaction: Math.min(5, Math.max(1, Number(cols[idx('satisfaction')]) || 3)),
      salary: Math.min(1000000, Math.max(0, Number(cols[idx('salary')]) || 8500)),
      overtime: Math.min(100, Math.max(0, Number(cols[idx('overtime')]) || 5)),
      distance: Math.min(1000, Math.max(0, Number(cols[idx('distance')]) || 10)),
      age: Math.min(90, Math.max(18, Number(cols[idx('age')]) || 28)),
      balance: Math.min(5, Math.max(1, Number(cols[idx('balance')]) || 3)),
    };
    results.push({ ...base, risk: predictRisk(base).risk });
  }
  return results;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể đọc tệp ảnh.'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

const RAW_SEED_EMPLOYEES: Omit<EmployeeProfile, 'risk'>[] = [
  { id: 'sw-101', name: 'Nguyễn Minh Anh', email: 'minhanh.nguyen@staywise.vn', department: 'Kỹ thuật', role: 'Chuyên viên', tenure: 1.2, satisfaction: 1, salary: 7500, overtime: 18, distance: 24, age: 27, balance: 2 },
  { id: 'sw-102', name: 'Trần Quốc Bảo', email: 'quocbao.tran@staywise.vn', department: 'Kinh doanh', role: 'Trưởng nhóm', tenure: 2.4, satisfaction: 2, salary: 9200, overtime: 14, distance: 18, age: 31, balance: 2 },
  { id: 'sw-103', name: 'Lê Hoàng Yến', email: 'hoangyen.le@staywise.vn', department: 'Marketing', role: 'Chuyên viên', tenure: 0.8, satisfaction: 2, salary: 6800, overtime: 12, distance: 32, age: 25, balance: 2 },
  { id: 'sw-104', name: 'Phạm Gia Huy', email: 'giahuy.pham@staywise.vn', department: 'Kỹ thuật', role: 'Nhân viên', tenure: 3.1, satisfaction: 3, salary: 11000, overtime: 13, distance: 12, age: 29, balance: 3 },
  { id: 'sw-105', name: 'Võ Ngọc Mai', email: 'ngocmai.vo@staywise.vn', department: 'Kinh doanh', role: 'Chuyên viên', tenure: 1.5, satisfaction: 2, salary: 7900, overtime: 9, distance: 20, age: 26, balance: 2 },
  { id: 'sw-106', name: 'Đặng Tuấn Kiệt', email: 'tuankiet.dang@staywise.vn', department: 'Tài chính', role: 'Chuyên viên', tenure: 5.2, satisfaction: 3, salary: 13000, overtime: 8, distance: 11, age: 34, balance: 3 },
  { id: 'sw-107', name: 'Bùi Thanh Trúc', email: 'thanhtruc.bui@staywise.vn', department: 'Nhân sự', role: 'Nhân viên', tenure: 2.8, satisfaction: 3, salary: 8500, overtime: 6, distance: 8, age: 30, balance: 3 },
  { id: 'sw-108', name: 'Đỗ Nhật Nam', email: 'nhatnam.do@staywise.vn', department: 'Vận hành', role: 'Trưởng nhóm', tenure: 4.1, satisfaction: 4, salary: 14500, overtime: 6, distance: 15, age: 36, balance: 4 },
  { id: 'sw-109', name: 'Hồ Thảo Nhi', email: 'thaonhi.ho@staywise.vn', department: 'Marketing', role: 'Nhân viên', tenure: 0.9, satisfaction: 4, salary: 7200, overtime: 4, distance: 9, age: 24, balance: 4 },
  { id: 'sw-110', name: 'Dương Đức Anh', email: 'ducanh.duong@staywise.vn', department: 'Kỹ thuật', role: 'Quản lý', tenure: 8.3, satisfaction: 4, salary: 22000, overtime: 5, distance: 17, age: 41, balance: 4 },
  { id: 'sw-111', name: 'Mai Phương Linh', email: 'phuonglinh.mai@staywise.vn', department: 'Kinh doanh', role: 'Nhân viên', tenure: 3.4, satisfaction: 4, salary: 9300, overtime: 4, distance: 6, age: 29, balance: 4 },
  { id: 'sw-112', name: 'Ngô Thành Long', email: 'thanhlong.ngo@staywise.vn', department: 'Vận hành', role: 'Chuyên viên', tenure: 6.7, satisfaction: 5, salary: 15500, overtime: 3, distance: 14, age: 38, balance: 5 },
  { id: 'sw-113', name: 'Cao Bảo Châu', email: 'baochau.cao@staywise.vn', department: 'Tài chính', role: 'Trưởng nhóm', tenure: 7.1, satisfaction: 5, salary: 17500, overtime: 4, distance: 10, age: 39, balance: 5 },
  { id: 'sw-114', name: 'Vũ Khánh Vy', email: 'khanhvy.vu@staywise.vn', department: 'Nhân sự', role: 'Chuyên viên', tenure: 4.6, satisfaction: 4, salary: 11500, overtime: 2, distance: 5, age: 33, balance: 4 },
  { id: 'sw-115', name: 'Đinh Quang Minh', email: 'quangminh.dinh@staywise.vn', department: 'Kỹ thuật', role: 'Trưởng nhóm', tenure: 6.2, satisfaction: 3, salary: 16800, overtime: 7, distance: 21, age: 37, balance: 3 },
  { id: 'sw-116', name: 'Phan Diệu My', email: 'dieumy.phan@staywise.vn', department: 'Marketing', role: 'Quản lý', tenure: 5.8, satisfaction: 5, salary: 19000, overtime: 3, distance: 7, age: 36, balance: 5 },
];

export const INITIAL_EMPLOYEES: EmployeeProfile[] = RAW_SEED_EMPLOYEES.map((emp) => ({
  ...emp,
  risk: predictRisk(emp).risk,
}));

export const INITIAL_USER: UserAccount = {
  id: 'usr-101',
  name: 'Nguyễn Minh Anh',
  email: 'minhanh.nguyen@staywise.vn',
  role: 'employee',
  avatarDataUrl: DEFAULT_AVATAR_URL,
  createdAt: '2025-09-12T08:30:00Z',
  passwordLength: 12,
  lastPasswordChangeAt: null,
  otherSessionsRevokedAt: null,
};

export const INITIAL_ADMIN_USER: UserAccount = {
  id: 'usr-admin-01',
  name: 'Quản trị viên StayWise',
  email: 'admin@staywise.vn',
  role: 'admin',
  avatarDataUrl: null,
  createdAt: '2025-09-01T08:00:00Z',
  passwordLength: 16,
  lastPasswordChangeAt: null,
  otherSessionsRevokedAt: null,
};

export const INITIAL_EMPLOYEE: EmployeeProfile = INITIAL_EMPLOYEES[0];

export const INITIAL_ACCOUNTS: AccountDirectoryItem[] = [
  {
    id: 'usr-admin-01',
    name: 'Quản trị viên StayWise',
    email: 'admin@staywise.vn',
    role: 'admin',
    active: true,
    department: 'Quản trị hệ thống',
    createdAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'usr-101',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh.nguyen@staywise.vn',
    role: 'employee',
    active: true,
    department: 'Kỹ thuật',
    createdAt: '2025-09-12T08:30:00Z',
  },
  {
    id: 'usr-102',
    name: 'Trần Quốc Bảo',
    email: 'quocbao.tran@staywise.vn',
    role: 'employee',
    active: true,
    department: 'Kinh doanh',
    createdAt: '2025-10-03T09:15:00Z',
  },
  {
    id: 'usr-103',
    name: 'Lê Hoàng Yến',
    email: 'hoangyen.le@staywise.vn',
    role: 'employee',
    active: true,
    department: 'Marketing',
    createdAt: '2025-10-20T14:10:00Z',
  },
];

export const INITIAL_PREDICTIONS: PredictionRecord[] = [
  {
    id: 'pred-1002',
    employeeName: 'Nguyễn Minh Anh',
    createdAt: '2026-11-15T09:20:00Z',
    risk: INITIAL_EMPLOYEES[0].risk,
    level: riskLevel(INITIAL_EMPLOYEES[0].risk),
    satisfaction: INITIAL_EMPLOYEES[0].satisfaction,
    balance: INITIAL_EMPLOYEES[0].balance,
    overtime: INITIAL_EMPLOYEES[0].overtime,
    salary: INITIAL_EMPLOYEES[0].salary,
    factors: predictRisk(INITIAL_EMPLOYEES[0]).factors,
  },
  {
    id: 'pred-1001',
    employeeName: 'Trần Quốc Bảo',
    createdAt: '2026-10-12T14:45:00Z',
    risk: INITIAL_EMPLOYEES[1].risk,
    level: riskLevel(INITIAL_EMPLOYEES[1].risk),
    satisfaction: INITIAL_EMPLOYEES[1].satisfaction,
    balance: INITIAL_EMPLOYEES[1].balance,
    overtime: INITIAL_EMPLOYEES[1].overtime,
    salary: INITIAL_EMPLOYEES[1].salary,
    factors: predictRisk(INITIAL_EMPLOYEES[1]).factors,
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lv-01',
    employeeName: 'Nguyễn Minh Anh',
    type: 'Nghỉ phép năm',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
    reason: 'Giải quyết việc gia đình tại quê',
    status: 'Chờ duyệt',
    createdAt: '2026-11-16T08:15:00Z',
  },
  {
    id: 'lv-02',
    employeeName: 'Nguyễn Minh Anh',
    type: 'Làm việc từ xa',
    startDate: '2026-11-05',
    endDate: '2026-11-05',
    reason: 'Hoàn thiện báo cáo kỹ thuật quý IV',
    status: 'Đã duyệt',
    createdAt: '2026-11-01T10:00:00Z',
  },
];

export const INITIAL_GOALS: GoalItem[] = [
  {
    id: 'goal-1',
    title: 'Hoàn thành tối ưu hóa pipeline dữ liệu Q4',
    targetDate: '2026-12-20',
    progress: 75,
  },
  {
    id: 'goal-2',
    title: 'Chứng chỉ Machine Learning cơ bản nội bộ',
    targetDate: '2026-12-05',
    progress: 50,
  },
];

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Lịch rà soát mục tiêu cá nhân Quý IV',
    body: 'Các bộ phận hoàn tất cập nhật tiến độ OKR và gửi tự đánh giá trước ngày 05/12.',
    date: '2026-11-14T09:00:00Z',
    read: false,
  },
  {
    id: 'ann-2',
    title: 'Chính sách hỗ trợ cân bằng công việc',
    body: 'Nhân viên có giờ làm thêm vượt 12 giờ/tuần có thể đăng ký ngày nghỉ bù linh hoạt.',
    date: '2026-11-04T08:30:00Z',
    read: true,
  },
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Cập nhật báo cáo sprint tuần 46',
    priority: 'Cao',
    dueDate: '2026-11-22',
    done: false,
  },
  {
    id: 'task-2',
    title: 'Hoàn thành phiếu tự đánh giá định kỳ Q4',
    priority: 'Trung bình',
    dueDate: '2026-11-28',
    done: false,
  },
  {
    id: 'task-3',
    title: 'Kiểm tra lại thông tin tài khoản cá nhân',
    priority: 'Thấp',
    dueDate: '2026-11-19',
    done: true,
  },
];

export const INITIAL_COURSES: CourseItem[] = [
  {
    id: 'crs-1',
    title: 'Kỹ năng quản lý thời gian & giảm quá tải',
    category: 'Kỹ năng mềm',
    durationHours: 4,
    enrolled: true,
    progress: 60,
  },
  {
    id: 'crs-2',
    title: 'Phân tích dữ liệu Python thực chiến',
    category: 'Kỹ thuật',
    durationHours: 12,
    enrolled: false,
    progress: 0,
  },
  {
    id: 'crs-3',
    title: 'Giao tiếp hiệu quả trong nhóm đa chức năng',
    category: 'Lãnh đạo',
    durationHours: 6,
    enrolled: true,
    progress: 100,
  },
  {
    id: 'crs-4',
    title: 'Bảo mật thông tin doanh nghiệp cơ bản',
    category: 'Tuân thủ',
    durationHours: 3,
    enrolled: false,
    progress: 0,
  },
];

export const INITIAL_FEEDBACK: AnonymousFeedbackItem[] = [
  {
    id: 'fb-1',
    topic: 'Khối lượng công việc',
    message: 'Đề xuất bổ sung thêm nhân lực hỗ trợ giai đoạn cao điểm cuối quý để giảm tăng ca kéo dài.',
    createdAt: '2026-11-14T15:30:00Z',
  },
];

export const INITIAL_SELF_REVIEWS: SelfReviewItem[] = [
  {
    id: 'rev-1',
    employeeName: 'Nguyễn Minh Anh',
    period: 'Quý IV / 2026',
    achievements: 'Hoàn thành tích hợp module chuẩn hóa dữ liệu CSV và tối ưu tốc độ xử lý 30%.',
    blockers: 'Thời gian làm thêm tăng cao trong 2 tuần đầu tháng 11.',
    rating: 4,
    adminReply: 'Ghi nhận đóng góp tích cực. Quản lý trực tiếp sẽ điều phối lại lịch trực tuần tới.',
    createdAt: '2026-11-10T11:20:00Z',
  },
];

export const INITIAL_RETENTION_PLANS: RetentionPlan[] = [
  {
    id: 'ret-1',
    employeeId: INITIAL_EMPLOYEES[0].id,
    employeeName: INITIAL_EMPLOYEES[0].name,
    department: INITIAL_EMPLOYEES[0].department,
    riskAtCreation: INITIAL_EMPLOYEES[0].risk,
    actionTitle: 'Giảm giờ làm thêm xuống dưới 8h/tuần và trao đổi 1-1',
    owner: 'Dương Đức Anh (Quản lý Kỹ thuật)',
    dueDate: '2026-12-05',
    status: 'Đang triển khai',
    notes: 'Đã lên lịch gặp trao đổi định hướng vào thứ Ba tuần tới.',
    createdAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 'ret-2',
    employeeId: INITIAL_EMPLOYEES[1].id,
    employeeName: INITIAL_EMPLOYEES[1].name,
    department: INITIAL_EMPLOYEES[1].department,
    riskAtCreation: INITIAL_EMPLOYEES[1].risk,
    actionTitle: 'Rà soát chính sách hoa hồng & phân bổ lại chỉ tiêu nhóm',
    owner: 'Bùi Thanh Trúc (Nhân sự)',
    dueDate: '2026-12-12',
    status: 'Chờ thực hiện',
    notes: 'Chuẩn bị dữ liệu đánh giá hiệu suất 6 tháng gần nhất.',
    createdAt: '2026-11-16T09:30:00Z',
  },
];

export const INITIAL_SECURITY_LOG: SecurityActivityItem[] = [
  {
    id: 'sec-1',
    action: 'Đăng nhập thành công',
    detail: 'Trình duyệt Web · Phiên hiện tại',
    timestamp: '2026-11-18T19:05:00Z',
  },
  {
    id: 'sec-2',
    action: 'Khởi tạo hồ sơ tài khoản',
    detail: 'Cấp quyền truy cập hệ thống StayWise',
    timestamp: '2025-09-12T08:30:00Z',
  },
];

export const INITIAL_PULSE_CHECKINS: PulseCheckInItem[] = [
  {
    id: 'pulse-1',
    weekLabel: 'Tuần 46 / 2026',
    satisfaction: 4,
    balance: 3,
    overtime: 8,
    note: 'Khối lượng công việc ổn định hơn sau khi phân bổ lại sprint.',
    createdAt: '2026-11-15T17:00:00Z',
  },
];

export const INITIAL_ATTENDANCE_LOGS: AttendanceRecord[] = [
  {
    id: 'att-1',
    date: '2026-11-18',
    checkIn: '08:32',
    checkOut: '17:45',
    workMode: 'Văn phòng',
    totalHours: 8.2,
  },
  {
    id: 'att-2',
    date: '2026-11-17',
    checkIn: '08:28',
    checkOut: '18:10',
    workMode: 'Văn phòng',
    totalHours: 8.7,
  },
  {
    id: 'att-3',
    date: '2026-11-16',
    checkIn: '08:40',
    checkOut: '17:35',
    workMode: 'Làm việc từ xa',
    totalHours: 7.9,
  },
  {
    id: 'att-4',
    date: '2026-11-15',
    checkIn: '08:30',
    checkOut: '17:30',
    workMode: 'Văn phòng',
    totalHours: 8.0,
  },
];

export const INITIAL_HR_REQUESTS: HrSupportRequest[] = [
  {
    id: 'hr-1',
    employeeName: 'Nguyễn Minh Anh',
    category: 'Đặt lịch trao đổi 1-1 với Quản lý',
    detail: 'Đề xuất trao đổi 1-1 về lộ trình chuyển lên Chuyên viên cao cấp trong quý I/2027.',
    status: 'Đang xử lý',
    adminNote: 'Đã chuyển lịch cho Quản lý Kỹ thuật sắp xếp vào tuần tới.',
    createdAt: '2026-11-16T09:15:00Z',
  },
];

export const INITIAL_BENEFITS: BenefitPackageItem[] = [
  {
    id: 'ben-1',
    title: 'Gói khám sức khỏe nâng cao',
    description: 'Khám tổng quát định kỳ & bảo hiểm sức khỏe bổ sung tại bệnh viện liên kết.',
    annualValue: 500,
    enrolled: true,
  },
  {
    id: 'ben-2',
    title: 'Trợ cấp đi lại & gửi xe',
    description: 'Hỗ trợ chi phí di chuyển hàng tháng cho nhân sự làm việc tại văn phòng.',
    annualValue: 350,
    enrolled: true,
  },
  {
    id: 'ben-3',
    title: 'Quỹ đào tạo & chứng chỉ chuyên môn',
    description: 'Tài trợ chi phí thi chứng chỉ kỹ thuật, khóa học và sách chuyên ngành.',
    annualValue: 450,
    enrolled: false,
  },
  {
    id: 'ben-4',
    title: 'Hỗ trợ góc làm việc tại nhà (Hybrid)',
    description: 'Hỗ trợ chi phí màn hình, bàn phím hoặc ghế công thái học khi làm việc từ xa.',
    annualValue: 400,
    enrolled: false,
  },
];
