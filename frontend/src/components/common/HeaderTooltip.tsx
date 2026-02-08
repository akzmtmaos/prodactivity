import React, { useState } from 'react';

interface HeaderTooltipProps {
  children: React.ReactNode;
  label: string;
}

const HeaderTooltip: React.FC<HeaderTooltipProps> = ({ children, label }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 dark:bg-[#2d2d2d] text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 shadow-lg pointer-events-none"
          role="tooltip"
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default HeaderTooltip;
