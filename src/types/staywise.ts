export type EmployeePageId =
  | 'overview'
  | 'employees'
  | 'analytics'
  | 'predict'
  | 'model'
  | 'actions'
  | 'admin'
  | 'tools'
  | 'career'
  | 'history'
  | 'account';

export interface ModelWeights {
  intercept: number;
  satisfaction: number;
  balance: number;
  overtime: number;
  tenure: number;
  salary: number;
  distance: number;
  threshold: number;
}

export interface SecurityActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface PulseCheckInItem {
  id: string;
  weekLabel: string;
  satisfaction: number;
  balance: number;
  overtime: number;
  note: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  workMode: 'Văn phòng' | 'Làm việc từ xa';
  totalHours: number;
}

export interface HrSupportRequest {
  id: string;
  employeeName: string;
  category:
    | 'Điều chỉnh lương & phụ cấp'
    | 'Giảm giờ tăng ca / Phân bổ việc'
    | 'Đăng ký làm việc từ xa'
    | 'Đặt lịch trao đổi 1-1 với Quản lý'
    | 'Hỗ trợ thiết bị & phúc lợi';
  detail: string;
  status: 'Chờ xử lý' | 'Đang xử lý' | 'Đã giải quyết';
  adminNote: string | null;
  createdAt: string;
}

export interface BenefitPackageItem {
  id: string;
  title: string;
  description: string;
  annualValue: number;
  enrolled: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  avatarDataUrl: string | null;
  createdAt: string;
  passwordLength: number;
  lastPasswordChangeAt: string | null;
  otherSessionsRevokedAt: string | null;
}

export interface AccountDirectoryItem {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  active: boolean;
  department: string;
  createdAt: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  tenure: number;
  satisfaction: number;
  salary: number;
  overtime: number;
  distance: number;
  age: number;
  balance: number;
  risk: number;
}

export interface RiskFactor {
  key: string;
  label: string;
  effect: number;
}

export interface PredictionRecord {
  id: string;
  employeeName?: string;
  createdAt: string;
  risk: number;
  level: RiskLevel;
  satisfaction: number;
  balance: number;
  overtime: number;
  salary: number;
  factors: RiskFactor[];
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Đã hủy';
  createdAt: string;
}

export interface GoalItem {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  priority: 'Cao' | 'Trung bình' | 'Thấp';
  dueDate: string;
  done: boolean;
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  durationHours: number;
  enrolled: boolean;
  progress: number;
}

export interface AnonymousFeedbackItem {
  id: string;
  topic: string;
  message: string;
  createdAt: string;
}

export interface SelfReviewItem {
  id: string;
  employeeName: string;
  period: string;
  achievements: string;
  blockers: string;
  rating: number;
  adminReply: string | null;
  createdAt: string;
}

export interface RetentionPlan {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  riskAtCreation: number;
  actionTitle: string;
  owner: string;
  dueDate: string;
  status: 'Chờ thực hiện' | 'Đang triển khai' | 'Hoàn thành';
  notes: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}
