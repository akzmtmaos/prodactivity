import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsService, Review, NewReview } from "../lib/reviewsService";
import Toast from "../components/common/Toast";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowRight,
  CheckSquare,
  ChevronDown,
  Layers,
  Moon,
  NotebookPen,
  Sparkles,
  Star,
  Sun,
  Timer,
  TrendingUp,
} from "lucide-react";
// @ts-ignore
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const features = [
  {
    icon: NotebookPen,
    title: "Smart notes",
    description: "A quiet rich-text editor with tables, code blocks, highlights and heading tags that keep long notes readable.",
  },
  {
    icon: Sparkles,
    title: "Notebook insights",
    description: "Summarize a whole notebook from its own notes, then turn the parts worth keeping into a reviewer or a deck.",
  },
  {
    icon: Layers,
    title: "Flashcards and quizzes",
    description: "Build decks by hand or generate them from notes, then drill them in study, quiz or interactive modes.",
  },
  {
    icon: CheckSquare,
    title: "Tasks and subtasks",
    description: "Priorities, due dates and subtasks that feed straight into the charts on your progress page.",
  },
  {
    icon: Timer,
    title: "Focus timer",
    description: "Pomodoro sessions with a floating timer that keeps running while you move around the app.",
  },
  {
    icon: TrendingUp,
    title: "Progress and streaks",
    description: "Daily, weekly and monthly breakdowns of what you actually finished, plus streaks and leagues.",
  },
];

/** Short capability list for the hero - what the workspace actually contains. */
const capabilities = [
  "Notes and notebooks",
  "Tasks and subtasks",
  "Flashcards and quizzes",
  "Focus timer",
  "Schedule",
  "AI insights",
  "Chat and group study",
];

const faqs = [
  {
    question: "Where do the AI features run?",
    answer:
      "They go through Ollama on your machine, so you pick the model - local or cloud - instead of being tied to one provider. If it is not running, the rest of the app keeps working and the AI panels tell you so.",
  },
  {
    question: "Do I need an account to try it?",
    answer:
      "Yes. Create one with your email and you land in your workspace, where notes, tasks, decks and your timer all start empty and ready.",
  },
  {
    question: "Can I study with other people?",
    answer:
      "Yes. Notebooks and decks can be shared, groups can run quizzes together, and there is a chat sidebar for study rooms.",
  },
  {
    question: "How is my progress calculated?",
    answer:
      "From the work you actually finish - completed tasks and logged focus sessions - turned into a productivity score, streaks and daily, weekly and monthly breakdowns.",
  },
];

const AnimatedLetter = () => {
  const [currentLetter, setCurrentLetter] = useState<'A' | 'U'>('A');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setCurrentLetter(prev => prev === 'A' ? 'U' : 'A');
    }, 3000);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <span
      className="relative inline-block overflow-hidden align-baseline"
      style={{ width: '1ch', height: '1em', lineHeight: '1em' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`letter-${currentLetter}`}
          initial={{ y: reduceMotion ? 0 : 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduceMotion ? 0 : -28, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 inline-block text-indigo-600 dark:text-indigo-400"
          style={{ width: '1ch', height: '1em', lineHeight: '1em', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
        >
          {currentLetter}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

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

  // Scroll to reviews section when page changes
  useEffect(() => {
    if (currentPage > 1) {
      const reviewsSection = document.getElementById('reviews-section');
      if (reviewsSection) {
        reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentPage]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

      // Filter out suspicious reviews and sanitize content
      const safeReviews = reviews
        .filter(review => !isSuspiciousReview(review))
        .map(review => ({
          ...review,
          content: sanitizeReviewContent(review.content)
        }))
        .filter(review => review.content.length > 0); // Remove empty reviews after sanitization

      setUserReviews(safeReviews);
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

  // Sanitize and filter reviews - remove HTML/JS code and suspicious content
  const sanitizeReviewContent = (content: string): string => {
    if (!content) return '';

    // Remove script tags and all HTML tags
    let cleaned = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, ''); // Remove all HTML tags

    // Remove suspicious patterns
    cleaned = cleaned
      .replace(/security-test-btn/gi, '')
      .replace(/SECURITY_TEST/gi, '')
      .replace(/onclick\s*=/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/document\./gi, '')
      .replace(/window\./gi, '');

    // Decode HTML entities
    const temp = document.createElement('div');
    temp.innerHTML = cleaned;
    cleaned = temp.textContent || temp.innerText || cleaned;

    return cleaned.trim();
  };

  // Filter out reviews with suspicious content
  const isSuspiciousReview = (review: Review): boolean => {
    const content = review.content.toLowerCase();

    // Patterns that indicate malicious or test code
    const suspiciousPatterns = [
      'security-test-btn',
      'security_test',
      'run security detection test',
      '<script',
      'javascript:',
      'onclick=',
      'test button',
      '<!doctype html>',
      'document.',
      'window.',
      'fetch("/api/',
      'alert(',
      'siem/logs'
    ];

    return suspiciousPatterns.some(pattern => content.includes(pattern));
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const iconSize = { sm: 12, md: 14, lg: 18 }[size];

    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={iconSize}
        className={i < rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}
        fill={i < rating ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    ));
  };

  // Toggle theme handler - cycles through light, dark, and system
  const toggleTheme = () => {
    const currentTheme = theme || 'system';
    let newTheme: 'light' | 'dark' | 'system';

    if (currentTheme === 'light') {
      newTheme = 'dark';
    } else if (currentTheme === 'dark') {
      newTheme = 'light';
    } else {
      // If system, default to light
      newTheme = 'light';
    }

    setTheme(newTheme);
  };

  // Get effective theme for display (convert system to light/dark)
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (theme as 'light' | 'dark')
  );

  // Update effective theme when theme or system preference changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      };

      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setEffectiveTheme(theme as 'light' | 'dark');
    }
  }, [theme]);

  const ghostButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#2f2f2f] dark:text-gray-300 dark:hover:bg-[#252525]";
  const solidButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-gray-900 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[10001] focus:rounded-md focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-[#191919] dark:text-gray-100">

        {/* Navigation */}
        <nav
          className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-[#2f2f2f] dark:bg-[#191919]/85"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="ProdActivity home"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-[12px] font-bold text-white dark:bg-white dark:text-gray-900">
                P
              </span>
              <span className="text-[14px] font-semibold">ProdActivity</span>
            </button>

            <div className="hidden items-center gap-0.5 md:flex">
              {[
                { label: 'Features', id: 'features-section' },
                { label: 'Reviews', id: 'reviews-section' },
                { label: 'FAQ', id: 'faq-section' },
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="rounded-md px-2.5 py-1.5 text-[13px] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
                title={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                aria-label="Log in to your account"
              >
                Log in
              </button>
              <button onClick={() => navigate('/register')} className={solidButton} aria-label="Sign up for a new account">
                Sign up
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section id="main-content" className="relative overflow-hidden border-b border-gray-200 dark:border-[#2f2f2f]" aria-labelledby="hero-heading">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.28) 1px, transparent 0)',
              backgroundSize: '24px 24px',
              maskImage: 'linear-gradient(to bottom, black, transparent 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 75%)',
            }}
          />

          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-24">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-[12px] font-medium text-gray-600 dark:border-[#2f2f2f] dark:text-gray-400">
                  <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400" />
                  Your study workspace, minus the tab soup
                </span>

                <h1
                  id="hero-heading"
                  className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl"
                >
                  Boost your{' '}
                  <span className="whitespace-nowrap">
                    PROD<AnimatedLetter />CTIVITY
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Notes, tasks, flashcards and a focus timer in one place - with AI that reads your own
                  notebook and tells you what to do next.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
                className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center"
              >
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gray-900 px-5 text-[13.5px] font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  aria-label="Get started with ProdActivity for free"
                >
                  Get started free
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className={`${ghostButton} h-10 px-5 text-[13.5px]`}
                  aria-label="Log in to your existing account"
                >
                  Sign in
                </button>
              </motion.div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-[12.5px] text-gray-500 dark:text-gray-400">
                {capabilities.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600" />
                    {item}
                  </li>
                ))}
              </ul>

              {ratingStats.total > 0 && (
                <p className="mt-6 flex items-center gap-2 text-[12.5px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-0.5">{renderStars(Math.round(ratingStats.average), 'sm')}</span>
                  {ratingStats.average.toFixed(1)} average from {ratingStats.total}{' '}
                  {ratingStats.total === 1 ? 'review' : 'reviews'}
                </p>
              )}
            </div>

            {/* Product preview - decorative mock, not a live view */}
            <div
              aria-hidden="true"
              className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-[#2f2f2f] dark:bg-[#202020]"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-3.5 py-2.5 dark:border-[#2f2f2f]">
                <span className="text-[12.5px] font-semibold">Today</span>
                <span className="text-[11.5px] text-gray-400 dark:text-gray-500">3 things left</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-[#2f2f2f] dark:text-gray-400">
                    <NotebookPen size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-gray-800 dark:text-gray-200">Korean basics</span>
                  <span className="text-[11.5px] text-gray-400 dark:text-gray-500">12 notes</span>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-[#2f2f2f] dark:text-gray-400">
                    <CheckSquare size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-gray-800 dark:text-gray-200">Finish chapter 4 review</span>
                  <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
                    High
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-[#2f2f2f] dark:text-gray-400">
                    <Layers size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-gray-800 dark:text-gray-200">Hangul deck</span>
                  <span className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2f2f2f]">
                    <span className="block h-full w-3/5 rounded-full bg-gray-900 dark:bg-white" />
                  </span>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 dark:border-[#2f2f2f] dark:text-gray-400">
                    <Timer size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-gray-800 dark:text-gray-200">Focus session</span>
                  <span className="text-[11.5px] tabular-nums text-gray-400 dark:text-gray-500">24:18 left</span>
                </div>

                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-indigo-600 dark:border-[#2f2f2f] dark:text-indigo-400">
                    <Sparkles size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-gray-800 dark:text-gray-200">Notebook summary ready</span>
                  <span className="text-[11.5px] text-gray-400 dark:text-gray-500">Open</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features-section" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="features-heading">
          <div className="max-w-2xl">
            <h2 id="features-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything you need, in one workspace
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
              Six tools that already know about each other - your notes feed your decks, your tasks feed your
              progress, and your timer feeds both.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: 'easeOut' }}
                className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-[#2f2f2f] dark:hover:bg-[#202020]"
              >
                <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-700 dark:border-[#2f2f2f] dark:text-gray-200">
                  <feature.icon size={16} />
                </span>
                <h3 className="text-[13.5px] font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section
          id="reviews-section"
          className="border-y border-gray-200 bg-gray-50/60 dark:border-[#2f2f2f] dark:bg-[#1c1c1c]"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 id="testimonials-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  What users say
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Reviews are public and stored as written - no moderation queue, no editing.
                </p>
              </div>

              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className={solidButton}
                aria-expanded={showReviewForm}
                aria-controls="review-form"
              >
                {showReviewForm ? 'Cancel' : 'Share your experience'}
              </button>
            </div>

            {/* Review form */}
            {showReviewForm && (
              <div id="review-form" className="mt-8 max-w-2xl" role="dialog" aria-labelledby="review-form-title" aria-modal="true">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-[#2f2f2f] dark:bg-[#202020]">
                  <h3 id="review-form-title" className="text-[15px] font-semibold">
                    Share your experience
                  </h3>

                  <form onSubmit={handleSubmitReview} className="mt-5 space-y-5" noValidate>
                    <div>
                      <label htmlFor="review-name" className="mb-1.5 block text-[12.5px] font-medium text-gray-700 dark:text-gray-300">
                        Your name (optional)
                      </label>
                      <input
                        id="review-name"
                        type="text"
                        value={newReview.name}
                        onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-[#2f2f2f] dark:bg-[#252525] dark:text-white"
                        placeholder="Enter your name"
                        aria-describedby="review-name-description"
                      />
                      <p id="review-name-description" className="sr-only">Optional field for your name</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[12.5px] font-medium text-gray-700 dark:text-gray-300">
                        Your rating <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <div className="flex gap-1" role="radiogroup" aria-label="Rating" aria-required="true">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleStarClick(i + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-[#252525]"
                            aria-label={`Rate ${i + 1} out of 5 stars`}
                            aria-pressed={i < newReview.rating}
                          >
                            <Star
                              size={18}
                              className={i < newReview.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}
                              fill={i < newReview.rating ? 'currentColor' : 'none'}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                      {formErrors.rating && (
                        <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                          {formErrors.rating}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="review-content" className="mb-1.5 block text-[12.5px] font-medium text-gray-700 dark:text-gray-300">
                        Your review <span className="text-red-500" aria-label="required">*</span>
                      </label>
                      <textarea
                        id="review-content"
                        value={newReview.content}
                        onChange={(e) => {
                          setNewReview(prev => ({ ...prev, content: e.target.value }));
                          if (formErrors.content) setFormErrors(prev => ({ ...prev, content: undefined }));
                        }}
                        rows={4}
                        className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-[#2f2f2f] dark:bg-[#252525] dark:text-white"
                        placeholder="Tell us about your experience..."
                        required
                        aria-required="true"
                        aria-describedby={formErrors.content ? "review-content-error" : "review-content-description"}
                      />
                      {formErrors.content ? (
                        <p id="review-content-error" className="mt-1.5 text-[12px] text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                          {formErrors.content}
                        </p>
                      ) : (
                        <p id="review-content-description" className="sr-only">Required field for your review</p>
                      )}
                    </div>

                    <button type="submit" disabled={submitting} className={`${solidButton} w-full`} aria-busy={submitting}>
                      {submitting ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                          Submitting...
                        </>
                      ) : (
                        'Submit review'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Rating statistics */}
            {!loading && userReviews.length > 0 && (
              <div className="mt-8 grid grid-cols-1 gap-6 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2 md:items-center dark:border-[#2f2f2f] dark:bg-[#202020]">
                <div className="text-center md:text-left">
                  <div className="text-4xl font-semibold tabular-nums">{ratingStats.average.toFixed(1)}</div>
                  <div className="mt-2 flex items-center justify-center gap-0.5 md:justify-start">
                    {renderStars(Math.round(ratingStats.average), 'lg')}
                  </div>
                  <div className="mt-2 text-[12.5px] text-gray-500 dark:text-gray-400">
                    Based on {ratingStats.total} {ratingStats.total === 1 ? 'review' : 'reviews'}
                  </div>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingStats.distribution[5 - star];
                    const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;

                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="flex w-8 items-center gap-1 text-[12px] text-gray-600 dark:text-gray-400">
                          {star}
                          <Star size={11} className="text-amber-400" fill="currentColor" aria-hidden="true" />
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#2f2f2f]">
                          <span
                            className="block h-full rounded-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </span>
                        <span className="w-8 text-right text-[12px] tabular-nums text-gray-500 dark:text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-10">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-[#3f3f3f] dark:border-t-gray-300" aria-hidden="true" />
                  Loading reviews...
                </div>
              ) : userReviews.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center dark:border-[#2f2f2f]">
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">
                    No reviews yet. Be the first to share your experience.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="list">
                    {paginatedReviews.map((review, idx) => (
                      <motion.article
                        key={review.id}
                        role="listitem"
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.35, delay: idx * 0.04, ease: 'easeOut' }}
                        className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-[#2f2f2f] dark:bg-[#202020]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 text-[12px] font-semibold text-gray-700 dark:border-[#2f2f2f] dark:text-gray-200">
                              {(review.name || 'A').trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-medium">{review.name}</div>
                              <time className="text-[11.5px] text-gray-400 dark:text-gray-500" dateTime={review.created_at}>
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </time>
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-1.5" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                            <span className="flex items-center gap-0.5">{renderStars(review.rating, 'sm')}</span>
                            <span className="text-[11.5px] tabular-nums text-gray-500 dark:text-gray-400">{review.rating}.0</span>
                          </div>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
                          {review.content}
                        </p>
                      </motion.article>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 rounded-md border border-gray-200 px-2.5 text-[12.5px] text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2f2f2f] dark:text-gray-300 dark:hover:bg-[#252525]"
                        aria-label="Previous page"
                      >
                        Previous
                      </button>

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
                              className={`h-8 min-w-8 rounded-md px-2 text-[12.5px] tabular-nums transition-colors ${
                                currentPage === page
                                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                                  : 'border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-[#2f2f2f] dark:text-gray-300 dark:hover:bg-[#252525]'
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
                            <span key={page} className="px-1 text-[12.5px] text-gray-400 dark:text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 rounded-md border border-gray-200 px-2.5 text-[12.5px] text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2f2f2f] dark:text-gray-300 dark:hover:bg-[#252525]"
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

        {/* FAQ */}
        <section id="faq-section" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Questions
          </h2>

          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200 dark:divide-[#2f2f2f] dark:border-[#2f2f2f]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-[13.5px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown
                    size={15}
                    className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-2 pr-6 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20" aria-labelledby="cta-heading">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center sm:px-10 dark:border-[#2f2f2f] dark:bg-[#202020]">
            <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to start?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
              Create an account and your first notebook, task and deck are a couple of clicks away.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gray-900 px-5 text-[13.5px] font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                aria-label="Start using ProdActivity now"
              >
                Get started free
                <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`${ghostButton} h-10 px-5 text-[13.5px]`}
                aria-label="Sign in to your account"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-200 bg-gray-50/60 dark:border-[#2f2f2f] dark:bg-[#1c1c1c]" role="contentinfo">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-[12px] font-bold text-white dark:bg-white dark:text-gray-900">
                    P
                  </span>
                  <span className="text-[14px] font-semibold">ProdActivity</span>
                </div>
                <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                  A study and productivity workspace for students and anyone who wants their notes, tasks and
                  revision in one place.
                </p>
              </div>

              <nav aria-label="Footer navigation">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Explore
                </h3>
                <ul className="mt-3 space-y-2" role="list">
                  {[
                    { label: 'Top', action: scrollToTop },
                    { label: 'Features', action: () => scrollToSection('features-section') },
                    { label: 'Reviews', action: () => scrollToSection('reviews-section') },
                    { label: 'FAQ', action: () => scrollToSection('faq-section') },
                  ].map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={link.action}
                        className="rounded text-left text-[12.5px] text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:text-white"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav aria-label="Contact and social media">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Contact
                </h3>
                <div className="mt-3 flex gap-2" role="list" aria-label="Social media links">
                  <a
                    href="https://www.facebook.com/akzmtmaos"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#2f2f2f] dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                    aria-label="Follow on Facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/akzmtmaos"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#2f2f2f] dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                    aria-label="Follow on Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                    </svg>
                  </a>
                  <a
                    href="https://x.com/akzmtmaos"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#2f2f2f] dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                    aria-label="Follow on Twitter/X"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a
                    href="https://discord.gg/m6PBSE6"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#2f2f2f] dark:text-gray-400 dark:hover:bg-[#252525] dark:hover:text-white"
                    aria-label="Join Discord server"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928-1.793 6.4-3.498 8.148-5.137a.076.076 0 0 1 .077-.01c1.195.63 2.41 1.224 3.605 1.686a.076.076 0 0 1-.041.106c-.36.698-.772 1.362-1.225 1.993a.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </a>
                </div>
              </nav>
            </div>

            <div className="mt-10 border-t border-gray-200 pt-6 text-center text-[12px] text-gray-500 dark:border-[#2f2f2f] dark:text-gray-400">
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
