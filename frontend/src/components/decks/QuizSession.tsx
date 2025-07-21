import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Target } from 'lucide-react';
import { useNavbar } from '../../context/NavbarContext';

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
  deckId?: string; // Add deckId prop
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
  deckId // Add deckId prop
}) => {
  // Shuffle flashcards once at the start
  const [shuffledFlashcards] = useState(() => {
    const arr = [...flashcards];
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

  const currentQuestion = shuffledFlashcards[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / shuffledFlashcards.length) * 100;

  // Generate multiple choice options for current question
  useEffect(() => {
    if (currentQuestion) {
      // Get 3 random wrong answers from other flashcards
      const wrongAnswers = shuffledFlashcards
        .filter(f => f.id !== currentQuestion.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(f => f.back);

      // Combine correct answer with wrong answers and shuffle
      const allOptions = [currentQuestion.back, ...wrongAnswers]
        .sort(() => Math.random() - 0.5);
      
      setOptions(allOptions);
    }
  }, [currentQuestionIndex, shuffledFlashcards]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    
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

    // POST QuizSession to backend
    if (deckId) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('access');
      await fetch('/api/decks/quizzes/sessions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          deck: deckId,
          score: quizResults.score,
          completed_at: new Date().toISOString()
        })
      });
    }

    setQuizComplete(true);
    onComplete(quizResults);
  };

  const { isCollapsed } = useNavbar();
  const marginClass = `md:ml-${isCollapsed ? '20' : '64'}`;

  if (quizComplete) {
    const correctAnswers = Object.entries(answers).filter(
      ([id, answer]) => shuffledFlashcards.find(f => f.id === id)?.back === answer
    ).length;
    const score = Math.round((correctAnswers / shuffledFlashcards.length) * 100);

    return (
      <div className="fixed inset-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
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
          </div>

          {/* Results Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-4xl">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Quiz Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your results for "{deckTitle}"
              </p>
            </div>

            {/* Score Display */}
            <div className="mb-8">
              <div className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                {score}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {correctAnswers} out of {shuffledFlashcards.length} correct
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Decks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto">
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
          <div className="text-right">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {deckTitle} - Quiz
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {shuffledFlashcards.length}
            </p>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {currentQuestion.front}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={!!selectedAnswer}
                  className={`px-4 py-3 rounded-lg border text-base font-medium transition-colors focus:outline-none
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