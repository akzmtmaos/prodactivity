import React from 'react';
import { Sun } from 'lucide-react';

interface AppearanceLightModeProps {
  currentTheme: 'light' | 'dark' | 'system';
  onChange: (theme: 'light') => void;
}

const AppearanceLightMode: React.FC<AppearanceLightModeProps> = ({ currentTheme, onChange }) => {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => onChange('light')}
        className={`flex items-center px-4 py-2 rounded-lg border transition-colors font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700/50 ${
          currentTheme === 'light' ? 'bg-indigo-100 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <Sun size={20} className="mr-2" />
        Light Mode
      </button>
    </div>
  );
};

export default AppearanceLightMode; 