import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { playTimerCompleteSound, playBreakStartSound } from '../utils/audioUtils';
import axiosInstance from '../utils/axiosConfig';

interface TimerSettings {
  studyDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

interface TimerState {
  isActive: boolean;
  isBreak: boolean;
  timeLeft: number;
  sessionsCompleted: number;
  settings: TimerSettings;
  sessionStart: Date | null;
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  stopTimer: () => void;
  updateSettings: (settings: TimerSettings) => void;
  isTimerRunning: boolean;
}

const defaultSettings: TimerSettings = {
  studyDuration: 25 * 60,
  breakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsUntilLongBreak: 4
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [timerState, setTimerState] = useState<TimerState>(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem('studyTimerSettings');
    let settings = defaultSettings;
    if (saved) {
      try {
        settings = JSON.parse(saved);
      } catch {
        // Use default settings if parsing fails
      }
    }

    return {
      isActive: false,
      isBreak: false,
      timeLeft: settings.studyDuration,
      sessionsCompleted: 0,
      settings,
      sessionStart: null
    };
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false); // Guard to prevent duplicate completion calls

  // Timer logic
  useEffect(() => {
    // Clear any existing interval first
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (timerState.isActive && timerState.timeLeft > 0) {
      const id = setInterval(() => {
        setTimerState(prev => {
          // Guard: Prevent duplicate completion calls
          if (isCompletingRef.current) {
            return prev;
          }
          
          if (prev.timeLeft <= 1) {
            // Timer completed - set guard and stop timer immediately
            isCompletingRef.current = true;
            handleTimerComplete(prev);
            // Return state with timer stopped to prevent further ticks
            return { ...prev, isActive: false, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      setIntervalId(id);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timerState.isActive]); // Only depend on isActive, not timeLeft

  const handleTimerComplete = (prevState: TimerState) => {
    // Play completion sound
    if (!prevState.isBreak) {
      playTimerCompleteSound();
    } else {
      playBreakStartSound();
    }

    // Log the session
    if (prevState.sessionStart) {
      const sessionStart = prevState.sessionStart; // Store in local variable for TypeScript
      const end = new Date();
      const duration = prevState.isBreak
        ? (prevState.sessionsCompleted + 1 >= prevState.settings.sessionsUntilLongBreak 
            ? prevState.settings.longBreakDuration 
            : prevState.settings.breakDuration)
        : prevState.settings.studyDuration;
      
      const sessionType = prevState.isBreak
        ? (prevState.sessionsCompleted + 1 >= prevState.settings.sessionsUntilLongBreak ? 'Long Break' : 'Break')
        : 'Study';
      
      // Store session log in localStorage (for backward compatibility)
      const logs = JSON.parse(localStorage.getItem('studyTimerLogs') || '[]');
      logs.push({
        type: sessionType,
        start: sessionStart,
        end,
        duration,
      });
      localStorage.setItem('studyTimerLogs', JSON.stringify(logs));
      
      // Save to backend API for permanent storage
      const saveSessionToBackend = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            console.warn('No access token found, skipping backend save');
            return;
          }
          
          await axiosInstance.post('/tasks/study-timer-sessions/', {
            session_type: sessionType,
            start_time: sessionStart.toISOString(),
            end_time: end.toISOString(),
            duration: duration,
          });
          console.log('Session saved to backend successfully');
        } catch (error) {
          console.error('Failed to save session to backend:', error);
          // Continue anyway - localStorage backup is already saved
        }
      };
      
      saveSessionToBackend();
    }

    if (!prevState.isBreak) {
      // Study session completed
      const newSessionsCompleted = prevState.sessionsCompleted + 1;
      const shouldTakeLongBreak = newSessionsCompleted >= prevState.settings.sessionsUntilLongBreak;
      const newTimeLeft = shouldTakeLongBreak ? prevState.settings.longBreakDuration : prevState.settings.breakDuration;
      
      setTimerState({
        ...prevState,
        isActive: false,
        isBreak: true,
        timeLeft: newTimeLeft,
        sessionsCompleted: newSessionsCompleted,
        sessionStart: new Date()
      });
      
      // Reset guard after state update completes
      setTimeout(() => {
        isCompletingRef.current = false;
      }, 100);
    } else {
      // Break completed
      setTimerState({
        ...prevState,
        isActive: false,
        isBreak: false,
        timeLeft: prevState.settings.studyDuration,
        sessionStart: new Date(),
        sessionsCompleted: prevState.sessionsCompleted >= prevState.settings.sessionsUntilLongBreak ? 0 : prevState.sessionsCompleted
      });
      
      // Reset guard after state update completes
      setTimeout(() => {
        isCompletingRef.current = false;
      }, 100);
    }
  };

  const startTimer = () => {
    // Reset guard when starting a new timer
    isCompletingRef.current = false;
    setTimerState(prev => ({
      ...prev,
      isActive: true,
      sessionStart: prev.sessionStart || new Date()
    }));
  };

  const pauseTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isActive: false
    }));
  };

  const resetTimer = () => {
    // Reset guard when resetting timer
    isCompletingRef.current = false;
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      isBreak: false,
      timeLeft: prev.settings.studyDuration,
      sessionsCompleted: 0,
      sessionStart: new Date()
    }));
  };

  const stopTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isActive: false,
      isBreak: false,
      timeLeft: prev.settings.studyDuration,
      sessionsCompleted: 0,
      sessionStart: null
    }));
  };

  const updateSettings = (newSettings: TimerSettings) => {
    setTimerState(prev => ({
      ...prev,
      settings: newSettings,
      timeLeft: prev.isBreak ? prev.timeLeft : newSettings.studyDuration
    }));
    localStorage.setItem('studyTimerSettings', JSON.stringify(newSettings));
  };

  const isTimerRunning = timerState.isActive || timerState.timeLeft < timerState.settings.studyDuration;

  const value: TimerContextType = {
    timerState,
    startTimer,
    pauseTimer,
    resetTimer,
    stopTimer,
    updateSettings,
    isTimerRunning
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
