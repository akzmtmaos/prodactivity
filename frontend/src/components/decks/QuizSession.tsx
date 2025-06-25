import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Target } from 'lucide-react';

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
  onComplete
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

  const completeQuiz = () => {
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

    setQuizComplete(true);
    onComplete(quizResults);
  };

  if (quizComplete) {
    const correctAnswers = Object.entries(answers).filter(
      ([id, answer]) => shuffledFlashcards.find(f => f.id === id)?.back === answer
    ).length;
    const score = Math.round((correctAnswers / shuffledFlashcards.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Decks
            </button>
          </div>

          {/* Results Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
        <div className="mb-8">
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
        {currentQuestion && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              {currentQuestion.front}
            </h2>

            {/* Answer Options */}
            <div className="space-y-4">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 text-left rounded-lg transition-colors ${
                    selectedAnswer === option
                      ? option === currentQuestion.back
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSession; 