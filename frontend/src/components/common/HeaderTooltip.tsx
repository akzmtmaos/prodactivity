import React, { useState, useLayoutEffect, useRef } from 'react';

interface HeaderTooltipProps {
  children: React.ReactNode;
  label: string;
  side?: 'bottom' | 'right' | 'top';
  className?: string;
  /** Position the tooltip with fixed coordinates so it escapes overflow clipping (e.g. scrollable nav) */
  fixed?: boolean;
}

const HeaderTooltip: React.FC<HeaderTooltipProps> = ({
  children,
  label,
  side = 'bottom',
  className = '',
  fixed = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!fixed || !isVisible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    if (side === 'right') {
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    } else if (side === 'top') {
      setCoords({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    } else {
      setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
  }, [fixed, isVisible, side]);

  if (fixed) {
    const centeringTransform =
      side === 'right'
        ? 'translateY(-50%)'
        : side === 'top'
          ? 'translate(-50%, -100%)'
          : 'translateX(-50%)';

    return (
      <div
        ref={wrapperRef}
        className={`relative inline-flex ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {coords && (
          <div
            className={`fixed z-50 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg whitespace-nowrap shadow pointer-events-none transition-opacity duration-200 ease-out ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ top: coords.top, left: coords.left, transform: centeringTransform }}
            role="tooltip"
            aria-hidden={!isVisible}
          >
            {label}
          </div>
        )}
      </div>
    );
  }

  const positionClasses =
    side === 'right'
      ? 'left-full ml-2 top-1/2 -translate-y-1/2'
      : side === 'top'
        ? 'left-1/2 -translate-x-1/2 bottom-full mb-2'
        : 'left-1/2 -translate-x-1/2 top-full mt-2';
  const hiddenTransform = side === 'right' ? '-translate-x-1' : side === 'top' ? 'translate-y-1' : '-translate-y-1';
  const shownTransform = side === 'right' ? 'translate-x-0' : 'translate-y-0';

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div
        className={`absolute ${positionClasses} px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg whitespace-nowrap z-50 shadow pointer-events-none transition-all duration-200 ease-out ${
          isVisible ? `opacity-100 ${shownTransform}` : `opacity-0 ${hiddenTransform} pointer-events-none`
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
