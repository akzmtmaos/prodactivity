import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({
  message,
  onClose,
  duration = 5000,
  type = 'error',
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  const textColor = type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const Icon = type === 'success' ? CheckCircle : AlertTriangle;

  return (
    <div className="fixed bottom-4 right-4 z-[10000] animate-slide-in">
      <div className={`border rounded-lg shadow-lg p-4 flex items-start space-x-3 ${bgColor}`}>
        <Icon className={`h-5 w-5 mt-0.5 ${textColor}`} />
        <div className="flex-1">
          <p className={`text-sm ${textColor}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-80`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
export {}; 