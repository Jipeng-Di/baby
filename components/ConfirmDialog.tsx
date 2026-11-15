'use client';
import {tr} from '@/lib/i18n';
import {Alert, card} from './ui';

/** A modal "are you sure?" for destructive actions. */
export default function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#10231b]/50 p-6">
      <div role="alertdialog" aria-modal="true" aria-label={title} className={`${card} w-full max-w-sm`}>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-(--muted)">{text}</p>
        {error && <Alert text={error} />}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="min-h-12 rounded-xl border border-(--line)" disabled={busy} onClick={onCancel}>
            {tr('取消', 'Cancel')}
          </button>
          <button
            className="min-h-12 rounded-xl bg-(--danger) font-semibold text-white"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
