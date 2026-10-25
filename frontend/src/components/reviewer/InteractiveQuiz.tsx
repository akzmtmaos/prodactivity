import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowLeft, Check, RotateCcw, Volume2, VolumeX, X, XCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import {
  areQuizSoundsEnabled,
  setQuizSoundsEnabled,
  playCorrectSound,
  playWrongSound,
  playQuizCompleteSound,
} from '../../utils/quizSounds';

interface Question {
  number: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

interface Quiz {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface InteractiveQuizProps {
  quiz: Quiz;
  onClose: () => void;
  onScoreUpdate?: (quizId: number, score: number) => void;
}

type AnswerLetter = 'A' | 'B' | 'C' | 'D';

const parseQuizContent = (content: string): Question[] => {
  const questions: Question[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentQuestion: Partial<Question> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Match question line: Q1., Q2., etc.
    const questionMatch = line.match(/^Q(\d+)\.\s*(.+)/i);
    if (questionMatch) {
      // Save previous question if valid
      if (currentQuestion && currentQuestion.number && currentQuestion.question && currentQuestion.options && currentQuestion.correctAnswer) {
        questions.push(currentQuestion as Question);
      }
      
      const questionText = questionMatch[2];
      
      // Skip if this looks like a section header (contains : or – or —)
      // These are lines like "Q3. The Concept: Something – Subtitle"
      const looksLikeHeader = questionText.includes(':') || questionText.includes('–') || questionText.includes('—');
      
      // Start new question (with empty text if it's a header - will be filled by next line)
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        question: looksLikeHeader ? '' : questionText,
        options: { A: '', B: '', C: '', D: '' }
      };
      continue;
    }
    
    // Match option lines: A), B), C), D)
    const optionMatch = line.match(/^([A-D])\)\s*(.+)/i);
    if (optionMatch && currentQuestion && currentQuestion.options) {
      const optionLetter = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      currentQuestion.options[optionLetter] = optionMatch[2];
      continue;
    }
    
    // Skip "Correct" line (it's just a separator before "Answer:")
    if (line.toLowerCase() === 'correct') {
      continue;
    }
    
    // Match answer line: "Answer: A" or "Correct Answer: A"
    const answerMatch = line.match(/^(?:Correct\s+)?Answer:\s*([A-D])/i);
    if (answerMatch && currentQuestion) {
      currentQuestion.correctAnswer = answerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      continue;
    }
    
    // If we have a current question but haven't hit options yet, 
    // append this line to the question text (handles multi-line questions)
    if (currentQuestion && !currentQuestion.correctAnswer) {
      // Check if we haven't started options yet (all options are empty)
      const hasOptions = Object.values(currentQuestion.options || {}).some(opt => opt !== '');
      if (!hasOptions) {
        // Skip lines that look like section headers (contain colons or dashes)
        // These are typically formatting like "The Concept: Something" or "Title – Subtitle"
        const looksLikeHeader = line.includes(':') || line.includes('–') || line.includes('—');
        if (!looksLikeHeader) {
          // If question is empty, set it; otherwise append
          if (!currentQuestion.question) {
            currentQuestion.question = line;
          } else {
            currentQuestion.question += ' ' + line;
          }
        }
      }
    }
  }
  
  // Push last question if valid
  if (currentQuestion && currentQuestion.number && currentQuestion.question && currentQuestion.options && currentQuestion.correctAnswer) {
    questions.push(currentQuestion as Question);
  }
  
  return questions;
};

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({ quiz, onClose, onScoreUpdate }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerLetter | null>(null);
  const [answers, setAnswers] = useState<{ [index: number]: AnswerLetter }>({});
  const [quizComplete, setQuizComplete] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  // Feedback sounds are on by default and can be muted from the quiz header
  const [soundEnabled, setSoundEnabled] = useState(() => areQuizSoundsEnabled());

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      setQuizSoundsEnabled(!enabled);
      return !enabled;
    });
  };

  useEffect(() => {
    const parsed = parseQuizContent(quiz.content);
    setQuestions(parsed);
  }, [quiz.content]);

  // Hide navbar and ensure full screen coverage when quiz is active
  useEffect(() => {
    // Add class to body and html to hide navbar
    document.body.classList.add('quiz-active');
    document.documentElement.classList.add('quiz-active');
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Hide navbar elements directly - use more specific selectors
    const hideNavbar = () => {
      // Desktop sidebar navbar
      const desktopNav = document.querySelector('aside.fixed.inset-y-0');
      // Mobile top navbar
      const mobileTopNav = document.querySelector('div.md\\:hidden.fixed.top-0');
      // Mobile bottom navbar  
      const mobileBottomNav = document.querySelector('div.md\\:hidden.fixed.bottom-0');
      // Timer widget
      const timerWidget = document.querySelector('[class*="TimerWidget"]');
      
      if (desktopNav) (desktopNav as HTMLElement).style.display = 'none';
      if (mobileTopNav) (mobileTopNav as HTMLElement).style.display = 'none';
      if (mobileBottomNav) (mobileBottomNav as HTMLElement).style.display = 'none';
      if (timerWidget) (timerWidget as HTMLElement).style.display = 'none';
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(hideNavbar, 10);
    
    return () => {
      // Cleanup: remove classes and restore
      document.body.classList.remove('quiz-active');
      document.documentElement.classList.remove('quiz-active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Show navbar elements again
      const desktopNav = document.querySelector('aside.fixed.inset-y-0');
      const mobileTopNav = document.querySelector('div.md\\:hidden.fixed.top-0');
      const mobileBottomNav = document.querySelector('div.md\\:hidden.fixed.bottom-0');
      const timerWidget = document.querySelector('[class*="TimerWidget"]');
      
      if (desktopNav) (desktopNav as HTMLElement).style.display = '';
      if (mobileTopNav) (mobileTopNav as HTMLElement).style.display = '';
      if (mobileBottomNav) (mobileBottomNav as HTMLElement).style.display = '';
      if (timerWidget) (timerWidget as HTMLElement).style.display = '';
    };
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const countCorrect = (given: { [index: number]: AnswerLetter }) =>
    questions.reduce(
      (correct, question, index) => (given[index] === question.correctAnswer ? correct + 1 : correct),
      0
    );

  const saveScore = async (correct: number, total: number) => {
    if (scoreSaved || total === 0) return; // Prevent duplicate saves
    
    const percentage = Math.round((correct / total) * 100);

    try {
      await axiosInstance.patch(`/reviewers/${quiz.id}/`, {
        best_score: percentage,
        best_score_correct: correct,
        best_score_total: total
      });
      setScoreSaved(true);
      
      // Call parent callback if provided
      if (onScoreUpdate) {
        onScoreUpdate(quiz.id, percentage);
      }
      
      console.log(`✅ Score saved: ${correct}/${total} (${percentage}%) for quiz ${quiz.id}`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const completeQuiz = (finalAnswers: { [index: number]: AnswerLetter }) => {
    playQuizCompleteSound();
    setQuizComplete(true);
    saveScore(countCorrect(finalAnswers), questions.length);
  };

  const handleAnswerSelect = (answer: AnswerLetter) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);

    // Immediate audio feedback for right / wrong
    if (answer === currentQuestion.correctAnswer) {
      playCorrectSound();
    } else {
      playWrongSound();
    }

    // Record the answer against the question's position (question numbers can repeat)
    const updatedAnswers = { ...answers, [currentQuestionIndex]: answer };
    setAnswers(updatedAnswers);

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        completeQuiz(updatedAnswers);
      }
    }, 1000);
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizComplete(false);
    setScoreSaved(false);
  };

  const closeButton = (
    <button
      onClick={onClose}
      className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <ArrowLeft size={20} className="mr-2" />
      Back
    </button>
  );

  const soundButton = (
    <button
      onClick={toggleSound}
      aria-label={soundEnabled ? 'Mute quiz sounds' : 'Unmute quiz sounds'}
      title={soundEnabled ? 'Mute quiz sounds' : 'Unmute quiz sounds'}
      className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
    >
      {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );

  if (questions.length === 0) {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-40 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-md">
          <XCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Quiz Format</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Unable to parse quiz questions. Please ensure the quiz is properly formatted.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (quizComplete) {
    const correctAnswers = countCorrect(answers);
    const score = Math.round((correctAnswers / questions.length) * 100);
    const incorrectAnswers = questions.length - correctAnswers;

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

    return ReactDOM.createPortal(
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
                {quiz.title}
              </h2>
              <div className="mt-5 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {score}<span className="text-2xl text-gray-400 dark:text-gray-500">%</span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {correctAnswers} of {questions.length}
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
                  {questions.length}
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
              <button
                onClick={handleRestart}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RotateCcw size={15} />
                Retake
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-40 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="py-8 px-4 flex flex-col items-center justify-start min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 w-full max-w-4xl">
          {closeButton}
          <div className="flex items-center gap-3">
            {soundButton}
            <div className="text-right">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {quiz.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {totalQuestions}
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
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {currentQuestion.question}
            </div>
            <div className="space-y-3">
              {Object.entries(currentQuestion.options).map(([letter, text]) => {
                const isSelected = selectedAnswer === letter;
                const isCorrect = currentQuestion.correctAnswer === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswerSelect(letter as AnswerLetter)}
                    disabled={!!selectedAnswer}
                    className={`w-full px-4 py-3 rounded-lg border text-base font-medium transition-colors focus:outline-none
                      ${isSelected
                        ? isCorrect
                          ? 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400'
                          : 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/20 dark:text-red-400 dark:border-red-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
                    `}
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InteractiveQuiz;
