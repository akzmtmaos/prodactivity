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
  elapsedTime: number; // For stopwatch mode (counts up from 0)
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
  stopwatchMode: boolean;
  setStopwatchMode: (enabled: boolean) => void;
  refreshSessionsCount: () => Promise<void>;
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
      elapsedTime: 0, // Start at 0 for stopwatch
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
        initialState.elapsedTime = parsed.elapsedTime || 0; // Restore stopwatch elapsed time
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

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
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
  
  // Stopwatch mode state - controls whether timer counts up (stopwatch) or down (timer)
  const [stopwatchMode, setStopwatchModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyTimerStopwatchMode');
    return saved === 'true';
  });
  
  const setStopwatchMode = (enabled: boolean) => {
    setStopwatchModeState(enabled);
    localStorage.setItem('studyTimerStopwatchMode', enabled.toString());
    // Reset timer when switching modes
    if (enabled) {
      // Switching to stopwatch: reset elapsed time to 0
      setTimerState(prev => ({
        ...prev,
        elapsedTime: 0,
        isActive: false,
        sessionStart: null
      }));
    } else {
      // Switching to timer: reset to study duration
      setTimerState(prev => ({
        ...prev,
        timeLeft: prev.settings.studyDuration,
        elapsedTime: 0,
        isActive: false,
        sessionStart: null
      }));
    }
  };

  // Function to refresh sessions count from backend/Supabase
  const refreshSessionsCount = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        setTimerState(prev => ({ ...prev, sessionsCompleted: 0 }));
        return;
      }
      
      const user = JSON.parse(userData);
      const userId = user.id;
      
      if (!userId) {
        setTimerState(prev => ({ ...prev, sessionsCompleted: 0 }));
        return;
      }
      
      let studySessionsCount = 0;
      
      // Try backend API first
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await axiosInstance.get('/tasks/study-timer-sessions/');
          const sessions = response.data || [];
          studySessionsCount = sessions.filter((s: any) => s.session_type === 'Study').length;
          
          console.log('📊 Refreshed sessions count from backend:', studySessionsCount, 'out of', sessions.length, 'total sessions');
          setTimerState(prev => ({
            ...prev,
            sessionsCompleted: studySessionsCount
          }));
          return;
        } catch (apiError) {
          console.warn('Failed to load sessions from backend, trying Supabase:', apiError);
        }
      }
      
      // Try Supabase as fallback
      try {
        // Get Supabase auth user ID (UUID) - this is what Supabase expects
        const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
        const supabaseUserId = supabaseAuthUser?.id;
        
        if (supabaseUserId) {
          const { data: supabaseSessions, error } = await supabase
            .from('study_timer_sessions')
            .select('session_type')
            .eq('user_id', supabaseUserId) // Use Supabase auth UUID
            .eq('session_type', 'Study');
          
          if (!error) {
            // Even if sessions array is empty, we should update the counter
            studySessionsCount = Array.isArray(supabaseSessions) ? supabaseSessions.length : 0;
            console.log('📊 Refreshed sessions count from Supabase:', studySessionsCount);
            setTimerState(prev => ({
            ...prev,
            sessionsCompleted: studySessionsCount
          }));
          localStorage.setItem('studyTimerSessionsCompleted', studySessionsCount.toString());
          } else {
            console.warn('⚠️ Supabase query error:', error);
            // Don't reset to 0 on error - keep current count
          }
        } else {
          console.warn('⚠️ No Supabase auth user found, cannot refresh from Supabase');
        }
      } catch (supabaseErr) {
        console.warn('Failed to load sessions from Supabase:', supabaseErr);
        // Don't reset to 0 on error - keep current count
      }
    } catch (error) {
      console.error('Error refreshing sessions count:', error);
      setTimerState(prev => ({ ...prev, sessionsCompleted: 0 }));
    }
  };

  // Load actual sessions count from backend/Supabase on mount and sync sessionsCompleted
  useEffect(() => {
    refreshSessionsCount();
  }, []); // Only run on mount

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
      elapsedTime: timerState.elapsedTime || 0, // Save stopwatch elapsed time
      sessionsCompleted: timerState.sessionsCompleted,
      sessionStart: timerState.sessionStart ? timerState.sessionStart.toISOString() : null,
      lastSavedTime: new Date().toISOString() // Save current timestamp for accurate elapsed time calculation
    };
    localStorage.setItem('studyTimerState', JSON.stringify(stateToSave));
  }, [timerState.isActive, timerState.isBreak, timerState.timeLeft, timerState.sessionsCompleted, timerState.sessionStart]);

  // Timer logic - handles both countdown (timer) and count-up (stopwatch) modes
  useEffect(() => {
    // Clear any existing interval first
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (timerState.isActive) {
      // Reset guard when starting a new timer interval
      isCompletingRef.current = false;
      
      const id = setInterval(() => {
        // Guard: Prevent duplicate completion calls (check before state update)
        if (isCompletingRef.current) {
          clearInterval(id);
          intervalIdRef.current = null;
          return;
        }
        
        setTimerState(prev => {
          // Guard check inside state update as well
          if (isCompletingRef.current) {
            return prev;
          }
          
          if (stopwatchMode) {
            // STOPWATCH MODE: Count up
            const newElapsedTime = (prev.elapsedTime || 0) + 1;
            return { ...prev, elapsedTime: newElapsedTime };
          } else {
            // TIMER MODE: Count down
            // Safety check: if already at 0 or less, complete immediately
            if (prev.timeLeft <= 0) {
              isCompletingRef.current = true;
              clearInterval(id);
              intervalIdRef.current = null;
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
              intervalIdRef.current = null;
              // Schedule completion handler to run after this state update (avoid state conflict)
              Promise.resolve().then(() => handleTimerComplete(prev));
              // Return state with timer stopped at 0
              return { ...prev, isActive: false, timeLeft: 0 };
            }
            // Continue decrementing
            return { ...prev, timeLeft: newTimeLeft };
          }
        });
      }, 1000);
      intervalIdRef.current = id;
      
      // Cleanup function
      return () => {
        if (intervalIdRef.current === id) {
          clearInterval(id);
          intervalIdRef.current = null;
        }
      };
    } else {
      // Timer not active, reset guard
      isCompletingRef.current = false;
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [timerState.isActive, timerState.timeLeft, timerState.isBreak, stopwatchMode]); // Depend on isActive, timeLeft, isBreak, and stopwatchMode

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
      
      // Check for duplicates before saving
      const sessionStartISO = sessionStart.toISOString();
      const endISO = end.toISOString();
      
      // Check localStorage for duplicates first
      const existingLogs = JSON.parse(localStorage.getItem('studyTimerLogs') || '[]');
      const isDuplicateInLocalStorage = existingLogs.some((log: any) => {
        const logStart = new Date(log.start).toISOString();
        return logStart === sessionStartISO && log.type === sessionType;
      });
      
      if (isDuplicateInLocalStorage) {
        console.warn('⚠️ Duplicate session detected in localStorage, skipping save');
        return; // Don't save duplicate
      }
      
      // Store session log in localStorage (for backward compatibility)
      existingLogs.push({
        type: sessionType,
        start: sessionStart,
        end,
        duration,
      });
      localStorage.setItem('studyTimerLogs', JSON.stringify(existingLogs));
      
      // Save to backend API first (primary method)
      // Django backend will automatically sync to Supabase via signals, so we don't need to manually save to Supabase
      const saveSessionToBackend = async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            console.warn('No access token found, cannot save session');
            return;
          }

          // Get user ID from localStorage (Django user)
          const userData = localStorage.getItem('user');
          if (!userData) {
            console.warn('No user data found, cannot save session');
            return;
          }

          const user = JSON.parse(userData);
          const userId = user.id;

          if (!userId) {
            console.warn('No user ID found, cannot save session');
            return;
          }

          // Check for duplicate in backend before saving
          try {
            const existingSessions = await axiosInstance.get('/tasks/study-timer-sessions/');
            const sessions = existingSessions.data || [];
            const isDuplicateInBackend = sessions.some((s: any) => {
              const existingStart = new Date(s.start_time).toISOString();
              return existingStart === sessionStartISO && s.session_type === sessionType;
            });
            
            if (isDuplicateInBackend) {
              console.warn('⚠️ Duplicate session detected in backend, skipping save');
              return; // Don't save duplicate
            }
          } catch (checkError) {
            console.warn('⚠️ Failed to check for duplicates in backend, proceeding with save:', checkError);
          }

          // Save to backend API (Django) - this will automatically sync to Supabase via Django signals
          try {
            const response = await axiosInstance.post('/tasks/study-timer-sessions/', {
              session_type: sessionType,
              start_time: sessionStartISO,
              end_time: endISO,
              duration: duration,
            });
            console.log('✅ Session saved to backend API:', response.data);
            // Note: Django signal will automatically sync this to Supabase, so no manual Supabase save needed
            
            // Dispatch event to refresh session logs in StudyTimer page
            window.dispatchEvent(new CustomEvent('studyTimerSessionSaved'));
          } catch (backendError: any) {
            console.error('❌ Failed to save session to backend API:', backendError);
            
            // Only try Supabase as fallback if backend save fails
            // Check if it's a duplicate error (409 or similar)
            if (backendError.response?.status === 409 || backendError.response?.status === 400) {
              console.warn('⚠️ Session might be a duplicate (backend returned conflict), skipping Supabase fallback');
              return;
            }
            
            // Try Supabase as fallback only if backend completely fails
            try {
              // Get Supabase auth user ID (UUID) - this is what Supabase expects
              const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
              const supabaseUserId = supabaseAuthUser?.id;
              
              if (supabaseUserId) {
                // Check for duplicate in Supabase before saving
                const { data: existingSupabaseSessions } = await supabase
                  .from('study_timer_sessions')
                  .select('start_time, session_type')
                  .eq('user_id', supabaseUserId)
                  .eq('session_type', sessionType);
                
                const isDuplicateInSupabase = existingSupabaseSessions?.some((s: any) => {
                  const existingStart = new Date(s.start_time).toISOString();
                  return existingStart === sessionStartISO;
                });
                
                if (isDuplicateInSupabase) {
                  console.warn('⚠️ Duplicate session detected in Supabase, skipping save');
                  return;
                }
                
                const { data, error } = await supabase
                  .from('study_timer_sessions')
                  .insert([{
                    user_id: supabaseUserId, // Use Supabase auth UUID
                    session_type: sessionType,
                    start_time: sessionStartISO,
                    end_time: endISO,
                    duration: duration,
                  }])
                  .select();
                
                if (error) {
                  console.error('❌ Failed to save session to Supabase (fallback):', error);
                } else {
                  console.log('✅ Session saved to Supabase (fallback):', data);
                  // Dispatch event to refresh session logs in StudyTimer page
                  window.dispatchEvent(new CustomEvent('studyTimerSessionSaved'));
                }
              } else {
                console.warn('⚠️ No Supabase auth user found, cannot save to Supabase');
              }
            } catch (supabaseFallbackErr) {
              console.error('❌ Failed to save session to Supabase (fallback):', supabaseFallbackErr);
            }
          }
        } catch (error) {
          console.error('❌ Error saving session:', error);
          // Continue anyway - localStorage backup is already saved
        }
      };
      
      saveSessionToBackend().then(() => {
        // After saving, refresh the actual sessions count to ensure sync
        // This is especially important if the save succeeded but counter wasn't incremented
        const refreshCount = async () => {
          try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            
            const user = JSON.parse(userData);
            const userId = user.id;
            if (!userId) return;
            
            // Try backend first
            const token = localStorage.getItem('accessToken');
            if (token) {
              try {
                const response = await axiosInstance.get('/tasks/study-timer-sessions/');
                const sessions = response.data || [];
                const studyCount = sessions.filter((s: any) => s.session_type === 'Study').length;
                
                // Always update the counter, even if it's 0
                setTimerState(prev => ({
                  ...prev,
                  sessionsCompleted: studyCount
                }));
                console.log('📊 Counter updated after session save (backend):', studyCount);
                return;
              } catch (e) {
                console.warn('Failed to refresh from backend, trying Supabase:', e);
              }
            }
            
            // Try Supabase
            try {
              // Get Supabase auth user ID (UUID) - this is what Supabase expects
              const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
              const supabaseUserId = supabaseAuthUser?.id;
              
              if (supabaseUserId) {
                const { data: supabaseSessions, error } = await supabase
                  .from('study_timer_sessions')
                  .select('session_type')
                  .eq('user_id', supabaseUserId) // Use Supabase auth UUID
                  .eq('session_type', 'Study');
                
                if (!error && supabaseSessions) {
                  const studyCount = supabaseSessions.length;
                  // Always update the counter, even if it's 0
                  setTimerState(prev => ({
                    ...prev,
                    sessionsCompleted: studyCount
                  }));
                  console.log('📊 Counter updated after session save (Supabase):', studyCount);
                }
              } else {
                console.warn('⚠️ No Supabase auth user found, cannot refresh from Supabase');
              }
            } catch (e) {
              console.warn('Failed to refresh from Supabase:', e);
            }
          } catch (e) {
            // Ignore errors in refresh
          }
        };
        
        // Small delay to ensure backend has processed the save
        setTimeout(refreshCount, 1000);
      });
    }

    if (!prevState.isBreak) {
      // Study session completed
      const newSessionsCompleted = prevState.sessionsCompleted + 1;
      
      if (pomodoroMode) {
        // Pomodoro ON: Automatically switch to break and start it
        const shouldTakeLongBreak = newSessionsCompleted >= prevState.settings.sessionsUntilLongBreak;
        const newTimeLeft = shouldTakeLongBreak ? prevState.settings.longBreakDuration : prevState.settings.breakDuration;
        
        // Play break start sound
        playBreakStartSound();
        
        // Reset the completion guard BEFORE setting state so timer can start properly
        isCompletingRef.current = false;
        
        // Force clear any existing interval first to ensure clean restart
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        
        // Use a small delay to ensure the interval is fully cleared before starting the break timer
        // This ensures the useEffect properly detects the state change and restarts the interval
        setTimeout(() => {
          setTimerState(prev => ({
            ...prev,
            isActive: true,  // Automatically start the break timer
            isBreak: true,
            timeLeft: newTimeLeft,
            sessionsCompleted: newSessionsCompleted,
            sessionStart: new Date()
          }));
        }, 50);
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

  // Save stopwatch session
  const saveStopwatchSession = async (elapsedSeconds: number, sessionStart: Date) => {
    if (elapsedSeconds <= 0) return; // Don't save sessions with 0 duration
    
    const end = new Date();
    const sessionType = 'Study';
    
    try {
      const sessionStartISO = sessionStart.toISOString();
      const endISO = new Date().toISOString();
      
      // Check for duplicates before saving
      const existingLogs = JSON.parse(localStorage.getItem('studyTimerLogs') || '[]');
      const isDuplicateInLocalStorage = existingLogs.some((log: any) => {
        const logStart = new Date(log.start).toISOString();
        return logStart === sessionStartISO && log.type === sessionType;
      });
      
      if (isDuplicateInLocalStorage) {
        console.warn('⚠️ Duplicate stopwatch session detected in localStorage, skipping save');
        return; // Don't save duplicate
      }
      
      // Store session log in localStorage (for backward compatibility)
      existingLogs.push({
        type: sessionType,
        start: sessionStart,
        end: new Date(),
        duration: elapsedSeconds,
      });
      localStorage.setItem('studyTimerLogs', JSON.stringify(existingLogs));
      
      // Save to backend API first (primary method)
      // Django backend will automatically sync to Supabase via signals, so we don't need to manually save to Supabase
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            const userId = user.id;
            
            if (userId) {
              // Check for duplicate in backend before saving
              try {
                const existingSessions = await axiosInstance.get('/tasks/study-timer-sessions/');
                const sessions = existingSessions.data || [];
                const isDuplicateInBackend = sessions.some((s: any) => {
                  const existingStart = new Date(s.start_time).toISOString();
                  return existingStart === sessionStartISO && s.session_type === sessionType;
                });
                
                if (isDuplicateInBackend) {
                  console.warn('⚠️ Duplicate stopwatch session detected in backend, skipping save');
                  return; // Don't save duplicate
                }
              } catch (checkError) {
                console.warn('⚠️ Failed to check for duplicates in backend, proceeding with save:', checkError);
              }
              
              const response = await axiosInstance.post('/tasks/study-timer-sessions/', {
                session_type: sessionType,
                start_time: sessionStartISO,
                end_time: endISO,
                duration: elapsedSeconds,
              });
              console.log('✅ Stopwatch session saved to backend API:', response.data);
              // Note: Django signal will automatically sync this to Supabase, so no manual Supabase save needed
              
              // Refresh sessions count
              refreshSessionsCount();
              
              // Dispatch event to refresh session logs in StudyTimer page
              window.dispatchEvent(new CustomEvent('studyTimerSessionSaved'));
            }
          }
        } catch (backendError: any) {
          console.error('❌ Failed to save stopwatch session to backend API:', backendError);
          
          // Only try Supabase as fallback if backend save fails and it's not a duplicate error
          if (backendError.response?.status !== 409 && backendError.response?.status !== 400) {
            try {
              // Get Supabase auth user ID (UUID) - this is what Supabase expects
              const { data: { user: supabaseAuthUser } } = await supabase.auth.getUser();
              const supabaseUserId = supabaseAuthUser?.id;
              
              if (supabaseUserId) {
                // Check for duplicate in Supabase before saving
                const { data: existingSupabaseSessions } = await supabase
                  .from('study_timer_sessions')
                  .select('start_time, session_type')
                  .eq('user_id', supabaseUserId)
                  .eq('session_type', sessionType);
                
                const isDuplicateInSupabase = existingSupabaseSessions?.some((s: any) => {
                  const existingStart = new Date(s.start_time).toISOString();
                  return existingStart === sessionStartISO;
                });
                
                if (!isDuplicateInSupabase) {
                  const { error: supabaseError } = await supabase
                    .from('study_timer_sessions')
                    .insert([{
                      user_id: supabaseUserId, // Use Supabase auth UUID
                      session_type: sessionType,
                      start_time: sessionStartISO,
                      end_time: endISO,
                      duration: elapsedSeconds,
                    }]);
                  
                  if (supabaseError) {
                    console.warn('⚠️ Failed to save stopwatch session to Supabase (fallback):', supabaseError);
                  } else {
                    console.log('✅ Stopwatch session saved to Supabase (fallback)');
                    refreshSessionsCount();
                    // Dispatch event to refresh session logs in StudyTimer page
                    window.dispatchEvent(new CustomEvent('studyTimerSessionSaved'));
                  }
                } else {
                  console.warn('⚠️ Duplicate stopwatch session detected in Supabase, skipping save');
                }
              } else {
                console.warn('⚠️ No Supabase auth user found, skipping Supabase save');
              }
            } catch (supabaseErr) {
              console.warn('⚠️ Supabase save error (fallback):', supabaseErr);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error saving stopwatch session:', error);
    }
  };

  const pauseTimer = () => {
    setTimerState(prev => {
      // In stopwatch mode, just pause - don't save the session
      // User will save it using the Reset button
      return {
        ...prev,
        isActive: false
      };
    });
  };

  const resetTimer = () => {
    // Reset guard when resetting timer
    isCompletingRef.current = false;
    
    setTimerState(prev => {
      // In stopwatch mode, save the session before resetting (if there's elapsed time)
      if (stopwatchMode && prev.sessionStart && prev.elapsedTime > 0) {
        // Save stopwatch session asynchronously before resetting
        saveStopwatchSession(prev.elapsedTime, prev.sessionStart);
      }
      
      return {
        ...prev,
        isActive: false,
        isBreak: false,
        timeLeft: stopwatchMode ? 0 : prev.settings.studyDuration,
        elapsedTime: 0, // Reset stopwatch elapsed time
        // Keep sessionsCompleted as is - don't reset it
        sessionStart: null
      };
    });
    
    // Clear only the timer state from localStorage on reset (keep sessions completed)
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
    setPomodoroMode,
    stopwatchMode,
    setStopwatchMode,
    refreshSessionsCount
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};
