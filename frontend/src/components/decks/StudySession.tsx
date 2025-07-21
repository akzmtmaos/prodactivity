import React, { useState, useEffect } from 'react';
import { ArrowLeft, SkipForward, RotateCcw, CheckCircle, Target } from 'lucide-react';
import Flashcard from './Flashcard';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface StudySessionProps {
  deckTitle: string;
  flashcards: FlashcardData[];
  onClose: () => void;
  onComplete: (results: StudyResults) => void;
}

interface StudyResults {
  totalCards: number;
  completedCards: number;
  easyCards: number;
  mediumCards: number;
  hardCards: number;
  timeSpent: number;
}

const StudySession: React.FC<StudySessionProps> = ({
  deckTitle,
  flashcards,
  onClose,
  onComplete
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [cardResults, setCardResults] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  const [startTime] = useState(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentCard = flashcards[currentCardIndex];
  const progress = (completedCards.size / flashcards.length) * 100;

  const handleFlip = () => {
    setShowAnswer(!showAnswer);
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;

    // Mark card as completed and record difficulty
    const newCompleted = new Set(completedCards);
    newCompleted.add(currentCard.id);
    setCompletedCards(newCompleted);

    const newResults = { ...cardResults };
    newResults[currentCard.id] = difficulty;
    setCardResults(newResults);

    // Move to next card or complete session
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      completeSession(newCompleted, newResults);
    }
  };

  const handleSkip = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const completeSession = (completed: Set<string>, results: Record<string, 'easy' | 'medium' | 'hard'>) => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60); // minutes
    const easyCards = Object.values(results).filter(r => r === 'easy').length;
    const mediumCards = Object.values(results).filter(r => r === 'medium').length;
    const hardCards = Object.values(results).filter(r => r === 'hard').length;

    const studyResults: StudyResults = {
      totalCards: flashcards.length,
      completedCards: completed.size,
      easyCards,
      mediumCards,
      hardCards,
      timeSpent
    };

    setSessionComplete(true);
    onComplete(studyResults);
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setCompletedCards(new Set());
    setCardResults({});
    setSessionComplete(false);
  };

  if (flashcards.length === 0) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto flex flex-col items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Flashcards</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This deck has no flashcards to practice. Please add some cards first!</p>
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

  if (sessionComplete) {
    const easyCount = Object.values(cardResults).filter(r => r === 'easy').length;
    const mediumCount = Object.values(cardResults).filter(r => r === 'medium').length;
    const hardCount = Object.values(cardResults).filter(r => r === 'hard').length;
    const timeSpent = Math.round((Date.now() - startTime) / 1000 / 60);

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

          {/* Completion Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center w-full max-w-4xl">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Study Session Complete!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Great job studying "{deckTitle}"
              </p>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedCards.size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Cards Studied
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {easyCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Easy
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {mediumCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Medium
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {hardCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Hard
                </div>
              </div>
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={resetSession}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Study Again
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Back to Decks
              </button>
            </div>
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

        {/* Flashcard */}
        <div className="mb-8 w-full max-w-4xl">
          <Flashcard
            flashcard={currentCard}
            showAnswer={showAnswer}
            onFlip={handleFlip}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
          <div className="flex flex-row gap-2 justify-center">
            <button
              onClick={handlePrevious}
              disabled={currentCardIndex === 0}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={handleSkip}
              disabled={currentCardIndex === flashcards.length - 1}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            {showAnswer && (
              <>
                <button
                  onClick={() => handleDifficultySelect('easy')}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg font-medium transition-colors"
                >
                  Easy
                </button>
                <button
                  onClick={() => handleDifficultySelect('medium')}
                  className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg font-medium transition-colors"
                >
                  Medium
                </button>
                <button
                  onClick={() => handleDifficultySelect('hard')}
                  className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors"
                >
                  Hard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySession;