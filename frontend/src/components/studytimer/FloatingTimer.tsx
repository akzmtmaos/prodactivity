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
      {/* Minimized State */}
      {isMinimized ? (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={16} className={`${stopwatchMode ? 'text-purple-500' : (isBreak ? 'text-green-500' : 'text-blue-500')}`} />
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {stopwatchMode ? formatTime(elapsedTime) : formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Expand timer"
              >
                <Maximize2 size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onStop}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Stop timer"
              >
                <X size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Expanded State */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header - Draggable area */}
          <div 
            className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-move"
            data-draggable="true"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-2">
              <Clock size={20} className={`${stopwatchMode ? 'text-purple-500' : (isBreak ? 'text-green-500' : 'text-blue-500')}`} />
              <span className="font-semibold text-gray-900 dark:text-white">
                {stopwatchMode ? 'Stopwatch' : (isBreak ? 'Break Time' : 'Study Time')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Minimize timer"
              >
                <Minimize2 size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onStop}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Stop timer"
              >
                <X size={16} className="text-red-500" />
              </button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="px-4 py-4 text-center">
            <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white mb-2">
              {stopwatchMode ? formatTime(elapsedTime) : formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Session {sessionsCompleted + 1}
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center space-x-3">
            <button
              onClick={onToggle}
              className={`px-4 py-2 rounded-lg font-medium flex items-center transition-colors ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isActive ? (
                <>
                  <Pause size={16} className="mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  Resume
                </>
              )}
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center transition-colors"
            >
              <RotateCcw size={16} className="mr-2" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
