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
      <div
        className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 shadow pointer-events-none transition-all duration-200 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {label}
      </div>
    </div>
  );
};

export default HeaderTooltip;
