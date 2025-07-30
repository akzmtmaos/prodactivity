import React from 'react';

interface ProgressTabsProps {
  progressView: string;
  setProgressView: (view: string) => void;
  tabs: string[];
}

const ProgressTabs: React.FC<ProgressTabsProps> = ({ progressView, setProgressView, tabs }) => {
  return (
    <div className="flex space-x-2 mb-6 justify-center">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`min-w-[110px] px-4 py-2 rounded-full font-semibold transition-colors ${progressView === tab ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
          onClick={() => setProgressView(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default ProgressTabs; 