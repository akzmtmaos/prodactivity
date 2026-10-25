// Quiz feedback sounds, synthesized with the Web Audio API so nothing extra ships with the app.
// Mirrors the tone-based approach already used by utils/audioUtils.ts, but keeps a single
// AudioContext and remembers whether the user wants sound.

const STORAGE_KEY = 'prodactivity-quiz-sounds';
const VOLUME_KEY = 'prodactivity-quiz-sounds-volume';

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!audioContext) audioContext = new Ctor();
    // Browsers start the context suspended until a user gesture
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch (error) {
    console.warn('Quiz sounds unavailable:', error);
    return null;
  }
};

export const areQuizSoundsEnabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setQuizSoundsEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore
  }
};

/** 0–1 multiplier for every quiz tone; 1 is the designed level */
export const getQuizVolume = (): number => {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 1;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(1, Math.max(0, parsed));
  } catch {
    return 1;
  }
};

export const setQuizVolume = (volume: number): void => {
  try {
    localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
  } catch {
    // ignore
  }
};

interface ToneOptions {
  frequency: number;
  /** Seconds to wait before this note starts, relative to now */
  delay?: number;
  /** Seconds the note rings for */
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** Optional pitch target, glided to over the duration */
  slideTo?: number;
}

const playTone = (audio: AudioContext, {
  frequency,
  delay = 0,
  duration = 0.16,
  type = 'sine',
  volume = 0.16,
  slideTo,
}: ToneOptions): void => {
  const scaledVolume = volume * getQuizVolume();
  // exponentialRamp needs a positive target, and zero volume should stay silent
  if (scaledVolume <= 0) return;

  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
  }

  // Quick attack and exponential release, so notes don't click or drag
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(scaledVolume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

/** Rising triad (C5–E5–G5): a small reward for a right answer */
export const playCorrectSound = (): void => {
  if (!areQuizSoundsEnabled()) return;
  const audio = getAudioContext();
  if (!audio) return;

  playTone(audio, { frequency: 523.25, type: 'triangle', duration: 0.12, volume: 0.16 });
  playTone(audio, { frequency: 659.25, delay: 0.07, type: 'triangle', duration: 0.12, volume: 0.15 });
  playTone(audio, { frequency: 783.99, delay: 0.14, type: 'triangle', duration: 0.2, volume: 0.14 });
};

/** Two low buzzy notes sliding downward: unmistakably "not that one" */
export const playWrongSound = (): void => {
  if (!areQuizSoundsEnabled()) return;
  const audio = getAudioContext();
  if (!audio) return;

  playTone(audio, { frequency: 220, type: 'square', duration: 0.16, volume: 0.09, slideTo: 165 });
  playTone(audio, { frequency: 174.61, delay: 0.13, type: 'square', duration: 0.26, volume: 0.08, slideTo: 130 });
};

/** Fanfare for finishing a solo quiz (C5–E5–G5–C6) */
export const playQuizCompleteSound = (): void => {
  if (!areQuizSoundsEnabled()) return;
  const audio = getAudioContext();
  if (!audio) return;

  playTone(audio, { frequency: 523.25, type: 'triangle', duration: 0.16, volume: 0.15 });
  playTone(audio, { frequency: 659.25, delay: 0.12, type: 'triangle', duration: 0.16, volume: 0.15 });
  playTone(audio, { frequency: 783.99, delay: 0.24, type: 'triangle', duration: 0.16, volume: 0.14 });
  playTone(audio, { frequency: 1046.5, delay: 0.36, type: 'triangle', duration: 0.34, volume: 0.13 });
};

/** Same fanfare with a low root under it, so a group submission sounds like a team win */
export const playGroupQuizCompleteSound = (): void => {
  if (!areQuizSoundsEnabled()) return;
  const audio = getAudioContext();
  if (!audio) return;

  playQuizCompleteSound();
  playTone(audio, { frequency: 130.81, delay: 0.36, type: 'sine', duration: 0.5, volume: 0.12 });
  playTone(audio, { frequency: 196, delay: 0.36, type: 'sine', duration: 0.5, volume: 0.1 });
};
