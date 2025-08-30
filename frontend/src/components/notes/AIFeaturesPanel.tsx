import React, { useState, useRef, useEffect } from 'react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Sparkles, X, CreditCard } from 'lucide-react';
import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface AIFeaturesPanelProps {
  content: string;
  onApplySummary: (summary: string) => void;
  onActiveChange?: (isOpen: boolean) => void;
  sourceNoteId?: number;
  sourceNotebookId?: number;
  sourceTitle?: string;
}

// Typing Animation Component
const TypingAnimation: React.FC<{ text: string; speed?: number }> = ({ text, speed = 25 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing animation
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    // If text is empty, reset
    if (!text) {
      setDisplayedText('');
      return;
    }

    // If the text is completely new (different from what we have), start fresh
    if (text !== displayedText && !text.startsWith(displayedText)) {
      setDisplayedText(text);
      return;
    }

    // If this is new text (longer than what we've displayed), animate the new part
    if (text.length > displayedText.length) {
      const newChars = text.slice(displayedText.length);
      let charIndex = 0;

      const animateNextChar = () => {
        if (charIndex < newChars.length) {
          setDisplayedText(prev => prev + newChars[charIndex]);
          charIndex++;
          animationRef.current = setTimeout(animateNextChar, speed);
        }
      };

      animateNextChar();
    }

  }, [text, speed, displayedText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  // Don't render anything if there's no text
  if (!text) {
    return null;
  }

  return (
    <span className="text-sm whitespace-pre-wrap">
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

const AIFeaturesPanel: React.FC<AIFeaturesPanelProps> = ({ content, onApplySummary, onActiveChange, sourceNoteId, sourceNotebookId, sourceTitle }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [reviewResult, setReviewResult] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [generatedReviewerId, setGeneratedReviewerId] = useState<number | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isConvertingToFlashcards, setIsConvertingToFlashcards] = useState(false);
  const [flashcardResult, setFlashcardResult] = useState<string>('');
  const [createdDeckId, setCreatedDeckId] = useState<number | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

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
    // ensure mount, then animate in
    requestAnimationFrame(() => setPanelVisible(true));
    if (onActiveChange) onActiveChange(true);
    // Reset chat when switching to chat feature
    if (featureId === 'chat') {
      setChatMessages([]);
      setChatInput('');
    }
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

    // Add the new user message to the chat history
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error('Please log in to use the chat feature');
      }

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: ''
      };

      // Add assistant message to chat immediately
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Start typing animation
      setIsTyping(true);

      // Send the full chat history (including the new user message)
      const response = await fetch(`${API_URL}/notes/chat/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.chunk) {
                  // Update the assistant message with new chunk
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.role === 'assistant') {
                      lastMessage.content = data.full_response;
                    }
                    return newMessages;
                  });
                  console.log('Received chunk:', data.chunk, 'Full response:', data.full_response);
                }
                
                if (data.done) {
                  // Stop typing animation
                  console.log('Response complete, stopping typing animation');
                  setIsTyping(false);
                  setIsChatLoading(false);
                  return;
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to get chat response:', error);
      setIsChatLoading(false);
      setIsTyping(false);
      
      if (error.message.includes('401')) {
        window.location.href = '/login';
      } else {
        const errorMessage = error.message || 'Failed to get chat response. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleReview = async () => {
    if (!content.trim()) return;
    setIsReviewing(true);
    setReviewResult('');
    try {
      // Compose detailed prompt like Reviewer page
      const detailedPrompt = `Please review the following content and provide your response in the following format:

Summary:

[Write a concise summary here]

Terminology:

- [List important terminologies with brief explanations as bullet points]

Key Points:

- [List key points and main ideas as bullet points]

Main Idea:

- [State the main idea(s) as bullet points]

Leave one blank line between each section. Use bullet points for lists.

Content:
${content}`;

      const response = await axios.post(`${API_URL}/reviewers/ai/generate/`, {
        text: detailedPrompt,
        title: (sourceTitle && sourceTitle.trim() ? `${sourceTitle.trim()} - Study Summary` : 'Study Summary'),
        source_note: sourceNoteId ?? null,
        source_notebook: sourceNotebookId ?? null,
        tags: []
      }, {
        headers: getAuthHeaders()
      });
      const created = response.data;
      
      // Show success message with option to view full reviewer
      setReviewResult(`✅ Review generated successfully!

Your review has been saved and is now available in the Reviewer section.

Review ID: ${created.id}
Title: ${created.title}

Click "View Full Review" to see the complete reviewer with all features.`);
      
      // Store the reviewer ID for the "View Full Review" button
      setGeneratedReviewerId(created.id);
    } catch (error: any) {
      console.error('Failed to review note:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to review note. Please try again.';
      setReviewResult(`❌ Error: ${errorMessage}`);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleViewFullReview = () => {
    if (generatedReviewerId) {
      window.open(`/reviewer/r/${generatedReviewerId}`, '_blank');
    }
  };

  const handleConvertToFlashcards = async () => {
    if (!content.trim()) return;
    
    setIsConvertingToFlashcards(true);
    setFlashcardResult('');
    setFlashcards([]);
    
    try {
      // First, get flashcards from AI
      const response = await axios.post(`${API_URL}/notes/convert-to-flashcards/`, {
        text: content
      }, {
        headers: getAuthHeaders()
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      const generatedFlashcards = response.data.flashcards || [];
      if (!generatedFlashcards.length) {
        throw new Error('No flashcards were generated');
      }
      
      setFlashcards(generatedFlashcards);
      
      // Create a deck for the flashcards
      const deckTitle = sourceTitle ? `${sourceTitle} - Flashcards` : 'Note Flashcards';
      const deckResponse = await axios.post(`${API_URL}/decks/decks/`, {
        title: deckTitle
      }, {
        headers: getAuthHeaders()
      });
      
      const deckId = deckResponse.data.id;
      setCreatedDeckId(deckId);
      
      // Create flashcards in the deck
      const createdFlashcards = [];
      for (const flashcard of generatedFlashcards) {
        const flashcardResponse = await axios.post(`${API_URL}/decks/flashcards/`, {
          deck: deckId,
          front: flashcard.front,
          back: flashcard.back
        }, {
          headers: getAuthHeaders()
        });
        createdFlashcards.push(flashcardResponse.data);
      }
      
      setFlashcardResult(`✅ Successfully created ${createdFlashcards.length} flashcards!

Deck: ${deckTitle}
Flashcards: ${createdFlashcards.length}

Click "View Deck" to see your flashcards in the Decks section.`);
      
    } catch (error: any) {
      console.error('Failed to convert to flashcards:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to convert to flashcards. Please try again.';
      setFlashcardResult(`❌ Error: ${errorMessage}`);
    } finally {
      setIsConvertingToFlashcards(false);
    }
  };

  const handleViewDeck = () => {
    if (createdDeckId) {
      window.open(`/decks/${createdDeckId}`, '_blank');
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  return (
    <>
      {/* AI Feature Results Panel (left of navbar) */}
      {activeFeature && (
        <div
          className={`w-96 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg transform transition-all duration-200 ease-out will-change-transform ${panelVisible ? 'opacity-100 -translate-x-0' : 'opacity-0 -translate-x-4'}`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeFeature === 'summarize' ? 'Smart Summarization' :
                 activeFeature === 'review' ? 'AI Reviewer' : 
                 activeFeature === 'flashcards' ? 'Convert to Flashcards' : 'AI Chat'}
              </h2>
              <div className="flex items-center space-x-2">
                {activeFeature === 'chat' && chatMessages.length > 0 && (
                  <button
                    onClick={() => {
                      setChatMessages([]);
                      setChatInput('');
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Clear chat"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    setPanelVisible(false);
                    setTimeout(() => {
                      setActiveFeature(null);
                      if (onActiveChange) onActiveChange(false);
                    }, 200);
                    setSummaryResult('');
                    setChatMessages([]);
                    setChatInput('');
                    setGeneratedReviewerId(null);
                    setReviewResult('');
                    setFlashcards([]);
                    setFlashcardResult('');
                    setCreatedDeckId(null);
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                        {generatedReviewerId && (
                          <button
                            onClick={handleViewFullReview}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            View Full Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activeFeature === 'flashcards' && (
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Convert your note content into study flashcards automatically.
                    </p>
                    <button
                      onClick={handleConvertToFlashcards}
                      disabled={!content.trim() || isConvertingToFlashcards}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isConvertingToFlashcards ? 'Converting...' : 'Convert to Flashcards'}
                    </button>
                    
                    {flashcards.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Generated Flashcards ({flashcards.length})
                        </h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {flashcards.map((flashcard, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Card {index + 1}
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                {flashcard.front}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                {flashcard.back}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {flashcardResult && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {flashcardResult}
                        </p>
                        {createdDeckId && (
                          <button
                            onClick={handleViewDeck}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            View Deck
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activeFeature === 'chat' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
                      {chatMessages.map((message, index) => {
                        const isLatestAssistantMessage = message.role === 'assistant' && 
                          index === chatMessages.length - 1;
                        const shouldShowTyping = isLatestAssistantMessage && isTyping && message.content;
                        return (
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
                              {shouldShowTyping ? (
                                <TypingAnimation text={message.content} speed={25} />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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

      {/* AI Features Sidebar (navbar at far right) */}
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
          onClick={() => handleFeatureClick('flashcards')}
          className={`p-2 rounded-lg transition-colors group relative
            ${activeFeature === 'flashcards' 
              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
          title="Convert to Flashcards"
        >
          <CreditCard className="h-6 w-6" />
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Convert to Flashcards
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

      {/* Duplicate right-side panel removed */}
    </>
  );
};

export default AIFeaturesPanel; 