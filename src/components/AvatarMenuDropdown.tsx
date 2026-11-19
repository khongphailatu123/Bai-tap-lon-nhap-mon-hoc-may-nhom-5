import React, { useEffect, useRef } from 'react';
import {
  Briefcase,
  Camera,
  Download,
  History,
  KeyRound,
  LayoutGrid,
  LogOut,
  MonitorOff,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { EmployeePageId, EmployeeProfile, UserAccount } from '../types/staywise';
import { AvatarDisplay } from './AvatarDisplay';

interface AvatarMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  placement?: 'bottom-right' | 'top-left';
  user: UserAccount;
  employee: EmployeeProfile;
  onNavigate: (page: EmployeePageId) => void;
  onOpenPasswordSection: () => void;
  onTriggerAvatarUpload: () => void;
  onExportMyData: () => void;
  onRequestRevokeSessions: () => void;
  onLogout: () => void;
}

export const AvatarMenuDropdown: React.FC<AvatarMenuDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  placement = 'bottom-right',
  user,
  employee,
  onNavigate,
  onOpenPasswordSection,
  onTriggerAvatarUpload,
  onExportMyData,
  onRequestRevokeSessions,
  onLogout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const positionClass =
    placement === 'top-left'
      ? 'bottom-full left-0 mb-2 origin-bottom-left'
      : 'right-0 top-full mt-2 origin-top-right';

  const runAndClose = (action: () => void) => {
    onClose();
    action();
  };

  const isAdmin = user.role === 'admin';

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu tài khoản"
      className={`absolute z-50 w-72 rounded-xl border border-[#e6e8f0] bg-white p-2 shadow-lg shadow-[#1b2343]/10 ${positionClass}`}
    >
      <div className="flex items-center gap-3 border-b border-[#f0f1f6] px-2.5 py-2.5">
        <AvatarDisplay name={user.name} avatarUrl={user.avatarDataUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-[#20243a]">
            {user.name}
          </div>
          <div className="truncate text-[11px] text-[#74788d]">{user.email}</div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-[#6f5ce8]">
            {isAdmin
              ? 'Quản trị hệ thống · Admin'
              : `${employee.department} · ${employee.role}`}
          </div>
        </div>
      </div>

      <div className="py-1.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(() => onNavigate('account'))}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
        >
          <UserCog className="h-4 w-4 shrink-0 text-[#74788d]" />
          <span className="whitespace-nowrap">Quản lý tài khoản</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(onTriggerAvatarUpload)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
        >
          <Camera className="h-4 w-4 shrink-0 text-[#74788d]" />
          <span className="whitespace-nowrap">Đổi ảnh đại diện</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(onOpenPasswordSection)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
        >
          <KeyRound className="h-4 w-4 shrink-0 text-[#74788d]" />
          <span className="whitespace-nowrap">Đổi mật khẩu</span>
        </button>
      </div>

      <div className="border-t border-[#f0f1f6] py-1.5">
        {isAdmin ? (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('overview'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Tổng quan rủi ro</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('analytics'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <History className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Phân tích &amp; Chi phí ROI</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('admin'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Tài khoản &amp; yêu cầu</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('tools'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <LayoutGrid className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Tiện ích nhân viên</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('career'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <Briefcase className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Chấm công, Lương &amp; Phúc lợi</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(() => onNavigate('history'))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
            >
              <History className="h-4 w-4 shrink-0 text-[#74788d]" />
              <span className="whitespace-nowrap">Lịch sử dự đoán của tôi</span>
            </button>
          </>
        )}

        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(onExportMyData)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
        >
          <Download className="h-4 w-4 shrink-0 text-[#74788d]" />
          <span className="whitespace-nowrap">Tải dữ liệu của tôi (JSON)</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(onRequestRevokeSessions)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#2c3148] transition-colors duration-150 hover:bg-[#f4f2ff] hover:text-[#5542d2] focus-visible:outline-2 focus-visible:outline-[#6f5ce8]"
        >
          <MonitorOff className="h-4 w-4 shrink-0 text-[#74788d]" />
          <span className="whitespace-nowrap">Đăng xuất phiên khác</span>
        </button>
      </div>

      <div className="border-t border-[#f0f1f6] pt-1.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => runAndClose(onLogout)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-[#c5474d] transition-colors duration-150 hover:bg-[#fff1f2] focus-visible:outline-2 focus-visible:outline-[#c5474d]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};
