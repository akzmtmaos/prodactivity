import React from 'react';

interface MainChartProps {
  view: string;
  data: any;
}

const MainChart: React.FC<MainChartProps> = ({ view }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 mb-8 h-56 flex items-center justify-center">
      <span className="text-lg text-gray-700 dark:text-gray-200">{view} Chart (Coming Soon)</span>
    </div>
  );
};

export default MainChart; 