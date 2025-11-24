import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsService, Review, NewReview } from "../lib/reviewsService";
import Toast from "../components/common/Toast";
// @ts-ignore
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Smart Notes",
    description: "AI-powered organization with rich text editing and smart search."
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Progress Tracking",
    description: "Visualize achievements with charts and productivity analytics."
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: "Flashcards",
    description: "Spaced repetition learning with custom decks and progress tracking."
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Reviewer",
    description: "Adaptive learning with personalized study recommendations."
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Task Management",
    description: "Organize to-dos with priorities, deadlines, and progress tracking."
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Focus Timer",
    description: "Pomodoro technique with custom study sessions and focus tracking."
  }
];

const stats = [
  { number: "50K+", label: "Active Users" },
  { number: "2M+", label: "Notes Created" },
  { number: "500K+", label: "Tasks Completed" },
  { number: "98%", label: "Satisfaction Rate" }
];

// Animated Letter Component for PRODACTIVITY/PRODUCTIVITY
const AnimatedLetter = () => {
  const [currentLetter, setCurrentLetter] = useState<'A' | 'U'>('A');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLetter(prev => prev === 'A' ? 'U' : 'A');
    }, 2500); // Change every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <span 
      className="inline-block relative overflow-hidden"
      style={{ 
        width: '1ch',
        height: '1em',
        verticalAlign: 'baseline',
        lineHeight: '1em'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`letter-${currentLetter}`}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 2, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
          style={{ 
            position: 'absolute',
            left: 0,
            bottom: '-10px',
            width: '1ch',
            height: '1em',
            lineHeight: '1em',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit'
          }}
        >
          {currentLetter}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  
  // Review state
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [formErrors, setFormErrors] = useState<{ rating?: string; content?: string }>({});
  
  const [newReview, setNewReview] = useState({
    name: "",
    rating: 0,
    content: ""
  });
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 6;

  useEffect(() => {
    loadReviews();
  }, []);

  // Calculate star rating statistics
  const calculateRatingStats = () => {
    if (userReviews.length === 0) return { average: 0, distribution: [0, 0, 0, 0, 0], total: 0 };
    
    const distribution = [0, 0, 0, 0, 0]; // 5, 4, 3, 2, 1 stars
    let totalRating = 0;
    
    userReviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[5 - review.rating]++;
        totalRating += review.rating;
      }
    });
    
    const average = totalRating / userReviews.length;
    
    return {
      average: Math.round(average * 10) / 10,
      distribution,
      total: userReviews.length
    };
  };

  const ratingStats = calculateRatingStats();

  // Pagination logic
  const totalPages = Math.ceil(userReviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const endIndex = startIndex + reviewsPerPage;
  const paginatedReviews = userReviews.slice(startIndex, endIndex);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviews = await reviewsService.getReviews();
      setUserReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setUserReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setNewReview(prev => ({ ...prev, rating }));
    if (formErrors.rating) setFormErrors(prev => ({ ...prev, rating: undefined }));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormErrors({});
    
    const errors: { rating?: string; content?: string } = {};
    if (newReview.rating === 0) {
      errors.rating = "Please select a rating";
    }
    if (!newReview.content.trim()) {
      errors.content = "Please provide your review content";
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setToast({ message: "Please fill in all required fields", type: "warning" });
      return;
    }
    
      try {
        setSubmitting(true);
        
        const reviewData: NewReview = {
          name: newReview.name.trim() || "Anonymous",
          rating: newReview.rating,
          content: newReview.content.trim(),
          avatar: "👤"
        };
        
        const submittedReview = await reviewsService.submitReview(reviewData);
        setUserReviews(prev => [submittedReview, ...prev]);
        
        setNewReview({ name: "", rating: 0, content: "" });
        setShowReviewForm(false);
      setFormErrors({});
      setCurrentPage(1); // Reset to first page to show the new review
        
      setToast({ message: "Thank you for your review! It has been saved permanently.", type: "success" });
      } catch (error) {
        console.error('Error submitting review:', error);
      setToast({ message: "Sorry, there was an error submitting your review. Please try again.", type: "error" });
      } finally {
        setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`${sizeClasses[size]} ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <>
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10001] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-400/50"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        {/* Enhanced Background Elements */}
        {/* Radial Gradient Vignette with Animation */}
        <motion.div 
          className="pointer-events-none absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-radial from-indigo-200/40 via-transparent to-transparent dark:from-indigo-900/40"
            animate={{ 
              opacity: [0.4, 0.5, 0.4]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 8, 
              ease: 'easeInOut' 
            }}
          />
        </motion.div>
        
        {/* SVG Dot Pattern Overlay with Animation */}
        <motion.div 
          className="pointer-events-none absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        >
          <svg width="100%" height="100%" className="w-full h-full">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="2" fill="#6366f1" fillOpacity="0.15" />
              </pattern>
            </defs>
            <motion.rect 
              width="100%" 
              height="100%" 
              fill="url(#dots)"
              animate={{ 
                opacity: [0.2, 0.25, 0.2]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 6, 
                ease: 'easeInOut' 
              }}
            />
          </svg>
        </motion.div>
        
        {/* Animated Background Blobs - Enhanced with Transitions */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <motion.div
            className="w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full blur-3xl opacity-30 absolute -top-32 -left-32"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              x: [0, 30, 0], 
              y: [0, 20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.35, 0.3]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 10, 
              ease: 'easeInOut',
              opacity: { duration: 5 }
            }}
          />
          <motion.div
            className="w-80 h-80 bg-pink-200 dark:bg-pink-900 rounded-full blur-3xl opacity-20 absolute -bottom-24 -right-24"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              x: [0, -30, 0], 
              y: [0, -20, 0],
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.25, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 12, 
              ease: 'easeInOut',
              opacity: { duration: 6 }
            }}
          />
          <motion.div
            className="w-72 h-72 bg-purple-200 dark:bg-purple-900 rounded-full blur-3xl opacity-15 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [1, 1.1, 1], 
              rotate: [0, 15, 0],
              opacity: [0.15, 0.2, 0.15]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 14, 
              ease: 'easeInOut',
              opacity: { duration: 7 }
            }}
          />
          <motion.div
            className="w-60 h-60 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-15 absolute top-10 right-1/3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              y: [0, 30, 0], 
              x: [0, -20, 0],
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.2, 0.15]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 16, 
              ease: 'easeInOut',
              opacity: { duration: 8 }
            }}
          />
          <motion.div
            className="w-64 h-64 bg-cyan-200 dark:bg-cyan-900 rounded-full blur-3xl opacity-10 absolute bottom-20 left-1/4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1], 
              x: [0, 25, 0],
              y: [0, -15, 0],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 18, 
              ease: 'easeInOut',
              opacity: { duration: 9 }
            }}
          />
          {/* Additional floating particles */}
          <motion.div
            className="w-32 h-32 bg-indigo-300/20 dark:bg-indigo-800/20 rounded-full blur-2xl opacity-20 absolute top-1/4 right-1/4"
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360],
              opacity: [0.2, 0.3, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20, 
              ease: 'easeInOut'
            }}
          />
          <motion.div
            className="w-40 h-40 bg-purple-300/15 dark:bg-purple-800/15 rounded-full blur-2xl opacity-15 absolute bottom-1/3 right-1/3"
            animate={{ 
              scale: [1, 1.25, 1],
              rotate: [360, 180, 0],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 22, 
              ease: 'easeInOut'
            }}
          />
        </motion.div>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          ProdActivity
        </div>
              <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg min-h-[44px]"
                  aria-label="Log in to your account"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
                  aria-label="Sign up for a new account"
          >
            Sign Up
          </button>
              </div>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
        <section id="main-content" className="pt-48 pb-32 px-4 sm:px-6 lg:px-8 min-h-[85vh] flex items-center" aria-labelledby="hero-heading" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
              {/* Left Side - Text Content */}
              <div className="text-left">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                    <div className="block">Boost Your</div>
                    <div className="block whitespace-nowrap">
                      <span>PROD</span>
                      <AnimatedLetter />
                      <span className="ml-1">CTIVITY</span>
        </div>
          </h1>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                >
                  <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl leading-relaxed">
                Where your activity meets productiveness.
          </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                  className="flex flex-col sm:flex-row gap-4 items-start"
                >
                  <motion.button
            onClick={() => navigate('/register')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 min-h-[48px]"
                    aria-label="Get started with ProdActivity for free"
                  >
                    Get Started Free
                  </motion.button>
                  <motion.button
                    onClick={() => navigate('/login')}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700 rounded-lg font-semibold text-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 min-h-[48px]"
                    aria-label="Log in to your existing account"
                  >
                    Sign In
                  </motion.button>
                </motion.div>
              </div>
              
              {/* Right Side - P Icon/Logo */}
              <motion.div
                className="flex justify-center lg:justify-end"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              >
                <motion.div
                  className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  animate={{ 
                    y: [0, -20, 0],
                    boxShadow: [
                      '0 25px 50px -12px rgba(79, 70, 229, 0.3)',
                      '0 25px 50px -12px rgba(79, 70, 229, 0.4)',
                      '0 25px 50px -12px rgba(79, 70, 229, 0.3)'
                    ]
                  }}
                  transition={{ 
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    },
                    boxShadow: {
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }
                  }}
                >
                  <span className="text-white font-bold text-8xl sm:text-9xl lg:text-[12rem] select-none">P</span>
                </motion.div>
              </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm" aria-labelledby="stats-heading" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-6xl mx-auto">
            <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
                <motion.div 
              key={idx}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                >
                  <motion.div 
                    className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                {stat.number}
                  </motion.div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium">
                {stat.label}
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8" aria-labelledby="features-heading" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
          </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Powerful tools designed to enhance your productivity and learning
          </p>
        </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <motion.div
              key={idx}
                  className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                  {feature.icon}
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
                    </div>
        </div>
      </section>

      {/* Testimonials Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm" aria-labelledby="testimonials-heading" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                What Users Say
            </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
              Join users who have transformed their productivity
            </p>
          </div>
          
            {/* Add Review Button */}
          <div className="text-center mb-12">
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 min-h-[44px]"
                aria-expanded={showReviewForm}
                aria-controls="review-form"
            >
                {showReviewForm ? 'Cancel' : 'Share Your Experience'}
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
              <div id="review-form" className="max-w-2xl mx-auto mb-12" role="dialog" aria-labelledby="review-form-title" aria-modal="true">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                  <h3 id="review-form-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Share Your Experience
                  </h3>
                  
                  <form onSubmit={handleSubmitReview} className="space-y-6" noValidate>
                    <div>
                      <label htmlFor="review-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Name (Optional)
                      </label>
                      <input
                        id="review-name"
                        type="text"
                        value={newReview.name}
                        onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter your name"
                        aria-describedby="review-name-description"
                      />
                      <p id="review-name-description" className="sr-only">Optional field for your name</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Rating <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <div className="flex space-x-1" role="radiogroup" aria-label="Rating" aria-required="true">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleStarClick(i + 1)}
                            className="transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label={`Rate ${i + 1} out of 5 stars`}
                            aria-pressed={i < newReview.rating}
                          >
                            <svg
                              className={`w-6 h-6 ${
                                i < newReview.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                        </div>
                      {formErrors.rating && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                          {formErrors.rating}
                        </p>
                      )}
                      </div>

                    <div>
                      <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Review <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <textarea
                        id="review-content"
                        value={newReview.content}
                        onChange={(e) => {
                          setNewReview(prev => ({ ...prev, content: e.target.value }));
                          if (formErrors.content) setFormErrors(prev => ({ ...prev, content: undefined }));
                        }}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none dark:bg-gray-700 dark:text-white"
                        placeholder="Tell us about your experience..."
                        required
                        aria-required="true"
                        aria-describedby={formErrors.content ? "review-content-error" : "review-content-description"}
                      />
                      {formErrors.content ? (
                        <p id="review-content-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                          {formErrors.content}
                        </p>
                      ) : (
                        <p id="review-content-description" className="sr-only">Required field for your review</p>
                      )}
                    </div>

                      <div className="text-center">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        aria-busy={submitting}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" aria-hidden="true"></span>
                            Submitting...
                          </span>
                        ) : (
                          'Submit Review'
                        )}
                      </button>
                        </div>
                  </form>
                      </div>
                    </div>
          )}

            {/* Rating Statistics Bar */}
            {!loading && userReviews.length > 0 && (
              <div className="mb-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Average Rating */}
                  <div className="text-center md:text-left">
                    <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                      {ratingStats.average.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center md:justify-start mb-2">
                      {renderStars(Math.round(ratingStats.average), 'lg')}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Based on {ratingStats.total} {ratingStats.total === 1 ? 'review' : 'reviews'}
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratingStats.distribution[5 - star];
                      const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                      
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 w-16">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-4">{star}</span>
                            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Display */}
            <div>
            {loading ? (
                <div className="text-center py-12" role="status" aria-live="polite">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" aria-hidden="true"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
              </div>
            ) : userReviews.length === 0 ? (
                <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
                <>
                  <div className="space-y-4 mb-8" role="list">
                    {paginatedReviews.map((review, idx) => (
                      <motion.article 
                        key={review.id} 
                        className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 overflow-hidden"
                        role="listitem"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        {/* Gradient Background Accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="flex items-start gap-6">
                          {/* Avatar with Background */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center text-3xl shadow-md group-hover:shadow-lg transition-shadow duration-300">
                              {review.avatar}
                  </div>
              </div>

                          {/* Content Section */}
                          <div className="flex-1 min-w-0">
                            {/* Header with Name, Date, and Rating */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {review.name}
                                </div>
                                <time className="text-sm text-gray-500 dark:text-gray-400 font-medium" dateTime={review.created_at}>
                                  {new Date(review.created_at).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </time>
            </div>
            
                              {/* Rating */}
                              <div className="flex items-center gap-2" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                                <div className="flex items-center gap-1">
                                  {renderStars(review.rating, 'md')}
                                </div>
                                <span className="text-base font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                                  {review.rating}.0
                                </span>
                              </div>
                      </div>
                      
                            {/* Review Content */}
                            <div className="relative">
                              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-3 group-hover:pl-4 transition-all duration-300">
                        {review.content}
                      </p>
                    </div>
                  </div>

                          {/* Decorative Quote Icon */}
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <svg className="w-10 h-10 text-indigo-200 dark:text-indigo-900/50" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-3.313.705-5.699 2.481-5.699 6.849v7.391h-4.28zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-3.313.705-5.699 2.481-5.699 6.849v7.391h-4.28z"/>
                            </svg>
            </div>
          </div>
                      </motion.article>
                    ))}
        </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => {
                          const page = i + 1;
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] min-w-[44px] ${
                                  currentPage === page
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                                aria-label={`Go to page ${page}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-500 dark:text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                        aria-label="Next page"
                      >
                        Next
                      </button>
                </div>
                  )}
                </>
              )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8" aria-labelledby="cta-heading" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Transform Your Productivity?
          </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of users who have improved their learning and productivity
          </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 min-h-[48px]"
                aria-label="Start using ProdActivity now"
              >
                Start Now
            </button>
            <button
              onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-700 rounded-lg font-semibold text-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-400/50 min-h-[48px]"
                aria-label="Sign in to your account"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" role="contentinfo" style={{ position: 'relative', zIndex: 1 }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
                <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  ProdActivity
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                  Empowering students, professionals, and learners worldwide with intelligent productivity tools.
                </p>
                <div className="flex space-x-4" role="list" aria-label="Social media links">
                  <a href="#" className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Follow us on Twitter" target="_blank" rel="noopener noreferrer">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Follow us on LinkedIn" target="_blank" rel="noopener noreferrer">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

              <nav aria-label="Footer navigation">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">About</a></li>
                  <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">Features</a></li>
                  <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">Contact</a></li>
              </ul>
              </nav>

              <nav aria-label="Legal links">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">Privacy</a></li>
                  <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded">Terms</a></li>
                </ul>
              </nav>
          </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} ProdActivity. All rights reserved.
          </div>
        </div>
      </footer>
    </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
    </>
  );
};

export default LandingPage; 
