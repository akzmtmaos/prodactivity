import React, { useState, useRef } from 'react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Sparkles, X } from 'lucide-react';
import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIFeaturesPanelProps {
  content: string;
  onApplySummary: (summary: string) => void;
}

const AIFeaturesPanel: React.FC<AIFeaturesPanelProps> = ({ content, onApplySummary }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reviewResult, setReviewResult] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/notes';

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.href = '/login';
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(featureId);
  };

  const handleSummarize = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/notes/summarize/`, {
        text: content
      }, {
        headers: getAuthHeaders()
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const newSummary = response.data.summary;
      if (!newSummary) {
        throw new Error('No summary was generated');
      }
      
      setSummaryResult(newSummary);
    } catch (error: any) {
      console.error('Failed to summarize note:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to summarize note. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySummary = () => {
    if (summaryResult) {
      onApplySummary(summaryResult);
      setSummaryResult('');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error('Please log in to use the chat feature');
      }

      const response = await axios.post(`${API_URL}/notes/chat/`, {
        messages: [userMessage]
      }, {
        headers
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.response
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to get chat response:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to get chat response. Please try again.';
        alert(errorMessage);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleReview = async () => {
    if (!content.trim()) return;
    setIsReviewing(true);
    setReviewResult('');
    try {
      const response = await axios.post(`${API_URL}/notes/review/`, {
        text: content
      }, {
        headers: getAuthHeaders()
      });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      const review = response.data.review;
      if (!review) {
        throw new Error('No review was generated');
      }
      setReviewResult(review);
    } catch (error: any) {
      console.error('Failed to review note:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to review note. Please try again.';
      alert(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <>
      {/* AI Features Sidebar */}
      <div className="w-16 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => handleFeatureClick('summarize')}
          className={`p-2 rounded-lg transition-colors group relative
            ${activeFeature === 'summarize' 
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
          title="Smart Summarization"
        >
          <DocumentTextIcon className="h-6 w-6" />
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Smart Summarization
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </button>

        <button
          onClick={() => handleFeatureClick('review')}
          className={`p-2 rounded-lg transition-colors group relative
            ${activeFeature === 'review' 
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
          title="AI Reviewer"
        >
          <AcademicCapIcon className="h-6 w-6" />
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              AI Reviewer
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </button>

        <button
          onClick={() => handleFeatureClick('chat')}
          className={`p-2 rounded-lg transition-colors group relative
            ${activeFeature === 'chat' 
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
          title="AI Chat"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              AI Chat
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
          </div>
        </button>
      </div>

      {/* Feature Results Panel */}
      {activeFeature && (
        <div className="absolute right-16 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg" style={{ top: '130px', bottom: '0' }}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeFeature === 'summarize' ? 'Smart Summarization' :
                 activeFeature === 'review' ? 'AI Reviewer' : 'AI Chat'}
              </h2>
              <button
                onClick={() => {
                  setActiveFeature(null);
                  setSummaryResult('');
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full">
                {activeFeature === 'summarize' && (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-4">
                      Get AI-powered summaries of your notes in different formats
                    </p>
                    <div className="space-y-4 p-4">
                      {isLoading ? (
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={handleSummarize}
                            disabled={!content.trim()}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Summary
                          </button>
                          
                          {summaryResult && (
                            <div className="space-y-4">
                              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {summaryResult}
                                </p>
                              </div>
                              <button
                                onClick={handleApplySummary}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                              >
                                Apply Summary
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
                {activeFeature === 'review' && (
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get automated review and feedback on your note's content.
                    </p>
                    <button
                      onClick={handleReview}
                      disabled={!content.trim() || isReviewing}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isReviewing ? 'Reviewing...' : 'Generate Review'}
                    </button>
                    {reviewResult && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {reviewResult}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeFeature === 'chat' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                      {chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 break-words ${
                              message.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-gray-700">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <form onSubmit={handleChatSubmit} className="p-4">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            disabled={isChatLoading}
                          />
                          <button
                            type="submit"
                            disabled={isChatLoading || !chatInput.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIFeaturesPanel; 