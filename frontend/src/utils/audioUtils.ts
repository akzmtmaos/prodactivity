// Audio utility functions for study timer

export const playSound = (soundName: 'start' | 'pause' | 'complete' | 'tick'): void => {
  try {
    // Create audio context if needed
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different frequencies for different sounds
    const frequencies: Record<string, number> = {
      start: 523.25,    // C5
      pause: 392.00,    // G4
      complete: 659.25, // E5
      tick: 293.66      // D4
    };
    
    const frequency = frequencies[soundName] || 440;
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    // Set volume and duration
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    // Play sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
  } catch (error) {
    console.warn('Failed to play sound:', error);
  }
};

export const vibrate = (pattern: number | number[] = 200): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Timer-specific sound functions (used by TimerContext)
export const playTimerCompleteSound = (): void => {
  playSound('complete');
  vibrate([200, 100, 200]);
};

export const playBreakStartSound = (): void => {
  playSound('start');
  vibrate(200);
};

