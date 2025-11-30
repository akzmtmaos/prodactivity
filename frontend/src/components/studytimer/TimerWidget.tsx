import React from 'react';
import { useTimer } from '../../context/TimerContext';
import FloatingTimer from './FloatingTimer';

const TimerWidget: React.FC = () => {
  const { timerState, startTimer, pauseTimer, resetTimer, stopTimer, isTimerRunning, stopwatchMode } = useTimer();

  const handleToggle = () => {
    if (timerState.isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  // Only show the floating timer if there's an active timer or if we're in a session
  // In stopwatch mode, show if timer is active (even if just started)
  if (!isTimerRunning && !(stopwatchMode && timerState.isActive)) {
    return null;
  }

  return (
    <FloatingTimer
      isActive={timerState.isActive}
      isBreak={timerState.isBreak}
      timeLeft={timerState.timeLeft}
      elapsedTime={timerState.elapsedTime || 0}
      sessionsCompleted={timerState.sessionsCompleted}
      stopwatchMode={stopwatchMode}
      onToggle={handleToggle}
      onReset={resetTimer}
      onStop={stopTimer}
    />
  );
};

export default TimerWidget;
