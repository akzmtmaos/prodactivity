import React from 'react';

interface ProductivityLegendProps {
  getProductivityColor: (status: string) => string;
}

const ProductivityLegend: React.FC<ProductivityLegendProps> = ({ getProductivityColor }) => {
  const legendItems = [
    { range: '90–100%', status: 'Highly Productive', color: 'bg-green-600 dark:bg-green-400' },
    { range: '70–89%', status: 'Productive', color: 'bg-green-500 dark:bg-green-300' },
    { range: '40–69%', status: 'Moderately Productive', color: 'bg-yellow-500 dark:bg-yellow-400' },
    { range: '0–39%', status: 'Low Productive', color: 'bg-red-500 dark:bg-red-400' },
    { range: '', status: 'No Tasks', color: '' }
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <h3 className="sr-only">Productivity legend</h3>
      {legendItems.map((item) => (
        <div key={item.status} className="flex items-center gap-1.5" title={item.status}>
          {item.color ? (
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
          ) : (
            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="text-[11px] tabular-nums text-gray-600 dark:text-gray-300">{item.range}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{item.status}</span>
        </div>
      ))}
    </div>
  );
};

export default ProductivityLegend;
