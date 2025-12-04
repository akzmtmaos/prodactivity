import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';

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
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: 'A' | 'B' | 'C' | 'D' }>({});
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);

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
  const answeredCount = Object.keys(userAnswers).length;

  const handleAnswerSelect = (answer: 'A' | 'B' | 'C' | 'D') => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.number]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setEndTime(Date.now());
    setShowResults(true);
  };

  const handleRestart = () => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    setEndTime(null);
    setScoreSaved(false);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (userAnswers[q.number] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const saveScore = async (scoreData: { percentage: number; correct: number; total: number }) => {
    if (scoreSaved) return; // Prevent duplicate saves
    
    try {
      await axiosInstance.patch(`/reviewers/${quiz.id}/`, {
        best_score: scoreData.percentage,
        best_score_correct: scoreData.correct,
        best_score_total: scoreData.total
      });
      setScoreSaved(true);
      
      // Call parent callback if provided
      if (onScoreUpdate) {
        onScoreUpdate(quiz.id, scoreData.percentage);
      }
      
      console.log(`✅ Score saved: ${scoreData.correct}/${scoreData.total} (${scoreData.percentage}%) for quiz ${quiz.id}`);
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  // Save score when results are shown
  useEffect(() => {
    if (showResults && !scoreSaved) {
      const score = calculateScore();
      saveScore({
        percentage: score.percentage,
        correct: score.correct,
        total: score.total
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, scoreSaved]);

  const getTimeTaken = () => {
    if (!endTime) return '0:00';
    const seconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return ReactDOM.createPortal(
      <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto flex flex-col items-center justify-center z-[9999]" style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}>
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

  if (showResults) {
    const score = calculateScore();
    const incorrectAnswers = score.total - score.correct;

    return ReactDOM.createPortal(
      <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto z-[9999]" style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="py-8 px-4 flex flex-col items-center justify-start min-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 w-full max-w-4xl">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
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
                Your results for "{quiz.title}"
              </p>
            </div>

            {/* Score Display */}
            <div className="mb-8">
              <div className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                {score.percentage}%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {score.correct} out of {score.total} correct
              </p>
            </div>

            {/* Detailed Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quiz Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Questions */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {score.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Questions
                  </div>
                </div>
                
                {/* Correct Answers */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {score.correct}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Correct Answers
                  </div>
                </div>
                
                {/* Incorrect Answers */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {incorrectAnswers}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Incorrect Answers
                  </div>
                </div>
              </div>

              {/* Performance Level */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Performance Level
                </div>
                <div className={`text-lg font-bold ${
                  score.percentage >= 90 ? 'text-green-600 dark:text-green-400' :
                  score.percentage >= 80 ? 'text-blue-600 dark:text-blue-400' :
                  score.percentage >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  score.percentage >= 60 ? 'text-orange-600 dark:text-orange-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {score.percentage >= 90 ? 'Excellent!' :
                   score.percentage >= 80 ? 'Very Good!' :
                   score.percentage >= 70 ? 'Good!' :
                   score.percentage >= 60 ? 'Fair' :
                   'Needs Improvement'}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <RotateCcw size={18} />
                Retake Quiz
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return ReactDOM.createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-gray-50 dark:bg-gray-900 overflow-auto z-[9999]" style={{ margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="py-8 px-4 flex flex-col items-center justify-start min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 w-full max-w-4xl">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
          <div className="text-right">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {quiz.title} - Quiz
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Question {currentQuestionIndex + 1} of {totalQuestions}
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
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Question {currentQuestion.number}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {currentQuestion.question}
            </div>
            <div className="space-y-3">
              {Object.entries(currentQuestion.options).map(([letter, text]) => {
                const isSelected = userAnswers[currentQuestion.number] === letter;
                
                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswerSelect(letter as 'A' | 'B' | 'C' | 'D')}
                    className={`w-full px-4 py-3 rounded-lg border text-base font-medium transition-colors focus:outline-none
                      ${isSelected
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}
                    `}
                  >
                    {letter}) {text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Answered: {answeredCount} / {totalQuestions}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={answeredCount === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InteractiveQuiz;

