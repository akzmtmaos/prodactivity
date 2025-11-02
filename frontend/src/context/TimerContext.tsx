import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { playTimerCompleteSound, playBreakStartSound } from '../utils/audioUtils';
import axiosInstance from '../utils/axiosConfig';
import { supabase } from '../lib/supabase';

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
  pomodoroMode: boolean;
  setPomodoroMode: (enabled: boolean) => void;
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

    // Load saved sessions completed count
    const savedSessionsCompleted = localStorage.getItem('studyTimerSessionsCompleted');
    let sessionsCompleted = 0;
    if (savedSessionsCompleted) {
      try {
        const parsed = parseInt(savedSessionsCompleted, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          sessionsCompleted = parsed;
        }
      } catch {
        // Use default if parsing fails
      }
    }

    // Load saved timer state from localStorage
    const savedTimerState = localStorage.getItem('studyTimerState');
    let initialState: TimerState = {
      isActive: false,
      isBreak: false,
      timeLeft: settings.studyDuration,
      sessionsCompleted,
      settings,
      sessionStart: null
    };

    if (savedTimerState) {
      try {
        const parsed = JSON.parse(savedTimerState);
        // Restore state
        initialState.isActive = parsed.isActive || false;
        initialState.isBreak = parsed.isBreak || false;
        initialState.timeLeft = parsed.timeLeft || settings.studyDuration;
        initialState.sessionsCompleted = parsed.sessionsCompleted || sessionsCompleted;
        
        // If timer was active when page was closed, calculate elapsed time since last save
        if (parsed.isActive && parsed.lastSavedTime) {
          const lastSavedTime = new Date(parsed.lastSavedTime);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - lastSavedTime.getTime()) / 1000);
          const newTimeLeft = Math.max(0, parsed.timeLeft - elapsedSeconds);
          
          // If timer completed while page was closed, set to inactive
          if (newTimeLeft <= 0) {
            initialState.isActive = false;
            initialState.timeLeft = 0;
            initialState.sessionStart = null;
          } else {
            initialState.timeLeft = newTimeLeft;
            // Keep original sessionStart for session logging
            initialState.sessionStart = parsed.sessionStart ? new Date(parsed.sessionStart) : null;
          }
        } else {
          // Timer was paused or not active - restore exact state
          initialState.sessionStart = parsed.sessionStart ? new Date(parsed.sessionStart) : null;
        }
      } catch {
        // Use default state if parsing fails
      }
    }

    return initialState;
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false); // Guard to prevent duplicate completion calls
  
  // Pomodoro mode state - controls whether timer auto-switches between study and break
  const [pomodoroMode, setPomodoroModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyTimerPomodoroMode');
    return saved === 'true';
  });
  
  const setPomodoroMode = (enabled: boolean) => {
    setPomodoroModeState(enabled);
    localStorage.setItem('studyTimerPomodoroMode', enabled.toString());
  };

  // Save sessionsCompleted to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('studyTimerSessionsCompleted', timerState.sessionsCompleted.toString());
  }, [timerState.sessionsCompleted]);

  // Save timer state to localStorage whenever it changes (excluding sessionStart for serialization)
  useEffect(() => {
    const stateToSave = {
      isActive: timerState.isActive,
      isBreak: timerState.isBreak,
      timeLeft: timerState.timeLeft,
      sessionsCompleted: timerState.sessionsCompleted,
      sessionStart: timerState.sessionStart ? timerState.sessionStart.toISOString() : null,
      lastSavedTime: new Date().toISOString() // Save current timestamp for accurate elapsed time calculation
    };
    localStorage.setItem('studyTimerState', JSON.stringify(stateToSave));
  }, [timerState.isActive, timerState.isBreak, timerState.timeLeft, timerState.sessionsCompleted, timerState.sessionStart]);

  // Timer logic
  useEffect(() => {
    // Clear any existing interval first
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (timerState.isActive && timerState.timeLeft > 0) {
      const id = setInterval(() => {
        // Guard: Prevent duplicate completion calls (check before state update)
        if (isCompletingRef.current) {
          clearInterval(id);
          setIntervalId(null);
          return;
        }
        
        setTimerState(prev => {
          // Guard check inside state update as well
          if (isCompletingRef.current) {
            return prev;
          }
          
          // Safety check: if already at 0 or less, complete immediately
          if (prev.timeLeft <= 0) {
            isCompletingRef.current = true;
            clearInterval(id);
            setIntervalId(null);
            // Schedule completion handler to run after this state update
            Promise.resolve().then(() => handleTimerComplete(prev));
            return { ...prev, isActive: false, timeLeft: 0 };
          }
          
          // Decrement timer
          const newTimeLeft = prev.timeLeft - 1;
          
          // Check if timer should complete (reached 0 or less after decrement)
          if (newTimeLeft <= 0) {
            // Timer completed - set guard and stop timer immediately
            isCompletingRef.current = true;
            // Clear interval synchronously to prevent further ticks
            clearInterval(id);
            setIntervalId(null);
            // Schedule completion handler to run after this state update (avoid state conflict)
            Promise.resolve().then(() => handleTimerComplete(prev));
            // Return state with timer stopped at 0
            return { ...prev, isActive: false, timeLeft: 0 };
          }
          // Continue decrementing
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
      setIntervalId(id);
      
      // Cleanup function
      return () => {
        clearInterval(id);
        setIntervalId(null);
      };
    } else {
      // Timer not active, reset guard
      isCompletingRef.current = false;
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    };
  }, [timerState.isActive]); // Only depend on isActive

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
      
      // Save to Supabase for permanent storage
      const saveSessionToSupabase = async () => {
        try {
          // Get current user from Supabase auth
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            console.warn('No authenticated user found, skipping Supabase save');
            // Fallback to backend API if Supabase auth fails
            const token = localStorage.getItem('accessToken');
            if (token) {
              try {
                await axiosInstance.post('/tasks/study-timer-sessions/', {
                  session_type: sessionType,
                  start_time: sessionStart.toISOString(),
                  end_time: end.toISOString(),
                  duration: duration,
                });
                console.log('Session saved to backend API (fallback)');
              } catch (backendError) {
                console.error('Failed to save session to backend API:', backendError);
              }
            }
            return;
          }
          
          // Save to Supabase
          const { data, error } = await supabase
            .from('study_timer_sessions')
            .insert([{
              user_id: user.id,
              session_type: sessionType,
              start_time: sessionStart.toISOString(),
              end_time: end.toISOString(),
              duration: duration,
            }])
            .select();
          
          if (error) {
            console.error('Failed to save session to Supabase:', error);
            // Fallback to backend API if Supabase fails
            const token = localStorage.getItem('accessToken');
            if (token) {
              try {
                await axiosInstance.post('/tasks/study-timer-sessions/', {
                  session_type: sessionType,
                  start_time: sessionStart.toISOString(),
                  end_time: end.toISOString(),
                  duration: duration,
                });
                console.log('Session saved to backend API (fallback)');
              } catch (backendError) {
                console.error('Failed to save session to backend API:', backendError);
              }
            }
          } else {
            console.log('Session saved to Supabase successfully:', data);
          }
        } catch (error) {
          console.error('Error saving session to Supabase:', error);
          // Continue anyway - localStorage backup is already saved
        }
      };
      
      saveSessionToSupabase();
    }

    if (!prevState.isBreak) {
      // Study session completed
      const newSessionsCompleted = prevState.sessionsCompleted + 1;
      
      if (pomodoroMode) {
        // Pomodoro ON: Automatically switch to break
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
      } else {
        // Pomodoro OFF: Just stop the timer, don't switch to break
        setTimerState({
          ...prevState,
          isActive: false,
          isBreak: false,
          timeLeft: 0,
          sessionsCompleted: newSessionsCompleted,
          sessionStart: null
        });
      }
      
      // Reset guard after state update completes
      setTimeout(() => {
        isCompletingRef.current = false;
      }, 100);
    } else {
      // Break completed - only continue if Pomodoro mode is ON
      if (pomodoroMode) {
        setTimerState({
          ...prevState,
          isActive: false,
          isBreak: false,
          timeLeft: prevState.settings.studyDuration,
          sessionStart: new Date(),
          sessionsCompleted: prevState.sessionsCompleted >= prevState.settings.sessionsUntilLongBreak ? 0 : prevState.sessionsCompleted
        });
      } else {
        // Pomodoro OFF: Just stop the timer
        setTimerState({
          ...prevState,
          isActive: false,
          isBreak: false,
          timeLeft: 0,
          sessionStart: null
        });
      }
      
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
      sessionStart: null
    }));
    // Clear sessions completed and timer state from localStorage on reset
    localStorage.setItem('studyTimerSessionsCompleted', '0');
    localStorage.removeItem('studyTimerState');
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
    // Clear sessions completed and timer state from localStorage on stop
    localStorage.setItem('studyTimerSessionsCompleted', '0');
    localStorage.removeItem('studyTimerState');
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
    isTimerRunning,
    pomodoroMode,
    setPomodoroMode
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
