// frontend/src/components/notes/AIFeaturesPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Zap, 
  AlertTriangle, 
  Scissors,
  BookOpen,
  Clock,
  Target,
  X,
  GraduationCap,
  CreditCard
} from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import TypingAnimation from '../common/TypingAnimation';

interface AIFeaturesPanelProps {
  content: string;
  onApplySummary: (summary: string) => void;
  onActiveChange?: (active: boolean) => void;
  sourceNoteId?: number;
  sourceNotebookId?: number;
  sourceTitle?: string;
  noteType?: string;
  isNotebook?: boolean;
}

interface UrgencyAnalysis {
  urgency_level: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  reasoning: string;
  suggested_priority: 'low' | 'medium' | 'high' | 'urgent';
  time_sensitive: boolean;
  deadlines_mentioned: string[];
  action_required: boolean;
}

interface ChunkingSuggestion {
  title: string;
  content_preview: string;
  key_concepts: string[];
  estimated_length: 'short' | 'medium' | 'long';
  priority: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  learning_objectives?: string[];
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

interface ChunkingAnalysis {
  suggested_chunks: ChunkingSuggestion[];
  total_notes_suggested: number;
  reasoning: string;
  study_recommendations: string[];
  chunking_strategy?: string;
  estimated_study_time?: string;
  content_complexity?: string;
  content_analysis?: {
    target_chunks: number;
    complexity: string;
    strategy: string;
  };
  processing_timestamp?: string;
}

interface Flashcard {
  front: string;
  back: string;
}

// Function to clean HTML content
const cleanHTMLContent = (text: string): string => {
  if (!text) return '';
  
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean up HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

// Function to convert markdown to HTML
const convertMarkdownToHTML = (text: string): string => {
  if (!text) return '';
  
  return text
    // Convert ### headings to h3
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4">$1</h3>')
    // Convert ## headings to h2
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5">$1</h2>')
    // Convert # headings to h1
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6">$1</h1>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Convert numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$1. $2</li>')
    // Convert bullet points
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>');
};

const AIFeaturesPanel: React.FC<AIFeaturesPanelProps> = ({ 
  content, 
  onApplySummary, 
  onActiveChange, 
  sourceNoteId,
  sourceNotebookId, 
  sourceTitle,
  noteType = 'other',
  isNotebook = false
}) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Summary state
  const [summaryResult, setSummaryResult] = useState<string>('');

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);

  // Urgency detection state
  const [urgencyAnalysis, setUrgencyAnalysis] = useState<UrgencyAnalysis | null>(null);

  // Smart chunking state
  const [chunkingAnalysis, setChunkingAnalysis] = useState<ChunkingAnalysis | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Notebook summary state
  const [notebookSummary, setNotebookSummary] = useState<string>('');

  // AI Reviewer state
  const [reviewResult, setReviewResult] = useState<string>('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [generatedReviewerId, setGeneratedReviewerId] = useState<number | null>(null);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isConvertingToFlashcards, setIsConvertingToFlashcards] = useState(false);
  const [flashcardResult, setFlashcardResult] = useState<string>('');
  const [createdDeckId, setCreatedDeckId] = useState<number | null>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (activeFeature === 'chat' && chatMessages.length > 0) {
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [chatMessages, activeFeature]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
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
      setIsTyping(false);
      setTypingMessageIndex(null);
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/notes/summarize/', {
        text: content
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
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Notebook summarization
  const handleNotebookSummarize = async () => {
    if (!sourceNotebookId) {
      setError('No notebook selected for summarization');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/notes/notebook-summary/', {
        notebook_id: sourceNotebookId
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setNotebookSummary(response.data.summary);
    } catch (error: any) {
      console.error('Failed to summarize notebook:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to summarize notebook. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Urgency detection
  const handleUrgencyDetection = async () => {
    if (!content.trim() && !sourceTitle) {
      setError('No content or title provided for urgency analysis');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/notes/urgency-detection/', {
        text: content,
        title: sourceTitle || '',
        note_type: noteType
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setUrgencyAnalysis(response.data);
    } catch (error: any) {
      console.error('Failed to analyze urgency:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to analyze urgency. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Smart chunking
  const handleSmartChunking = async () => {
    if (!content.trim()) {
      setError('No content provided for chunking analysis');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/notes/smart-chunking/', {
        text: content,
        topic: sourceTitle || 'Untitled'
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setChunkingAnalysis(response.data);
    } catch (error: any) {
      console.error('Failed to analyze chunking:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to analyze chunking. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Create note from chunk
  const handleCreateNoteFromChunk = async (chunk: ChunkingSuggestion) => {
    if (!sourceNotebookId) {
      setError('No notebook selected for creating the note');
      return;
    }

    setIsCreatingNote(true);
    setError(null);
    
    try {
      const noteData = {
        title: chunk.title,
        content: chunk.content_preview,
        notebook: sourceNotebookId,
        priority: chunk.priority === 'high' ? 3 : chunk.priority === 'medium' ? 2 : 1,
        tags: chunk.key_concepts,
        note_type: 'other'
      };

      const response = await axiosInstance.post('/notes/', noteData);
      
      if (response.data && response.data.id) {
        // Show success message
        setError(null);
        // You could add a success state here or show a toast notification
        console.log('Note created successfully:', response.data);
        
        // Optionally close the AI panel or reset chunking analysis
        // setChunkingAnalysis(null);
      } else {
        throw new Error('Failed to create note');
      }
    } catch (error: any) {
      console.error('Failed to create note from chunk:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create note. Please try again.';
      setError(errorMessage);
    } finally {
      setIsCreatingNote(false);
    }
  };

  // AI Reviewer
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

      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: detailedPrompt,
        title: (sourceTitle && sourceTitle.trim() ? `${sourceTitle.trim()} - Study Summary` : 'Study Summary'),
        source_note: sourceNoteId ?? null,
        source_notebook: sourceNotebookId ?? null,
        tags: []
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

  // Convert to Flashcards
  const handleConvertToFlashcards = async () => {
    if (!content.trim()) return;
    
    setIsConvertingToFlashcards(true);
    setFlashcardResult('');
    setFlashcards([]);
    
    try {
      // First, get flashcards from AI
      const response = await axiosInstance.post('/notes/convert-to-flashcards/', {
        text: content
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
      const deckResponse = await axiosInstance.post('/decks/decks/', {
        title: deckTitle
      });
      
      const deckId = deckResponse.data.id;
      setCreatedDeckId(deckId);
      
      // Create flashcards in the deck
      const createdFlashcards = [];
      for (const flashcard of generatedFlashcards) {
        const flashcardResponse = await axiosInstance.post('/decks/flashcards/', {
          deck: deckId,
          front: flashcard.front,
          back: flashcard.back
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

  const handleApplySummary = () => {
    if (summaryResult) {
      onApplySummary(summaryResult);
      setSummaryResult('');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      // Prepare messages array for the backend
      const messages = [
        ...chatMessages,
        userMessage
      ];

      // Create a temporary assistant message that we'll update
      const tempAssistantMessage = { role: 'assistant' as const, content: '' };
      setChatMessages(prev => {
        const newMessages = [...prev, tempAssistantMessage];
        setTypingMessageIndex(newMessages.length - 1); // Index of the new assistant message
        return newMessages;
      });
      setIsTyping(true);
      console.log('🎬 Starting typing animation, isTyping:', true);

      const response = await fetch('/api/notes/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ 
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                // Update the last message with the new chunk for typing animation
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: data.full_response || fullResponse + data.chunk };
                  }
                  return newMessages;
                });
                fullResponse = data.full_response || fullResponse + data.chunk;
                
                // Add a small delay to make typing animation visible
                await new Promise(resolve => setTimeout(resolve, 50));
              } else if (data.done && data.full_response) {
                // Final update with cleaned response
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: data.full_response };
                  }
                  return newMessages;
                });
                setIsTyping(false);
                setTypingMessageIndex(null);
                console.log('🎬 Typing animation complete, isTyping:', false);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Chat failed. Please try again.';
      setError(errorMessage);
      // Remove the temporary assistant message on error
      setChatMessages(prev => prev.slice(0, -1));
      setIsTyping(false);
      setTypingMessageIndex(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'urgent': return 'bg-orange-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const features = [
    {
      id: 'summary',
      icon: FileText,
      label: 'Summarize Note',
      description: 'Create a concise summary of this note',
      action: () => handleFeatureClick('summary'),
      show: !isNotebook
    },
    {
      id: 'notebook-summary',
      icon: BookOpen,
      label: 'Notebook Summary',
      description: 'Generate comprehensive summary of entire notebook',
      action: () => handleFeatureClick('notebook-summary'),
      show: isNotebook && !!sourceNotebookId
    },
    {
      id: 'urgency',
      icon: AlertTriangle,
      label: 'Detect Importance',
      description: 'AI-powered importance and priority analysis',
      action: () => handleFeatureClick('urgency'),
      show: true
    },
    {
      id: 'chunking',
      icon: Scissors,
      label: 'Smart Chunking',
      description: 'Suggest how to break content into multiple notes',
      action: () => handleFeatureClick('chunking'),
      show: true
    },
    {
      id: 'review',
      icon: GraduationCap,
      label: 'AI Reviewer',
      description: 'Generate study review and save to Reviewer',
      action: () => handleFeatureClick('review'),
      show: true
    },
    {
      id: 'flashcards',
      icon: CreditCard,
      label: 'Convert to Flashcards',
      description: 'Convert note content into study flashcards',
      action: () => handleFeatureClick('flashcards'),
      show: true
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat with Note',
      description: 'Ask questions about this content',
      action: () => handleFeatureClick('chat'),
      show: true
    }
  ];

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
                {activeFeature === 'summary' ? 'Smart Summarization' :
                 activeFeature === 'notebook-summary' ? 'Notebook Summary' :
                 activeFeature === 'urgency' ? 'Urgency Analysis' :
                 activeFeature === 'chunking' ? 'Smart Chunking' :
                 activeFeature === 'review' ? 'AI Reviewer' : 
                 activeFeature === 'flashcards' ? 'Convert to Flashcards' :
                 activeFeature === 'chat' ? 'AI Chat' : 'AI Features'}
              </h2>
              <div className="flex items-center space-x-2">
                {activeFeature === 'chat' && chatMessages.length > 0 && (
                  <button
                    onClick={() => {
                      setChatMessages([]);
                      setChatInput('');
                      setIsTyping(false);
                      setTypingMessageIndex(null);
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
                    setIsTyping(false);
                    setTypingMessageIndex(null);
                    setUrgencyAnalysis(null);
                    setChunkingAnalysis(null);
                    setNotebookSummary('');
                    setReviewResult('');
                    setFlashcards([]);
                    setFlashcardResult('');
                    setGeneratedReviewerId(null);
                    setCreatedDeckId(null);
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {activeFeature === 'summary' && (
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
                            <Brain className="w-4 h-4 mr-2" />
                            Generate Summary
                          </button>
                          
                          {summaryResult && (
                            <div className="space-y-4">
                              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <div 
                                  className="text-sm text-gray-700 dark:text-gray-300"
                                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(summaryResult) }}
                                />
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

                {activeFeature === 'notebook-summary' && (
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Generate comprehensive summaries of entire notebooks
                    </p>
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
                          onClick={handleNotebookSummarize}
                          disabled={!sourceNotebookId}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Generate Notebook Summary
                        </button>
                        
                        {notebookSummary && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                            <div 
                              className="text-sm text-gray-700 dark:text-gray-300"
                              dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(notebookSummary) }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeFeature === 'urgency' && (
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI-powered urgency and priority analysis
                    </p>
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
                          onClick={handleUrgencyDetection}
                          disabled={!content.trim() && !sourceTitle}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Analyze Urgency
                        </button>
                        
                        {urgencyAnalysis && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Urgency:</span>
                                                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImportanceColor(urgencyAnalysis.urgency_level)}`}>
                                {urgencyAnalysis.urgency_level.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(urgencyAnalysis.suggested_priority)}`}>
                                {urgencyAnalysis.suggested_priority.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Reasoning:</strong> {urgencyAnalysis.reasoning}
                            </div>
                            {urgencyAnalysis.time_sensitive && (
                              <div className="text-sm text-orange-600 dark:text-orange-400">
                                ⏰ Time-sensitive content detected
                              </div>
                            )}
                            {urgencyAnalysis.action_required && (
                              <div className="text-sm text-red-600 dark:text-red-400">
                                ⚡ Action required
                              </div>
                            )}
                            {urgencyAnalysis.deadlines_mentioned.length > 0 && (
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>Deadlines:</strong> {urgencyAnalysis.deadlines_mentioned.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeFeature === 'chunking' && (
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      AI suggests optimal ways to break down long topics
                    </p>
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
                          onClick={handleSmartChunking}
                          disabled={!content.trim()}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          <Scissors className="w-4 h-4 mr-2" />
                          Analyze Chunking
                        </button>
                        
                        {chunkingAnalysis && (
                          <div className="space-y-4">
                            {/* Analysis Summary */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100">Analysis Summary</h4>
                                {chunkingAnalysis.content_complexity && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    chunkingAnalysis.content_complexity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                    chunkingAnalysis.content_complexity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  }`}>
                                    {chunkingAnalysis.content_complexity} complexity
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-blue-800 dark:text-blue-200">
                                AI suggests breaking this content into <strong>{chunkingAnalysis.total_notes_suggested}</strong> focused notes
                                {chunkingAnalysis.chunking_strategy && (
                                  <span> using a <strong>{chunkingAnalysis.chunking_strategy}</strong> approach</span>
                                )}
                                {chunkingAnalysis.estimated_study_time && (
                                  <span> (~{chunkingAnalysis.estimated_study_time})</span>
                                )}
                              </div>
                            </div>

                            {/* Suggested Chunks */}
                            <div className="space-y-3">
                              {chunkingAnalysis.suggested_chunks.map((chunk, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="font-medium text-gray-900 dark:text-white">{cleanHTMLContent(chunk.title)}</h5>
                                    <div className="flex items-center gap-2">
                                      {chunk.difficulty_level && (
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          chunk.difficulty_level === 'advanced' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                          chunk.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        }`}>
                                          {chunk.difficulty_level}
                                        </span>
                                      )}
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(chunk.priority)}`}>
                                        {chunk.priority}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {chunk.estimated_length}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {cleanHTMLContent(chunk.content_preview)}
                                  </div>
                                  
                                  {/* Key Concepts */}
                                  <div className="mb-3">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Key concepts:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {chunk.key_concepts.map((concept, idx) => (
                                        <span key={idx} className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                                          {concept}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Learning Objectives */}
                                  {chunk.learning_objectives && chunk.learning_objectives.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Learning objectives:</div>
                                      <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                                        {chunk.learning_objectives.map((objective, idx) => (
                                          <li key={idx}>{objective}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Prerequisites */}
                                  {chunk.prerequisites && chunk.prerequisites.length > 0 && (
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prerequisites:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {chunk.prerequisites.map((prereq, idx) => (
                                          <span key={idx} className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                                            {prereq}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Button */}
                                  <button 
                                    className="w-full mt-3 px-3 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                                    onClick={() => handleCreateNoteFromChunk(chunk)}
                                    disabled={isCreatingNote}
                                  >
                                    {isCreatingNote ? 'Creating Note...' : 'Create Note from This Chunk'}
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Analysis Details */}
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-2">Analysis Details</h5>
                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                <strong>Reasoning:</strong> {chunkingAnalysis.reasoning}
                              </div>
                              
                              {chunkingAnalysis.study_recommendations.length > 0 && (
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                  <strong>Study Recommendations:</strong>
                                  <ul className="list-disc list-inside mt-1">
                                    {chunkingAnalysis.study_recommendations.map((rec, idx) => (
                                      <li key={idx}>{rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
                      <Brain className="w-4 h-4 mr-2" />
                      {isReviewing ? 'Reviewing...' : 'Generate Review'}
                    </button>
                    {reviewResult && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2 max-h-64 overflow-y-auto">
                        <div 
                          className="text-sm text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(reviewResult) }}
                        />
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
                      <Brain className="w-4 h-4 mr-2" />
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
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-2 max-h-64 overflow-y-auto">
                        <div 
                          className="text-sm text-gray-700 dark:text-gray-300"
                          dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(flashcardResult) }}
                        />
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
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2 chat-messages-container" ref={(el) => {
                      // Auto-scroll to bottom when new messages arrive
                      if (el) {
                        el.scrollTop = el.scrollHeight;
                      }
                    }}>
                      {chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 break-words transition-all duration-200 ${
                                message.role === 'user'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                              } ${
                                message.role === 'assistant' && isTyping && typingMessageIndex === index
                                  ? 'shadow-md ring-2 ring-indigo-200 dark:ring-indigo-800'
                                  : ''
                              }`}
                            >
                              {message.role === 'assistant' && isTyping && typingMessageIndex === index ? (
                                <>
                                  {console.log('🎬 Rendering TypingAnimation for message', index, 'content:', message.content)}
                                  <div 
                                    className="text-sm"
                                    dangerouslySetInnerHTML={{ 
                                      __html: convertMarkdownToHTML(message.content) + '<span class="animate-pulse text-indigo-500 ml-1">|</span>'
                                    }}
                                  />
                                </>
                              ) : (
                                <div 
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(message.content) }}
                                />
                              )}
                            </div>
                          </div>
                      ))}
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
                            disabled={isLoading}
                          />
                          <button
                            type="submit"
                            disabled={isLoading || !chatInput.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
                      <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                      <button
                        onClick={() => setError(null)}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Dismiss
                      </button>
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
        {features.filter(f => f.show).map((feature) => (
          <button
            key={feature.id}
            onClick={feature.action}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors group relative
              ${activeFeature === feature.id 
                ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
            title={feature.label}
          >
            <feature.icon className="h-6 w-6" />
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {feature.label}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};

export default AIFeaturesPanel; 