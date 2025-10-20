import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsService, Review, NewReview } from "../lib/reviewsService";

// Custom animations for 3D neumorphism effects
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
  
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-3deg); }
  }
  
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(2deg); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0px); }
  }
  
  @keyframes fade-in-delay {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0px); }
  }
  
  @keyframes bounce-in {
    0% { opacity: 0; transform: scale(0.3) translateY(-50px); }
    50% { opacity: 1; transform: scale(1.05) translateY(-10px); }
    70% { transform: scale(0.9) translateY(0px); }
    100% { transform: scale(1) translateY(0px); }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  
  .animate-float-delayed {
    animation: float-delayed 8s ease-in-out infinite;
  }
  
  .animate-float-slow {
    animation: float-slow 10s ease-in-out infinite;
  }
  
  .animate-fade-in {
    animation: fade-in 1s ease-out forwards;
  }
  
  .animate-fade-in-delay {
    animation: fade-in-delay 1s ease-out 0.3s forwards;
    opacity: 0;
  }
  
  .animate-bounce-in {
    animation: bounce-in 1s ease-out forwards;
  }
`;

const features = [
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l4 4" />
      </svg>
    ),
    title: "Smart Notes",
    description: "Rich text notes with AI-powered organization, smart search, hashtag categorization, and intelligent content suggestions. Organize your thoughts with folders, tags, and advanced filtering.",
    details: [
      "AI-powered content organization",
      "Rich text editor with markdown support",
      "Smart hashtag system for easy categorization",
      "Advanced search and filtering",
      "Cloud sync across all devices"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Progress Tracking",
    description: "Visualize your achievements with beautiful charts, track learning streaks, monitor productivity metrics, and celebrate milestones. Get insights into your learning patterns and growth.",
    details: [
      "Interactive progress charts and graphs",
      "Learning streak tracking",
      "Productivity analytics dashboard",
      "Achievement badges and milestones",
      "Performance insights and recommendations"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v.01M12 12v.01" />
      </svg>
    ),
    title: "Flashcard Decks",
    description: "Create, organize, and study flashcards with spaced repetition algorithms. Build custom decks, import existing content, and track your mastery level for optimal learning retention.",
    details: [
      "Spaced repetition learning algorithm",
      "Custom deck creation and organization",
      "Import/export functionality",
      "Progress tracking and mastery levels",
      "Study reminders and scheduling"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Reviewer",
    description: "AI-powered review sessions that adapt to your learning pace. Get personalized study recommendations, intelligent question generation, and detailed explanations to reinforce your knowledge.",
    details: [
      "AI-powered adaptive learning",
      "Personalized study recommendations",
      "Intelligent question generation",
      "Detailed explanations and feedback",
      "Learning path optimization"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Task Management",
    description: "Organize your to-dos with priority levels, deadlines, and progress tracking. Set recurring tasks, create task dependencies, and manage your workflow efficiently with our intuitive interface.",
    details: [
      "Priority-based task organization",
      "Deadline management and reminders",
      "Progress tracking and completion rates",
      "Recurring task automation",
      "Task dependencies and workflows"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Smart Scheduling",
    description: "Plan events, set reminders, and sync with your calendar. Get intelligent scheduling suggestions, conflict detection, and automated time management to optimize your daily routine.",
    details: [
      "Calendar integration and sync",
      "Smart scheduling suggestions",
      "Conflict detection and resolution",
      "Automated reminders and notifications",
      "Time optimization recommendations"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    title: "Focus Timer",
    description: "Boost your productivity with Pomodoro technique, custom study sessions, and focus tracking. Monitor your concentration levels and build sustainable study habits for long-term success.",
    details: [
      "Pomodoro technique implementation",
      "Custom study session timers",
      "Focus level tracking",
      "Break reminders and suggestions",
      "Productivity analytics and insights"
    ]
  },
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: "Interactive Quizzes",
    description: "Test your knowledge with adaptive quizzes, instant feedback, and performance analytics. Create custom quizzes, challenge yourself with different difficulty levels, and track your improvement over time.",
    details: [
      "Adaptive difficulty adjustment",
      "Instant feedback and explanations",
      "Performance analytics and tracking",
      "Custom quiz creation",
      "Progress monitoring and improvement"
    ]
  }
];


const stats = [
  { number: "50K+", label: "Active Users" },
  { number: "2M+", label: "Notes Created" },
  { number: "500K+", label: "Tasks Completed" },
  { number: "98%", label: "Satisfaction Rate" }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  
  // Review state
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [newReview, setNewReview] = useState({
    name: "",
    rating: 0,
    content: ""
  });
  
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviews = await reviewsService.getReviews();
      setUserReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Fallback to empty array if Supabase fails
      setUserReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setNewReview(prev => ({ ...prev, rating }));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newReview.rating > 0 && newReview.content.trim()) {
      try {
        setSubmitting(true);
        
        const reviewData: NewReview = {
          name: newReview.name.trim() || "Anonymous",
          rating: newReview.rating,
          content: newReview.content.trim(),
          avatar: "👤"
        };
        
        const submittedReview = await reviewsService.submitReview(reviewData);
        
        // Add the new review to the beginning of the list
        setUserReviews(prev => [submittedReview, ...prev]);
        
        // Reset form
        setNewReview({ name: "", rating: 0, content: "" });
        setShowReviewForm(false);
        
        alert("Thank you for your review! It has been saved permanently.");
      } catch (error) {
        console.error('Error submitting review:', error);
        alert("Sorry, there was an error submitting your review. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      alert("Please provide both a rating and review content.");
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 overflow-x-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-2xl animate-bounce"></div>
      </div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 z-20 relative">
        <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight select-none drop-shadow-lg">
          ProdActivity
        </div>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 backdrop-blur-sm border border-white/20"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-700 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:bg-white/90 dark:hover:bg-gray-700/80 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 backdrop-blur-sm"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 relative w-full min-h-[80vh]">
        {/* 3D Floating Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Large floating orbs */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-400/30 to-purple-600/30 rounded-full blur-xl animate-float opacity-60"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-pink-400/40 to-indigo-600/40 rounded-full blur-lg animate-float-delayed opacity-70"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-cyan-400/25 to-blue-600/25 rounded-full blur-2xl animate-float-slow opacity-50"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-br from-purple-400/35 to-pink-600/35 rounded-full blur-xl animate-float-delayed opacity-65"></div>
        </div>
        
        <div className={`z-10 w-full flex flex-col items-center justify-center min-h-[60vh] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* 3D Neumorphic Hero Card */}
          <div className="relative mb-8">
            <div className="bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-100/90 dark:from-gray-800/90 dark:via-slate-700/90 dark:to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20 dark:border-gray-700/20 hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl"></div>
              
              <h1 className="relative text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 animate-fade-in">
            Boost Your Productivity
          </h1>
          
              <p className="relative text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto transition-all duration-300 animate-fade-in-delay leading-relaxed">
                Where your activity meets productiveness.
          </p>
              
              {/* 3D Button */}
              <div className="relative">
          <button
            onClick={() => navigate('/register')}
                  className="relative px-12 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:shadow-indigo-500/25 hover:scale-110 transition-all duration-300 mb-4 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 transform hover:-translate-y-1"
                  style={{
                    boxShadow: '0 20px 40px rgba(79, 70, 229, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
          >
                  <span className="relative z-10">Get Started Free</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
          </button>
              </div>
              
              <div className="relative text-gray-500 dark:text-gray-400 text-base mb-4">
                Already have an account? <span className="underline cursor-pointer transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium" onClick={() => navigate('/login')}>Log in</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`text-center transform transition-all duration-700 delay-${idx * 100} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              {/* 3D Neumorphic Stat Card */}
              <div className="relative bg-gradient-to-br from-white/80 via-blue-50/80 to-indigo-100/80 dark:from-gray-800/80 dark:via-slate-700/80 dark:to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-2xl"></div>
                
                <div className="relative">
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>
                  <div className="text-gray-600 dark:text-gray-400 font-medium text-sm md:text-base">
                {stat.label}
                  </div>
                </div>
                
                {/* Floating particles effect */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-indigo-400/60 to-purple-600/60 rounded-full blur-sm animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Introduction Section */}
      <section className="w-full py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Space-themed Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Stars - More scattered */}
          <div className="absolute top-20 left-20 w-1 h-1 bg-white rounded-full animate-pulse opacity-80"></div>
          <div className="absolute top-32 right-32 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-60"></div>
          <div className="absolute top-40 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse opacity-70"></div>
          <div className="absolute top-16 right-20 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-90"></div>
          <div className="absolute top-60 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-50"></div>
          <div className="absolute top-80 right-1/3 w-1 h-1 bg-blue-200 rounded-full animate-pulse opacity-80"></div>
          <div className="absolute bottom-40 left-20 w-1 h-1 bg-white rounded-full animate-pulse opacity-60"></div>
          <div className="absolute bottom-32 right-40 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse opacity-70"></div>
          <div className="absolute bottom-60 left-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-80"></div>
          <div className="absolute top-10 left-1/2 w-1 h-1 bg-yellow-300 rounded-full animate-pulse opacity-75"></div>
          <div className="absolute top-50 right-10 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse opacity-65"></div>
          <div className="absolute bottom-20 right-1/2 w-1 h-1 bg-pink-300 rounded-full animate-pulse opacity-85"></div>
          <div className="absolute top-70 left-10 w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse opacity-55"></div>
          <div className="absolute bottom-10 left-1/4 w-1 h-1 bg-orange-300 rounded-full animate-pulse opacity-70"></div>
          
          {/* Constellation Lines - More patterns */}
          <div className="absolute top-20 left-20 w-12 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent transform rotate-45"></div>
          <div className="absolute top-80 right-32 w-16 h-px bg-gradient-to-r from-transparent via-blue-300/20 to-transparent transform -rotate-30"></div>
          <div className="absolute bottom-40 left-1/4 w-10 h-px bg-gradient-to-r from-transparent via-purple-300/25 to-transparent transform rotate-60"></div>
          <div className="absolute top-50 left-1/2 w-14 h-px bg-gradient-to-r from-transparent via-yellow-300/15 to-transparent transform rotate-12"></div>
          <div className="absolute bottom-70 right-20 w-8 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent transform -rotate-45"></div>
          
          {/* Shooting Stars */}
          <div className="absolute top-1/4 left-0 w-2 h-px bg-gradient-to-r from-white via-blue-300 to-transparent animate-pulse opacity-60"></div>
          <div className="absolute top-3/4 right-0 w-3 h-px bg-gradient-to-l from-purple-300 via-white to-transparent animate-pulse opacity-50"></div>
          <div className="absolute top-1/2 left-1/4 w-2.5 h-px bg-gradient-to-r from-yellow-300 via-transparent to-cyan-300 animate-pulse opacity-40"></div>
          
          {/* Nebula-like Blurs - More variety */}
          <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-2xl animate-float-delayed"></div>
          <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-xl animate-float-slow"></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-r from-pink-500/5 to-purple-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-gradient-to-r from-cyan-500/8 to-blue-500/8 rounded-full blur-2xl animate-float-delayed"></div>
          <div className="absolute top-1/4 left-1/6 w-20 h-20 bg-gradient-to-r from-green-500/6 to-emerald-500/6 rounded-full blur-xl animate-float-slow"></div>
          
          {/* Planet-like Orbs */}
          <div className="absolute top-1/6 right-1/6 w-6 h-6 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-sm animate-float"></div>
          <div className="absolute bottom-1/6 left-1/6 w-4 h-4 bg-gradient-to-br from-blue-400/25 to-indigo-500/25 rounded-full blur-sm animate-float-delayed"></div>
          <div className="absolute top-2/3 right-1/12 w-5 h-5 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-sm animate-float-slow"></div>
          
          {/* Cosmic Dust Particles */}
          <div className="absolute top-1/5 left-3/4 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse opacity-30"></div>
          <div className="absolute top-3/5 left-1/5 w-0.5 h-0.5 bg-blue-300/30 rounded-full animate-pulse opacity-25"></div>
          <div className="absolute bottom-1/5 right-3/4 w-0.5 h-0.5 bg-purple-300/35 rounded-full animate-pulse opacity-20"></div>
          <div className="absolute top-4/5 right-1/5 w-0.5 h-0.5 bg-cyan-300/25 rounded-full animate-pulse opacity-30"></div>
          <div className="absolute top-1/8 left-4/5 w-0.5 h-0.5 bg-yellow-300/20 rounded-full animate-pulse opacity-25"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  ProdActivity
                </h2>
                <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-4">
                  ProdActivity is a comprehensive productivity ecosystem designed for students, professionals, and lifelong learners. 
                  Our intelligent platform combines cutting-edge AI technology with intuitive design to transform how you organize, 
                  learn, and achieve your goals.
                </p>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  From smart note-taking and AI-powered study assistance to advanced task management and progress tracking, 
                  we provide all the tools you need to stay organized, motivated, and ahead of your schedule. Whether you're 
                  managing complex projects, preparing for exams, or building new skills, ProdActivity adapts to your workflow 
                  and helps you work smarter, not harder.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="w-40 h-40 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl animate-float">
                  <span className="text-white font-bold text-8xl">P</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full relative">
        {/* Section Header */}
        <div className="w-full py-16 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900">
          <div className="text-center px-4">
            <div className="relative inline-block">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            Everything You Need to Succeed
          </h2>
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mt-3 leading-relaxed">
            Discover powerful tools designed to enhance your productivity, learning, and organization
          </p>
        </div>
        </div>
        
        {/* Full-width Feature Layout with Alternating Backgrounds */}
        <div className="w-full">
          {features.map((feature, idx) => {
            const isEven = idx % 2 === 0;
            const bgColor = isEven 
              ? 'bg-gradient-to-r from-white via-gray-50/80 to-white dark:from-gray-900 dark:via-gray-800/80 dark:to-gray-900' 
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900';
            
            return (
            <div
              key={idx}
                className={`w-full py-16 md:py-20 ${bgColor} transition-all duration-500 relative overflow-hidden ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Enhanced Design Elements for Color 1 */}
                {isEven && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Floating Geometric Shapes */}
                    <div className="absolute top-20 left-20 w-6 h-6 bg-gradient-to-br from-indigo-300/40 to-purple-400/40 rounded-lg rotate-45 animate-float opacity-70"></div>
                    <div className="absolute top-32 right-32 w-4 h-8 bg-gradient-to-br from-blue-300/35 to-cyan-400/35 rounded-full animate-float-delayed opacity-60"></div>
                    <div className="absolute top-40 left-1/3 w-5 h-5 bg-gradient-to-br from-purple-300/45 to-pink-400/45 rounded-full animate-float-slow opacity-50"></div>
                    <div className="absolute top-16 right-20 w-3 h-3 bg-gradient-to-br from-indigo-300/50 to-blue-400/50 transform rotate-12 animate-float opacity-65"></div>
                    <div className="absolute top-60 left-1/4 w-7 h-7 bg-gradient-to-br from-pink-300/40 to-purple-400/40 rounded-lg rotate-45 animate-float-delayed opacity-55"></div>
                    <div className="absolute bottom-40 left-20 w-5 h-5 bg-gradient-to-br from-blue-300/45 to-indigo-400/45 rounded-full animate-float-slow opacity-70"></div>
                    <div className="absolute bottom-32 right-40 w-4 h-4 bg-gradient-to-br from-purple-300/40 to-pink-400/40 rounded-lg rotate-45 animate-float opacity-60"></div>
                    <div className="absolute bottom-60 left-1/3 w-6 h-6 bg-gradient-to-br from-cyan-300/40 to-blue-400/40 rounded-full animate-float-delayed opacity-65"></div>
                    
                    {/* Dynamic Wave Patterns */}
                    <div className="absolute top-1/4 left-1/4 w-20 h-px bg-gradient-to-r from-transparent via-indigo-300/25 to-transparent transform rotate-45 animate-float"></div>
                    <div className="absolute top-3/4 right-1/4 w-16 h-px bg-gradient-to-r from-transparent via-purple-300/20 to-transparent transform -rotate-30 animate-float-delayed"></div>
                    <div className="absolute bottom-1/4 left-1/3 w-18 h-px bg-gradient-to-r from-transparent via-blue-300/15 to-transparent transform rotate-60 animate-float-slow"></div>
                    <div className="absolute top-1/2 left-1/6 w-14 h-px bg-gradient-to-r from-transparent via-pink-300/18 to-transparent transform rotate-12 animate-float"></div>
                    <div className="absolute bottom-1/3 right-1/6 w-12 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent transform -rotate-45 animate-float-delayed"></div>
                    
                    {/* Flowing Energy Lines */}
                    <div className="absolute top-1/3 right-1/6 w-24 h-px bg-gradient-to-r from-indigo-300/18 via-transparent to-purple-300/18 transform rotate-25 animate-float-slow"></div>
                    <div className="absolute bottom-1/3 left-1/6 w-22 h-px bg-gradient-to-r from-blue-300/15 via-transparent to-cyan-300/15 transform -rotate-20 animate-float"></div>
                    <div className="absolute top-2/3 left-1/2 w-20 h-px bg-gradient-to-r from-purple-300/16 via-transparent to-pink-300/16 transform rotate-35 animate-float-delayed"></div>
                    <div className="absolute top-1/6 right-1/3 w-16 h-px bg-gradient-to-r from-cyan-300/12 via-transparent to-blue-300/12 transform rotate-55 animate-float"></div>
                    <div className="absolute bottom-1/6 left-2/3 w-18 h-px bg-gradient-to-r from-pink-300/14 via-transparent to-purple-300/14 transform -rotate-35 animate-float-delayed"></div>
                    
                    {/* Vibrant Light Blooms */}
                    <div className="absolute top-1/5 right-1/5 w-40 h-40 bg-gradient-to-r from-indigo-200/12 to-purple-200/12 rounded-full blur-2xl animate-float"></div>
                    <div className="absolute bottom-1/5 left-1/5 w-36 h-36 bg-gradient-to-r from-blue-200/10 to-cyan-200/10 rounded-full blur-xl animate-float-delayed"></div>
                    <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-purple-200/8 to-pink-200/8 rounded-full blur-3xl animate-float-slow"></div>
                    <div className="absolute bottom-1/4 right-1/3 w-32 h-32 bg-gradient-to-r from-cyan-200/10 to-blue-200/10 rounded-full blur-2xl animate-float"></div>
                    <div className="absolute top-1/4 left-1/6 w-28 h-28 bg-gradient-to-r from-pink-200/9 to-purple-200/9 rounded-full blur-xl animate-float-delayed"></div>
                    
                    {/* Bright Sparkling Elements */}
                    <div className="absolute top-1/6 right-1/6 w-3 h-3 bg-gradient-to-br from-indigo-400/50 to-purple-500/50 rounded-full blur-xs animate-pulse opacity-60"></div>
                    <div className="absolute bottom-1/6 left-1/6 w-2 h-2 bg-gradient-to-br from-blue-400/55 to-cyan-500/55 rounded-full blur-xs animate-pulse opacity-55"></div>
                    <div className="absolute top-2/3 right-1/12 w-3.5 h-3.5 bg-gradient-to-br from-purple-400/45 to-pink-500/45 rounded-full blur-xs animate-pulse opacity-50"></div>
                    <div className="absolute top-1/8 left-4/5 w-2 h-2 bg-gradient-to-br from-cyan-400/50 to-blue-500/50 rounded-full blur-xs animate-pulse opacity-65"></div>
                    <div className="absolute bottom-1/8 right-4/5 w-2.5 h-2.5 bg-gradient-to-br from-pink-400/40 to-purple-500/40 rounded-full blur-xs animate-pulse opacity-45"></div>
                    
                    {/* Flowing Particles */}
                    <div className="absolute top-1/5 left-3/4 w-1.5 h-1.5 bg-indigo-400/35 rounded-full animate-float opacity-40"></div>
                    <div className="absolute top-3/5 left-1/5 w-1 h-1 bg-purple-400/30 rounded-full animate-float-delayed opacity-35"></div>
                    <div className="absolute bottom-1/5 right-3/4 w-1.5 h-1.5 bg-blue-400/35 rounded-full animate-float-slow opacity-30"></div>
                    <div className="absolute top-4/5 right-1/5 w-1 h-1 bg-pink-400/30 rounded-full animate-float opacity-35"></div>
                    <div className="absolute top-1/8 left-4/5 w-1 h-1 bg-cyan-400/25 rounded-full animate-float-delayed opacity-25"></div>
                    <div className="absolute bottom-1/8 right-1/3 w-1.5 h-1.5 bg-indigo-400/30 rounded-full animate-float-slow opacity-30"></div>
                    <div className="absolute top-2/5 left-1/2 w-1 h-1 bg-purple-400/28 rounded-full animate-float opacity-32"></div>
                    <div className="absolute bottom-2/5 right-1/2 w-1 h-1 bg-blue-400/33 rounded-full animate-float-delayed opacity-28"></div>
                    
                    {/* Abstract Geometric Patterns */}
                    <div className="absolute top-1/3 left-1/8 w-8 h-8 border-2 border-indigo-300/20 rounded-lg rotate-45 animate-float opacity-25"></div>
                    <div className="absolute bottom-1/3 right-1/8 w-6 h-6 border-2 border-purple-300/15 rounded-full animate-float-delayed opacity-20"></div>
                    <div className="absolute top-1/8 right-1/4 w-4 h-4 border border-blue-300/25 rounded-lg rotate-12 animate-float-slow opacity-22"></div>
                    <div className="absolute bottom-1/8 left-1/4 w-5 h-5 border-2 border-pink-300/18 rounded-full animate-float opacity-18"></div>
                    
                    {/* Energy Bursts */}
                    <div className="absolute top-1/7 left-2/3 w-12 h-12 border border-cyan-300/15 rounded-full animate-pulse opacity-30"></div>
                    <div className="absolute bottom-1/7 right-2/3 w-10 h-10 border border-indigo-300/18 rounded-full animate-pulse opacity-25"></div>
                    <div className="absolute top-3/7 left-1/7 w-8 h-8 border border-purple-300/12 rounded-full animate-pulse opacity-20"></div>
                  </div>
                )}
                
                {/* Space-themed Background Elements for Color 2 */}
                {!isEven && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Stars - Enhanced variety */}
                    <div className="absolute top-20 left-20 w-1 h-1 bg-white rounded-full animate-pulse opacity-70"></div>
                    <div className="absolute top-32 right-32 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-50"></div>
                    <div className="absolute top-40 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse opacity-60"></div>
                    <div className="absolute top-16 right-20 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-80"></div>
                    <div className="absolute top-60 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse opacity-40"></div>
                    <div className="absolute bottom-40 left-20 w-1 h-1 bg-white rounded-full animate-pulse opacity-50"></div>
                    <div className="absolute bottom-32 right-40 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse opacity-60"></div>
                    <div className="absolute bottom-60 left-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-70"></div>
                    <div className="absolute top-10 left-1/2 w-1 h-1 bg-yellow-300 rounded-full animate-pulse opacity-65"></div>
                    <div className="absolute top-50 right-10 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse opacity-55"></div>
                    <div className="absolute bottom-20 right-1/2 w-1 h-1 bg-pink-300 rounded-full animate-pulse opacity-75"></div>
                    <div className="absolute top-70 left-10 w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse opacity-45"></div>
                    <div className="absolute bottom-10 left-1/4 w-1 h-1 bg-orange-300 rounded-full animate-pulse opacity-60"></div>
                    
                    {/* Constellation Lines - More patterns */}
                    <div className="absolute top-20 left-20 w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transform rotate-45"></div>
                    <div className="absolute bottom-40 left-1/4 w-10 h-px bg-gradient-to-r from-transparent via-purple-300/15 to-transparent transform rotate-60"></div>
                    <div className="absolute top-50 left-1/2 w-14 h-px bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent transform rotate-12"></div>
                    <div className="absolute bottom-70 right-20 w-8 h-px bg-gradient-to-r from-transparent via-cyan-300/15 to-transparent transform -rotate-45"></div>
                    
                    {/* Shooting Stars */}
                    <div className="absolute top-1/4 left-0 w-2 h-px bg-gradient-to-r from-white via-blue-300 to-transparent animate-pulse opacity-50"></div>
                    <div className="absolute top-3/4 right-0 w-3 h-px bg-gradient-to-l from-purple-300 via-white to-transparent animate-pulse opacity-40"></div>
                    
                    {/* Nebula-like Blurs - Enhanced */}
                    <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-2xl animate-float-delayed"></div>
                    <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-full blur-xl animate-float-slow"></div>
                    <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-r from-pink-500/3 to-purple-500/3 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-1/4 right-1/3 w-28 h-28 bg-gradient-to-r from-cyan-500/4 to-blue-500/4 rounded-full blur-2xl animate-float-delayed"></div>
                    <div className="absolute top-1/4 left-1/6 w-20 h-20 bg-gradient-to-r from-green-500/3 to-emerald-500/3 rounded-full blur-xl animate-float-slow"></div>
                    
                    {/* Planet-like Orbs */}
                    <div className="absolute top-1/6 right-1/6 w-6 h-6 bg-gradient-to-br from-orange-400/15 to-red-500/15 rounded-full blur-sm animate-float"></div>
                    <div className="absolute bottom-1/6 left-1/6 w-4 h-4 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-sm animate-float-delayed"></div>
                    <div className="absolute top-2/3 right-1/12 w-5 h-5 bg-gradient-to-br from-purple-400/15 to-pink-500/15 rounded-full blur-sm animate-float-slow"></div>
                    
                    {/* Cosmic Dust Particles */}
                    <div className="absolute top-1/5 left-3/4 w-0.5 h-0.5 bg-white/30 rounded-full animate-pulse opacity-25"></div>
                    <div className="absolute top-3/5 left-1/5 w-0.5 h-0.5 bg-blue-300/25 rounded-full animate-pulse opacity-20"></div>
                    <div className="absolute bottom-1/5 right-3/4 w-0.5 h-0.5 bg-purple-300/30 rounded-full animate-pulse opacity-15"></div>
                    <div className="absolute top-4/5 right-1/5 w-0.5 h-0.5 bg-cyan-300/20 rounded-full animate-pulse opacity-25"></div>
                    <div className="absolute top-1/8 left-4/5 w-0.5 h-0.5 bg-yellow-300/15 rounded-full animate-pulse opacity-20"></div>
                  </div>
                )}
                
                <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 xl:px-32 relative z-10">
                  <div className="flex items-center justify-center gap-8 md:gap-12 lg:gap-16">
                    {/* Icon Section */}
                    <div className="flex-shrink-0">
                      <div className={`p-6 md:p-8 rounded-3xl shadow-xl border transition-all duration-300 hover:scale-105 hover:rotate-3 hover:shadow-2xl ${
                        isEven 
                          ? 'bg-gradient-to-br from-white/90 to-indigo-100/90 dark:from-gray-800/90 dark:to-gray-700/90 border-white/30 dark:border-gray-600/30'
                          : 'bg-gradient-to-br from-white/95 to-blue-100/95 border-white/40'
                      }`}>
                        <div className="transition-transform duration-300">
                  {feature.icon}
                </div>
                      </div>
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1 max-w-2xl">
                      <h3 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-6 transition-all duration-200 ${
                        isEven 
                          ? 'bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent'
                          : 'text-white'
                      }`}>
                    {feature.title}
                  </h3>
                      <p className={`text-lg md:text-xl lg:text-2xl leading-relaxed ${
                        isEven 
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-200'
                      }`}>
                    {feature.description}
                  </p>
                    </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full bg-gradient-to-br from-indigo-50/80 via-blue-50/80 to-purple-50/80 dark:from-gray-800/80 dark:via-slate-800/80 dark:to-gray-900/80 backdrop-blur-sm py-20 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-2xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-pink-400/15 to-indigo-600/15 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <div className="relative inline-block">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 drop-shadow-lg">
                User Testimonials
            </h2>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-3"></div>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mt-3">
              Join users who have transformed their productivity
            </p>
          </div>
          
          {/* Add Your Review Button */}
          <div className="text-center mb-12">
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/50"
            >
              {showReviewForm ? 'Cancel Review' : 'Share Your Experience'}
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-16">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8" style={{ pointerEvents: 'auto' }}>
                  
                  <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Share Your Experience
                  </h3>
                  
                  <form onSubmit={handleSubmitReview} className="space-y-6" style={{ pointerEvents: 'auto', zIndex: 10 }}>
                    {/* Name Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newReview.name}
                        onChange={(e) => {
                          setNewReview(prev => ({ ...prev, name: e.target.value }));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your name or leave blank for anonymous"
                        style={{ 
                          backgroundColor: 'white', 
                          color: 'black',
                          pointerEvents: 'auto',
                          cursor: 'text'
                        }}
                      />
                    </div>

                    {/* Star Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Rating
                      </label>
                      <div className="flex space-x-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleStarClick(i + 1)}
                            className="transition-transform duration-200 hover:scale-110"
                          >
                            <svg
                              className={`w-8 h-8 ${
                                i < newReview.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                        </div>
                      </div>

                    {/* Review Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Review
                      </label>
                      <textarea
                        value={newReview.content}
                        onChange={(e) => {
                          setNewReview(prev => ({ ...prev, content: e.target.value }));
                        }}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Tell us about your experience with ProdActivity..."
                        required
                        style={{ 
                          backgroundColor: 'white', 
                          color: 'black',
                          pointerEvents: 'auto',
                          cursor: 'text'
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                      <div className="text-center">
                      <button
                        type="submit"
                        disabled={newReview.rating === 0 || !newReview.content.trim() || submitting}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {submitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </div>
                        ) : (
                          'Submit Review'
                        )}
                      </button>
                        </div>
                  </form>
                        </div>
                      </div>
                    </div>
          )}


          {/* Dynamic User Reviews */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Recent Reviews
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
              </div>
            ) : userReviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userReviews.map((review) => (
                  <div key={review.id} className="relative bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-100/90 dark:from-gray-800/90 dark:via-slate-700/90 dark:to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/20 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-2xl"></div>
                    
                    <div className="relative">
                      <div className="flex items-center mb-3">
                        <div className="text-2xl mr-3">{review.avatar}</div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{review.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(review.created_at).toLocaleDateString()}
                  </div>
              </div>
            </div>
            
                      <div className="flex mb-3">
                        {renderStars(review.rating)}
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                        {review.content}
                      </p>
                    </div>
                  </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="text-center transform transition-all duration-700 delay-100"
              >
                <div className="text-4xl md:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-20 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 w-48 h-48 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-1/4 w-56 h-56 bg-gradient-to-br from-pink-400/15 to-indigo-600/15 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-4 relative">
          {/* 3D Neumorphic CTA Card */}
          <div className="relative bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-100/90 dark:from-gray-800/90 dark:via-slate-700/90 dark:to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-12 hover:shadow-3xl transition-all duration-500">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-3xl"></div>
            
            {/* Floating accents */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-br from-indigo-400/60 to-purple-600/60 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-gradient-to-br from-pink-400/60 to-indigo-600/60 rounded-full blur-sm animate-pulse delay-1000"></div>
            
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 drop-shadow-lg">
            Ready to Transform Your Productivity?
          </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            Join thousands of users who have already improved their learning and productivity with ProdActivity
          </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
                  className="relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl hover:shadow-indigo-500/25 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 transform hover:-translate-y-1"
                  style={{
                    boxShadow: '0 20px 40px rgba(79, 70, 229, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
            >
                  <span className="relative z-10">Start Now</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
            </button>
            <button
              onClick={() => navigate('/login')}
                  className="px-10 py-5 bg-white/80 dark:bg-gray-800/80 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:bg-white/90 dark:hover:bg-gray-700/80 hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400/50 backdrop-blur-sm transform hover:-translate-y-1"
            >
              Sign In
            </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-pink-500/10 to-indigo-600/10 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6 drop-shadow-lg">ProdActivity</div>
              <p className="text-slate-300 mb-6 max-w-md leading-relaxed">
                Empowering students, professionals, and learners worldwide with intelligent productivity tools and AI-powered learning solutions.
              </p>
              <div className="flex space-x-4">
                {/* Enhanced Social Media Icons with 3D effect */}
                <a href="#" className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 group">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                </a>
                <a href="#" className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 group">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                </a>
                <a href="#" className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 group">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                </a>
                <a href="#" className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white hover:scale-110 hover:rotate-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/25 group">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl"></div>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-all duration-200 hover:translate-x-1 inline-block hover:scale-105">About Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-all duration-200 hover:translate-x-1 inline-block hover:scale-105">Features</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-all duration-200 hover:translate-x-1 inline-block hover:scale-105">Blog</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-all duration-200 hover:translate-x-1 inline-block hover:scale-105">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-slate-400 text-sm mb-4 md:mb-0">
                &copy; {new Date().getFullYear()} ProdActivity. All rights reserved.
              </div>
              <div className="flex space-x-8 text-sm">
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:scale-105">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:scale-105">Terms of Service</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:scale-105">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default LandingPage; 