import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Minimize2, Maximize2, Clock } from 'lucide-react';

interface FloatingTimerProps {
  isActive: boolean;
  isBreak: boolean;
  timeLeft: number;
  elapsedTime?: number; // For stopwatch mode
  sessionsCompleted: number;
  stopwatchMode?: boolean; // Whether in stopwatch mode
  onToggle: () => void;
  onReset: () => void;
  onStop: () => void;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({
  isActive,
  isBreak,
  timeLeft,
  elapsedTime = 0,
  sessionsCompleted,
  stopwatchMode = false,
  onToggle,
  onReset,
  onStop
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header area or when minimized
    const target = e.target as HTMLElement;
    const isHeader = target.closest('[data-draggable="true"]');
    
    if (isHeader || isMinimized) {
      e.preventDefault();
      setIsDragging(true);
      
      // Calculate offset from mouse position to timer position
      const rect = timerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Calculate new position based on mouse position and drag offset
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get timer dimensions
      const timerWidth = isMinimized ? 128 : 320; // w-32 = 128px, w-80 = 320px
      const timerHeight = isMinimized ? 48 : 192;  // h-12 = 48px, h-48 = 192px
      
      // Constrain to viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - timerWidth));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - timerHeight));
      
      setPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Don't show if not active and timer is at 0 (unless in stopwatch mode)
  if (!isActive && !stopwatchMode && timeLeft === 0) return null;

  return (
    <div
      ref={timerRef}
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized ? 'w-32 h-12' : 'w-80 h-48'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Minimized State – compact card style */}
      {isMinimized ? (
        <div
          className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-lg p-2.5 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock size={14} className={`shrink-0 ${stopwatchMode ? 'text-purple-500' : (isBreak ? 'text-green-500' : 'text-blue-500')}`} />
              <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white truncate">
                {stopwatchMode ? formatTime(elapsedTime) : formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                title="Expand timer"
              >
                <Maximize2 size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onStop}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                title="Stop timer"
              >
                <X size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Expanded State – compact modal-style panel */
        <div className="rounded-lg border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1e1e1e] shadow-lg">
          {/* Header – draggable */}
          <div
            className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-move"
            data-draggable="true"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={18} className={`shrink-0 ${stopwatchMode ? 'text-purple-500' : (isBreak ? 'text-green-500' : 'text-blue-500')}`} />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {stopwatchMode ? 'Stopwatch' : (isBreak ? 'Break Time' : 'Study Time')}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                title="Minimize timer"
              >
                <Minimize2 size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onStop}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                title="Stop timer"
              >
                <X size={18} className="text-red-500" />
              </button>
            </div>
          </div>

          {/* Timer display */}
          <div className="px-4 py-3 text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white mb-1">
              {stopwatchMode ? formatTime(elapsedTime) : formatTime(timeLeft)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Session {sessionsCompleted + 1}
            </div>
          </div>

          {/* Controls – compact buttons */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
            <button
              onClick={onToggle}
              className={`h-7 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isActive ? <Pause size={14} /> : <Play size={14} />}
              {isActive ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={onReset}
              className={`h-7 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                stopwatchMode && (elapsedTime || 0) > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <RotateCcw size={14} />
              {stopwatchMode && (elapsedTime || 0) > 0 ? 'Save & Reset' : 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
