import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: (
      <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h5l2-2h5a2 2 0 012 2v12a2 2 0 01-2 2z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a1 1 0 001 1h3v2a1 1 0 001 1h3v2a1 1 0 001 1h3v2a1 1 0 001 1h3a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 018 0v2m-4-4V7m0 0a4 4 0 11-8 0 4 4 0 018 0z" />
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
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 8v8" />
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

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Medical Student",
    avatar: "👩‍⚕️",
    content: "ProdActivity has transformed my study routine. The AI reviewer helps me retain information better, and the progress tracking keeps me motivated. I've improved my exam scores by 30%!",
    rating: 5
  },
  {
    name: "Marcus Rodriguez",
    role: "Software Developer",
    avatar: "👨‍💻",
    content: "The task management and scheduling features are incredible. I can finally keep track of all my projects and deadlines without feeling overwhelmed. The interface is so intuitive!",
    rating: 5
  },
  {
    name: "Emily Watson",
    role: "Language Teacher",
    avatar: "👩‍🏫",
    content: "I use the flashcard decks to create vocabulary lessons for my students. The spaced repetition algorithm is perfect for language learning. My students love the interactive quizzes!",
    rating: 5
  },
  {
    name: "David Kim",
    role: "Business Analyst",
    avatar: "👨‍💼",
    content: "The productivity analytics have given me insights into my work patterns I never had before. I can now optimize my schedule and focus on what matters most. Game changer!",
    rating: 5
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
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
          <div className="w-64 h-64 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-25 absolute top-1/2 left-1/4 animate-bounce" />
        </div>
        
        <div className={`z-10 w-full flex flex-col items-center justify-center min-h-[60vh] transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-gray-900 dark:text-white drop-shadow-lg transition-all duration-300 animate-fade-in">
            Boost Your Productivity
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto transition-all duration-300 animate-fade-in-delay">
            All your notes, tasks, flashcards, and schedules—organized and accessible in one beautiful workspace. Stay focused, motivated, and on track with ProdActivity.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all duration-200 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 animate-bounce-in"
          >
            Get Started Free
          </button>
          <div className="text-gray-500 dark:text-gray-400 text-base mb-8">
            Already have an account? <span className="underline cursor-pointer transition-colors duration-200 hover:text-indigo-600 dark:hover:text-indigo-300" onClick={() => navigate('/login')}>Log in</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`text-center transform transition-all duration-700 delay-${idx * 100} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
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
      </section>

      {/* Features Section */}
      <section className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Discover powerful tools designed to enhance your productivity, learning, and organization
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-lg p-8 transform transition-all duration-700 delay-${idx * 100} hover:scale-105 hover:shadow-2xl group ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex items-start space-x-6">
                <div className="transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-3 transition-colors duration-200 group-hover:text-indigo-800 dark:group-hover:text-indigo-200">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, detailIdx) => (
                      <li key={detailIdx} className="flex items-center text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Join users who have transformed their productivity
            </p>
          </div>
          
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
                {testimonials.map((testimonial, idx) => (
                  <div key={idx} className="w-full flex-shrink-0 px-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                      <div className="text-center mb-6">
                        <div className="text-4xl mb-4">{testimonial.avatar}</div>
                        <div className="flex justify-center mb-2">
                          {renderStars(testimonial.rating)}
                        </div>
                      </div>
                      <blockquote className="text-lg text-gray-700 dark:text-gray-300 italic mb-6 text-center leading-relaxed">
                        "{testimonial.content}"
                      </blockquote>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 dark:text-white text-lg">
                          {testimonial.name}
                        </div>
                        <div className="text-indigo-600 dark:text-indigo-400">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Testimonial Navigation Dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    idx === currentTestimonial ? 'bg-indigo-600 w-8' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
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
      <section className="w-full py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Join thousands of users who have already improved their learning and productivity with ProdActivity
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              Start Nowt
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white text-indigo-700 border-2 border-indigo-600 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-50 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">ProdActivity</div>
              <p className="text-slate-300 mb-6 max-w-md leading-relaxed">
                Empowering students, professionals, and learners worldwide with intelligent productivity tools and AI-powered learning solutions.
              </p>
              <div className="flex space-x-4">
                {/* Social Media Icons */}
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-indigo-500/25">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-indigo-400">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">About Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Features</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Pricing</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Blog</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Contact</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-6 text-indigo-400">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Help Center</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Documentation</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">API Reference</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Community</a></li>
                <li><a href="#" className="text-slate-300 hover:text-indigo-400 transition-colors duration-200 hover:translate-x-1 inline-block">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-slate-400 text-sm mb-4 md:mb-0">
                &copy; {new Date().getFullYear()} ProdActivity. All rights reserved.
              </div>
              <div className="flex space-x-8 text-sm">
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">Terms of Service</a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition-colors duration-200">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 