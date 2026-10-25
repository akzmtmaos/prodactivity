import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
}

// Keep in sync with the .toast-exit animation duration in index.css
const EXIT_MS = 180;

const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  duration = 5000,
  type = 'error',
}) => {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);

  const closedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Countdown state: time left to live, and when the current run started
  const remainingRef = useRef(duration);
  const startedAtRef = useRef(0);

  // Keep the latest callback without restarting the countdown on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const startClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    closeTimerRef.current = setTimeout(() => onCloseRef.current(), EXIT_MS);
  }, []);

  // Auto-dismiss countdown, frozen while the toast is hovered
  useEffect(() => {
    if (paused) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
        remainingRef.current -= Date.now() - startedAtRef.current;
      }
      return;
    }

    if (closedRef.current) return;

    startedAtRef.current = Date.now();
    closeTimerRef.current = setTimeout(startClose, Math.max(remainingRef.current, 0));

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [paused, startClose]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          textColor: 'text-green-600 dark:text-green-400',
          Icon: CheckCircle,
        };
      case 'error':
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          textColor: 'text-red-600 dark:text-red-400',
          Icon: AlertTriangle,
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          Icon: AlertTriangle,
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-600 dark:text-blue-400',
          Icon: CheckCircle,
        };
      default:
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          textColor: 'text-red-600 dark:text-red-400',
          Icon: AlertTriangle,
        };
    }
  };

  const { bgColor, textColor, Icon } = getStyles();

  const barColor =
    type === 'success'
      ? 'bg-green-500 dark:bg-green-400'
      : type === 'info'
        ? 'bg-blue-500 dark:bg-blue-400'
        : type === 'warning'
          ? 'bg-yellow-500 dark:bg-yellow-400'
          : 'bg-red-500 dark:bg-red-400';

  return (
    <div
      className={`fixed bottom-4 right-4 z-[10000] ${closing ? 'toast-exit' : 'toast-enter'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="status"
      aria-live="polite"
    >
      <div
        className={`relative overflow-hidden border rounded-lg shadow-lg p-4 flex items-start space-x-3 ${bgColor}`}
      >
        <Icon className={`h-5 w-5 mt-0.5 ${textColor}`} />
        <div className="flex-1">
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>
        <button
          onClick={startClose}
          className={`${textColor} hover:opacity-80`}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Countdown bar: fills left-to-right, gone when it reaches the end */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/5 dark:bg-white/10">
          <div
            className={`toast-progress-bar h-full w-full origin-left ${barColor}`}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toast;
export {}; 