import React from 'react';

interface PomodoroModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const PomodoroModeToggle: React.FC<PomodoroModeToggleProps> = ({ enabled, onToggle }) => {
  return (
    <div className="flex items-center space-x-3 mb-4">
      <label className="font-medium text-gray-800 dark:text-gray-200">Pomodoro Mode</label>
      <button
        onClick={() => onToggle(!enabled)}
        className={`w-12 h-6 flex items-center bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-200 ${enabled ? 'bg-indigo-600' : ''}`}
        aria-pressed={enabled}
      >
        <span
          className={`h-4 w-4 bg-white rounded-full shadow transform transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">{enabled ? 'On' : 'Off'}</span>
    </div>
  );
};

export default PomodoroModeToggle; 