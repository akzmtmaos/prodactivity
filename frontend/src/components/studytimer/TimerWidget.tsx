import React from 'react';
import { useTimer } from '../../context/TimerContext';
import FloatingTimer from './FloatingTimer';

const TimerWidget: React.FC = () => {
  const { timerState, startTimer, pauseTimer, resetTimer, stopTimer, isTimerRunning } = useTimer();

  const handleToggle = () => {
    if (timerState.isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  // Only show the floating timer if there's an active timer or if we're in a session
  if (!isTimerRunning) {
    return null;
  }

  return (
    <FloatingTimer
      isActive={timerState.isActive}
      isBreak={timerState.isBreak}
      timeLeft={timerState.timeLeft}
      sessionsCompleted={timerState.sessionsCompleted}
      onToggle={handleToggle}
      onReset={resetTimer}
      onStop={stopTimer}
    />
  );
};

export default TimerWidget;
