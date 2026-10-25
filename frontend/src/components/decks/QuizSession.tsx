import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Volume2, VolumeX, X } from 'lucide-react';
import { useNavbar } from '../../context/NavbarContext';
import axiosInstance from '../../utils/axiosConfig';
import {
  areQuizSoundsEnabled,
  setQuizSoundsEnabled,
  playCorrectSound,
  playWrongSound,
  playQuizCompleteSound,
  playGroupQuizCompleteSound,
} from '../../utils/quizSounds';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface QuizSessionProps {
  deckTitle: string;
  flashcards: FlashcardData[];
  onClose: () => void;
  onComplete: (results: QuizResults) => void;
  deckId?: string;
  /** When set, quiz is part of a group quiz; results are submitted and "View Group Results" is shown */
  groupQuizId?: string;
  onViewGroupResults?: (groupQuizId: string) => void;
}

interface QuizResults {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number;
}

const QuizSession: React.FC<QuizSessionProps> = ({
  deckTitle,
  flashcards,
  onClose,
  onComplete,
  deckId,
  groupQuizId,
  onViewGroupResults
}) => {
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL LOGIC
  const { isCollapsed } = useNavbar();
  
  // Shuffle flashcards once at the start
  const [shuffledFlashcards] = useState(() => {
    const arr = [...flashcards].filter(f => f && f.id && f.front && f.back);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [quizComplete, setQuizComplete] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  // Feedback sounds are on by default and can be muted from the quiz header
  const [soundEnabled, setSoundEnabled] = useState(() => areQuizSoundsEnabled());

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      setQuizSoundsEnabled(!enabled);
      return !enabled;
    });
  };

  // Generate multiple choice options for current question
  useEffect(() => {
    if (shuffledFlashcards.length > 0 && currentQuestionIndex < shuffledFlashcards.length) {
      const currentQuestion = shuffledFlashcards[currentQuestionIndex];
      if (currentQuestion) {
        // Get unique wrong answers from other flashcards (avoid duplicates)
        const availableAnswers = shuffledFlashcards
          .filter(f => f.id !== currentQuestion.id && f.back !== currentQuestion.back)
          .map(f => f.back);
        
        // Remove duplicates from available answers
        const uniqueAnswers = availableAnswers.filter((answer, index) => 
          availableAnswers.indexOf(answer) === index
        );
        
        // Get 3 random wrong answers (or as many as available)
        const wrongAnswers = uniqueAnswers
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(3, uniqueAnswers.length));

        // Combine correct answer with wrong answers and shuffle
        const allOptions = [currentQuestion.back, ...wrongAnswers]
          .sort(() => Math.random() - 0.5);
        
        setOptions(allOptions);
      }
    }
  }, [currentQuestionIndex, shuffledFlashcards]);

  const currentQuestion = shuffledFlashcards[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / shuffledFlashcards.length) * 100;

  // NOW WE CAN HAVE CONDITIONAL LOGIC AFTER ALL HOOKS ARE CALLED
  
  // Handle empty flashcards case
  if (flashcards.length === 0) {
    return (
      <div className="fixed inset-0 z-40 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Flashcards</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This deck has no flashcards to quiz. Please add some cards first!</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  // Safety check for current question
  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-40 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load quiz questions. Please try again.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);

    // Immediate audio feedback for right / wrong
    if (answer === currentQuestion.back) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    // Record the answer
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < shuffledFlashcards.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        completeQuiz();
      }
    }, 1000);
  };

  const completeQuiz = async () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
    const correctAnswers = Object.entries(answers).filter(
      ([id, answer]) => shuffledFlashcards.find(f => f.id === id)?.back === answer
    ).length;

    const quizResults: QuizResults = {
      totalQuestions: shuffledFlashcards.length,
      correctAnswers,
      score: Math.round((correctAnswers / shuffledFlashcards.length) * 100),
      timeSpent
    };

    let quizSessionId: number | undefined;
    if (deckId) {
      const sessionRes = await axiosInstance.post('/decks/quizzes/sessions/', {
        deck: deckId,
        score: quizResults.score,
        completed_at: new Date().toISOString()
      });
      quizSessionId = sessionRes.data?.id;
    }

    if (groupQuizId) {
      try {
        await axiosInstance.post(`/decks/group-quizzes/${groupQuizId}/complete/`, {
          score: quizResults.score,
          total_questions: quizResults.totalQuestions,
          correct_answers: quizResults.correctAnswers,
          quiz_session_id: quizSessionId ?? undefined
        });
      } catch (err) {
        console.error('Failed to submit group quiz result:', err);
      }
    }

    setQuizComplete(true);
    if (groupQuizId) {
      playGroupQuizCompleteSound();
    } else {
      playQuizCompleteSound();
    }
    // Don't call onComplete automatically - let user manually exit
  };

  if (quizComplete) {
    const correctAnswers = Object.entries(answers).filter(
      ([id, answer]) => shuffledFlashcards.find(f => f.id === id)?.back === answer
    ).length;
    const score = Math.round((correctAnswers / shuffledFlashcards.length) * 100);
    const incorrectAnswers = shuffledFlashcards.length - correctAnswers;

    const performance =
      score >= 90 ? 'Excellent' :
      score >= 80 ? 'Very good' :
      score >= 70 ? 'Good' :
      score >= 60 ? 'Fair' :
      'Needs improvement';

    const performanceStyles =
      score >= 90 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
      score >= 80 ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400' :
      score >= 70 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
      score >= 60 ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' :
      'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';

    const finishResults: QuizResults = {
      totalQuestions: shuffledFlashcards.length,
      correctAnswers,
      score,
      timeSpent: Math.round((Date.now() - startTime) / 1000 / 60)
    };

    return (
      <div className="fixed inset-0 z-40 w-screen h-screen overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="flex min-h-full items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* Card header */}
            <div className="flex items-center justify-between gap-4 px-6 pt-5 sm:px-8">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                <Check size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-500" />
                Quiz complete
              </div>
              <button
                onClick={onClose}
                aria-label="Close results"
                className="-mr-1 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Score */}
            <div className="px-6 pb-7 pt-5 text-center sm:px-8">
              <h2 className="break-words text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                {deckTitle}
              </h2>
              <div className="mt-5 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {score}<span className="text-2xl text-gray-400 dark:text-gray-500">%</span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {correctAnswers} of {shuffledFlashcards.length}
                </span>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-y border-gray-100 dark:divide-gray-800 dark:border-gray-800">
              <div className="px-3 py-4 text-center">
                <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {shuffledFlashcards.length}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Questions
                </div>
              </div>
              <div className="px-3 py-4 text-center">
                <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {correctAnswers}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Correct
                </div>
              </div>
              <div className="px-3 py-4 text-center">
                <div className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {incorrectAnswers}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Missed
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="flex items-center justify-between px-6 py-4 sm:px-8">
              <span className="text-sm text-gray-500 dark:text-gray-400">Performance</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${performanceStyles}`}>
                {performance}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:px-8">
              {groupQuizId && onViewGroupResults && (
                <button
                  onClick={() => onViewGroupResults(groupQuizId)}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  View group results
                </button>
              )}
              <button
                onClick={() => onComplete(finishResults)}
                className={groupQuizId
                  ? 'flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                  : 'flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700'}
              >
                Back to decks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="py-8 px-4 flex flex-col items-center justify-start min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 w-full max-w-4xl">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Decks
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Mute quiz sounds' : 'Unmute quiz sounds'}
              title={soundEnabled ? 'Mute quiz sounds' : 'Unmute quiz sounds'}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="text-right">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {deckTitle} - Quiz
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {shuffledFlashcards.length}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 w-full max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="mb-8 w-full max-w-4xl">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 shadow text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {currentQuestion.front && currentQuestion.front.includes('<img') ? (
                <div dangerouslySetInnerHTML={{ __html: currentQuestion.front.replace(/<br\/?>/gi, '<br/>') }} className="[&_img]:max-w-full [&_img]:max-h-64 [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-gray-300 [&_img]:dark:border-gray-600 [&_img]:mt-2 [&_img]:mx-auto [&_img]:block" />
              ) : (
                <>{currentQuestion.front}</>
              )}
            </div>
            <div className="space-y-3">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={!!selectedAnswer}
                  className={`w-full px-4 py-3 rounded-lg border text-base font-medium transition-colors focus:outline-none
                    ${selectedAnswer === option
                      ? option === currentQuestion.back
                        ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400'
                        : 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-400 dark:border-red-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizSession; 