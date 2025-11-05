import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reviewsService, Review, NewReview } from "../lib/reviewsService";

const features = [
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: "Smart Notes",
    description: "AI-powered organization with rich text editing, smart search, and hashtag categorization."
  },
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Progress Tracking",
    description: "Visualize achievements with charts, track streaks, and monitor productivity metrics."
  },
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: "Flashcard Decks",
    description: "Create and study flashcards with spaced repetition for optimal learning retention."
  },
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "AI Reviewer",
    description: "AI-powered review sessions that adapt to your learning pace with personalized recommendations."
  },
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "Task Management",
    description: "Organize to-dos with priorities, deadlines, and progress tracking for efficient workflow."
  },
  {
    icon: (
      <svg className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Smart Scheduling",
    description: "Plan events, set reminders, and sync with your calendar for optimized daily routines."
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
    loadReviews();
  }, []);

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
        setUserReviews(prev => [submittedReview, ...prev]);
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
        className={`w-4 h-4 md:w-5 md:h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-white dark:bg-gray-900">
      {/* Navbar */}
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ProdActivity
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Boost Your Productivity
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            Where your activity meets productiveness.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Free
            </button>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Already have an account?{" "}
              <button
                onClick={() => navigate('/login')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 sm:mb-2">
                  {stat.number}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
            ProdActivity
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            A comprehensive productivity ecosystem designed for students, professionals, and lifelong learners. 
            Our intelligent platform combines cutting-edge AI technology with intuitive design to transform 
            how you organize, learn, and achieve your goals.
          </p>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            From smart note-taking and AI-powered study assistance to advanced task management and progress 
            tracking, we provide all the tools you need to stay organized, motivated, and ahead of your schedule.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Everything You Need to Succeed
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Discover powerful tools designed to enhance your productivity, learning, and organization
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
              >
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              User Testimonials
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">
              Join users who have transformed their productivity
            </p>
          </div>
          
          {/* Add Review Button */}
          <div className="text-center mb-8 sm:mb-12">
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200"
            >
              {showReviewForm ? 'Cancel Review' : 'Share Your Experience'}
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-8 sm:mb-12 max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
                  Share Your Experience
                </h3>
                
                <form onSubmit={handleSubmitReview} className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newReview.name}
                      onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your name or leave blank for anonymous"
                    />
                  </div>

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
                            className={`w-6 h-6 sm:w-8 sm:h-8 ${
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Review
                    </label>
                    <textarea
                      value={newReview.content}
                      onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Tell us about your experience with ProdActivity..."
                      required
                    />
                  </div>

                  <div className="text-center">
                    <button
                      type="submit"
                      disabled={newReview.rating === 0 || !newReview.content.trim() || submitting}
                      className="px-6 sm:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                    >
                      {submitting ? (
                        <div className="flex items-center justify-center">
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
          )}

          {/* Reviews Grid */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8 text-gray-900 dark:text-white">
              Recent Reviews
            </h3>
            
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
              </div>
            ) : userReviews.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {userReviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center mb-3">
                      <div className="text-xl sm:text-2xl mr-3">{review.avatar}</div>
                      <div>
                        <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                          {review.name}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex mb-3">
                      {renderStars(review.rating)}
                    </div>
                    
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {review.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 bg-indigo-600 dark:bg-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-white">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-6 sm:mb-8 leading-relaxed">
            Join thousands of users who have already improved their learning and productivity with ProdActivity
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-6 sm:px-10 py-3 sm:py-4 bg-white text-indigo-600 rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Start Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 sm:px-10 py-3 sm:py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-white hover:text-indigo-600 transition-all duration-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-gray-900 dark:bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-8">
            {/* Company Info */}
            <div className="col-span-1 sm:col-span-2">
              <div className="text-2xl sm:text-3xl font-bold mb-4 text-indigo-400">
                ProdActivity
              </div>
              <p className="text-sm sm:text-base text-gray-400 mb-6 max-w-md leading-relaxed">
                Empowering students, professionals, and learners worldwide with intelligent productivity tools and AI-powered learning solutions.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-indigo-400">Quick Links</h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a href="#" className="text-sm sm:text-base text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm sm:text-base text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm sm:text-base text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm sm:text-base text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs sm:text-sm text-gray-400">
                &copy; {new Date().getFullYear()} ProdActivity. All rights reserved.
              </div>
              <div className="flex flex-wrap gap-4 sm:gap-8 text-xs sm:text-sm">
                <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors duration-200">
                  Cookie Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
