import React from 'react';
import { format } from 'date-fns';

interface ProductivityRowProps {
  date: string;
  completionRate: number;
  status: string;
  isToday?: boolean;
  getProductivityColor: (status: string) => string;
}

const ProductivityRow: React.FC<ProductivityRowProps> = ({
  date,
  completionRate,
  status,
  isToday = false,
  getProductivityColor
}) => {
  const bgColor = isToday 
    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-500 shadow-md mb-3'
    : 'bg-gray-50 dark:bg-gray-700/50 mb-2';

  const textColor = isToday 
    ? 'text-indigo-700 dark:text-indigo-200'
    : 'text-gray-900 dark:text-white';

  return (
    <div className={`grid grid-cols-3 gap-4 items-center rounded-lg px-6 py-4 ${bgColor}`}>
      <div className="text-left">
        <div className={`text-sm font-semibold ${textColor}`}>
          {format(new Date(date), 'MMMM d, yyyy')}
        </div>
        {isToday && (
          <div className="mt-1">
            <span className="px-2 py-0.5 bg-indigo-200 dark:bg-indigo-700 text-xs rounded-full font-bold">Today</span>
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <div className="w-full max-w-lg">
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionRate >= 90 ? 'bg-green-600 dark:bg-green-400' :
                completionRate >= 70 ? 'bg-green-500 dark:bg-green-300' :
                completionRate >= 40 ? 'bg-yellow-500 dark:bg-yellow-400' :
                'bg-red-500 dark:bg-red-400'
              }`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white pointer-events-none">
              {completionRate % 1 === 0 ? completionRate.toFixed(0) : completionRate.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-base font-bold ${getProductivityColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
};

export default ProductivityRow; 