import React from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#181b2e]/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#eceef4] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="confirm-dialog-title"
            className="text-base font-bold text-[#20243a]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng hộp thoại"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#74788d] transition-colors hover:bg-[#f4f2ff] hover:text-[#20243a]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[#62677c]">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#e3e5ef] bg-white px-4 py-2 text-xs font-semibold text-[#52576c] transition-colors hover:bg-[#f7f7fb] whitespace-nowrap"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#6f5ce8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5542d2] whitespace-nowrap"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
