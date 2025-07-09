import React from 'react';

interface ErrorAlertProps {
  error: string;
  onClose: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onClose }) => (
  <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
    {error}
    <button
      onClick={onClose}
      className="ml-4 text-red-900 hover:text-red-700"
    >
      ×
    </button>
  </div>
);

export default ErrorAlert; 