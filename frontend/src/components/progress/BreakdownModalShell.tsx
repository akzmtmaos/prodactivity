import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BreakdownModalShellProps {
  title: string;
  subtitle: React.ReactNode;
  onClose: () => void;
  /** Tailwind max-width class for the panel. */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shared frame for the Daily / Weekly / Monthly breakdown modals: portal,
 * scrim, header and the scroll area. Escape and a click on the scrim close it;
 * clicks inside the panel do not.
 */
const BreakdownModalShell: React.FC<BreakdownModalShellProps> = ({
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-3xl',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // The weekly/monthly modal can open a daily modal on top of itself. Only the
      // last one in the DOM is the visible one, so Escape closes that alone.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (panelRef.current && dialogs[dialogs.length - 1] !== panelRef.current) return;
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-[#2f2f2f] dark:bg-[#1e1e1e]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-[#2f2f2f]">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close breakdown"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default BreakdownModalShell;
