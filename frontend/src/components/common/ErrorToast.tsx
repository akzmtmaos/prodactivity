import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-[10000] animate-slide-in">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4 flex items-start space-x-3">
        <div className="flex-1">
          <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ErrorToast; 