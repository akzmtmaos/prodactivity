/**
 * Audio utilities for timer notifications
 */

// Create audio context for playing sounds
let audioContext: AudioContext | null = null;

export const playTimerCompleteSound = () => {
  try {
    // Create audio context if it doesn't exist
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if it's suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create oscillator for a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set sound properties
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Drop to 600 Hz
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2); // Back to 800 Hz

    // Set volume envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    // Start and stop the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Could not play timer sound:', error);
  }
};

export const playBreakStartSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sound for break start (higher pitch, shorter duration)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play break sound:', error);
  }
};
