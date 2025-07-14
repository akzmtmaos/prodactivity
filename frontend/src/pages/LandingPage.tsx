import React from "react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h5l2-2h5a2 2 0 012 2v12a2 2 0 01-2 2z" /></svg>
    ),
    title: "Notes",
    description: "Rich text notes with organization, search, and AI features."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
    ),
    title: "Progress",
    description: "Visualize your achievements, streaks, and learning stats."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3v2a1 1 0 001 1h3v2a1 1 0 001 1h3v2a1 1 0 001 1h3a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" /></svg>
    ),
    title: "Decks",
    description: "Create, organize, and study flashcards for efficient learning."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    ),
    title: "Reviewer",
    description: "AI-powered review sessions to reinforce your knowledge."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 018 0v2m-4-4V7m0 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    ),
    title: "Tasks",
    description: "Manage your to-dos, priorities, and deadlines with ease."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ),
    title: "Schedules",
    description: "Plan events, set reminders, and sync your calendar."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    title: "Study Timer",
    description: "Boost focus with Pomodoro and custom study sessions."
  },
  {
    icon: (
      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 8v8" /></svg>
    ),
    title: "Quiz",
    description: "Test your knowledge with interactive quizzes and instant feedback."
  }
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-100 via-white to-indigo-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 z-20 relative">
        <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 tracking-tight select-none">
          ProdActivity
        </div>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow hover:bg-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-2 bg-white text-indigo-700 border border-indigo-600 rounded-lg font-semibold shadow hover:bg-indigo-50 dark:bg-gray-900 dark:text-indigo-300 dark:border-indigo-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Sign Up
          </button>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 relative w-full min-h-[80vh]">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full blur-3xl opacity-30 absolute -top-32 -left-32 animate-pulse" />
          <div className="w-80 h-80 bg-pink-200 dark:bg-pink-900 rounded-full blur-3xl opacity-20 absolute -bottom-24 -right-24 animate-pulse" />
        </div>
        <div className="z-10 w-full flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-gray-900 dark:text-white drop-shadow-lg transition-all duration-300">
            Boost Your Productivity
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 max-w-2xl mx-auto transition-all duration-300">
            All your notes, tasks, flashcards, and schedules—organized and accessible in one beautiful workspace. Stay focused, motivated, and on track with ProdActivity.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all duration-200 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Get Started Free
          </button>
          <div className="text-gray-500 dark:text-gray-400 text-base mb-8">
            Already have an account? <span className="underline cursor-pointer transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-300" onClick={() => navigate('/login')}>Log in</span>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 z-10 py-16">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg p-8 flex items-center space-x-6 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
          >
            <div className="transition-transform duration-300 group-hover:rotate-6">
              {feature.icon}
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-1 transition-colors duration-200 group-hover:text-indigo-800 dark:group-hover:text-indigo-200">
                {feature.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 transition-colors duration-200">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </section>
      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-xs mt-8 border-t border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 w-full">
        &copy; {new Date().getFullYear()} prodactivity. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage; 