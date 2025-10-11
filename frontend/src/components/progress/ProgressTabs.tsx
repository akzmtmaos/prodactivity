import React from 'react';

interface ProgressTabsProps {
  progressView: string;
  setProgressView: (view: string) => void;
  tabs: string[];
}

const ProgressTabs: React.FC<ProgressTabsProps> = ({ progressView, setProgressView, tabs }) => {
  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-100 dark:border-gray-800/50 rounded-2xl p-2 shadow-sm mb-6 inline-flex mx-auto">
      <div className="flex space-x-1">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`min-w-[110px] px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              progressView === tab 
                ? 'bg-indigo-500 text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => setProgressView(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProgressTabs; 