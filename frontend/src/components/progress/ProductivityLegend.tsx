import React from 'react';

interface ProductivityLegendProps {
  getProductivityColor: (status: string) => string;
}

const ProductivityLegend: React.FC<ProductivityLegendProps> = ({ getProductivityColor }) => {
  const legendItems = [
    { range: '90-100%', status: 'Highly Productive', color: 'bg-green-600 dark:bg-green-400' },
    { range: '70-89%', status: 'Productive', color: 'bg-green-500 dark:bg-green-300' },
    { range: '40-69%', status: 'Moderately Productive', color: 'bg-yellow-500 dark:bg-yellow-400' },
    { range: '0-39%', status: 'Low Productivity', color: 'bg-red-500 dark:bg-red-400' }
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Productivity Scale</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-900 dark:text-white">{item.range}</span>
              <span className={`text-xs ${getProductivityColor(item.status)}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductivityLegend;
