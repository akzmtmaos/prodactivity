// frontend/src/components/notes/AIFeaturesPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Zap, 
  Scissors,
  BookOpen,
  Clock,
  Target,
  X,
  GraduationCap,
  CreditCard
} from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { API_BASE_URL } from '../../config/api';
import TypingAnimation from '../common/TypingAnimation';

// Helper to get current user's avatar URL
const getCurrentUserAvatar = (): string | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    // Common possible fields
    return user.avatar_url || user.avatar || user.profile_image || null;
  } catch {
    return null;
  }
};

// Stop phrase detection
const shouldHaltChat = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  return [
    'stop',
    "that's enough",
    'no more',
    'stop it',
    'stop responding',
    'be quiet',
    'enough',
    'halt'
  ].some(phrase => t.includes(phrase));
};

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

// Function to clean HTML content and improve formatting
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
    // Clean up extra whitespace and line breaks
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

// Function to format content preview better
const formatContentPreview = (text: string): string => {
  if (!text) return '';
  
  // Clean the content first
  let cleaned = cleanHTMLContent(text);
  
  // Truncate if too long
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }
  
  return cleaned;
};

// Function to extract a better title from content
const extractTitle = (content: string): string => {
  if (!content) return 'Untitled Chunk';
  
  // Try to find the first line that looks like a title
  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes('Example:') && !trimmed.includes('Output:')) {
      return trimmed;
    }
  }
  
  // Fallback to first meaningful line
  const firstLine = lines[0]?.trim();
  return firstLine && firstLine.length < 100 ? firstLine : 'Study Chunk';
};

// Function to clean AI thinking process from responses
const cleanThinkingProcess = (text: string): string => {
  // Always return just the last non-empty, trimmed line (matches backend logic)
  if (!text) return '';
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) {
      return lines[i].trim();
    }
  }
  return text.trim();
};

// Function to convert markdown to HTML
const convertMarkdownToHTML = (text: string): string => {
  if (!text) return '';
  
  // Normalize line endings
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let html: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };

  const renderInline = (s: string) => {
    // Bold and italic
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    return s;
  };

  for (let raw of lines) {
    const line = raw.trimEnd();

    // Headings
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { closeLists(); html.push(`<h3 class="text-lg font-bold mb-2 mt-4">${renderInline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^##\s+(.+)/))) { closeLists(); html.push(`<h2 class="text-xl font-bold mb-3 mt-5">${renderInline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^#\s+(.+)/)))  { closeLists(); html.push(`<h1 class="text-2xl font-bold mb-4 mt-6">${renderInline(m[1])}</h1>`); continue; }

    // Ordered list
    if ((m = line.match(/^\s{0,3}(\d+)\.\s+(.+)/))) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (!inOl) { html.push('<ol class="list-decimal ml-6 space-y-1">'); inOl = true; }
      html.push(`<li>${renderInline(m[2])}</li>`);
      continue;
    }

    // Unordered list
    if ((m = line.match(/^\s{0,3}[-*+]\s+(.+)/))) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (!inUl) { html.push('<ul class="list-disc ml-6 space-y-1">'); inUl = true; }
      html.push(`<li>${renderInline(m[1])}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      closeLists();
      html.push('<br>');
      continue;
    }

    // Paragraph - inherit text color from parent
    closeLists();
    html.push(`<p class="mb-2">${renderInline(line)}</p>`);
  }

  closeLists();
  return html.join('');
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


  // Smart chunking state
  const [chunkingAnalysis, setChunkingAnalysis] = useState<ChunkingAnalysis | null>(null);
  const [createdNoteIds, setCreatedNoteIds] = useState<Set<number>>(new Set());
  const [noteCreationStatus, setNoteCreationStatus] = useState<{[key: number]: 'success' | 'error' | 'creating'}>({});

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
      }, { timeout: 30000 });
      
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
      }, { timeout: 45000 });
      
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


  // NEW: Smart chunking
  const handleSmartChunking = async () => {
    if (!content.trim()) {
      setError('No content provided for chunking analysis');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Strip HTML from content to get plain text
      const plainTextContent = stripHtmlToText(content);
      
      if (!plainTextContent.trim()) {
        throw new Error('No text content found. Please ensure your note has readable content.');
      }
      
      const response = await axiosInstance.post('/notes/smart-chunking/', {
        text: plainTextContent,
        topic: sourceTitle || 'Untitled'
      }, {
        timeout: 120000 // 2 minutes timeout (same as backend)
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setChunkingAnalysis(response.data);
    } catch (error: any) {
      console.error('Failed to analyze chunking:', error);
      let errorMessage = 'Failed to analyze chunking. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The content might be too long. Please try with shorter content or wait a moment.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract relevant content section from original content
  const extractChunkContent = (chunk: ChunkingSuggestion, originalContent: string): string => {
    // Strip HTML from original content
    const plainTextContent = stripHtmlToText(originalContent);
    
    // Try to find the relevant section based on chunk title
    const chunkTitle = chunk.title || extractTitle(chunk.content_preview);
    const titleWords = chunkTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    // Try to find section in original content that matches the chunk title
    const contentLines = plainTextContent.split('\n');
    let startIndex = -1;
    let endIndex = -1;
    
    // Find the line that contains the chunk title or key words
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].toLowerCase();
      const matchesTitle = titleWords.some(word => line.includes(word));
      
      if (matchesTitle && startIndex === -1) {
        startIndex = i;
      }
    }
    
    // If we found a start, try to find the end (next major heading or end of content)
    if (startIndex !== -1) {
      // Look for next major heading (starts with uppercase, or has "LESSON", "CHAPTER", etc.)
      for (let i = startIndex + 1; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        if (line.length > 0) {
          // Check if this is a new section (heading pattern)
          if (line.match(/^(LESSON|CHAPTER|PART|SECTION|UNIT)\s+\d+/i) ||
              (line.length < 100 && line.match(/^[A-Z][A-Z\s]+$/))) {
            endIndex = i;
            break;
          }
        }
      }
      
      // If no end found, use a reasonable chunk size (about 1000 words or 5000 chars)
      if (endIndex === -1) {
        const extracted = contentLines.slice(startIndex).join('\n');
        if (extracted.length > 5000) {
          // Find a good breaking point around 5000 chars
          const truncated = extracted.substring(0, 5000);
          const lastPeriod = truncated.lastIndexOf('.');
          const lastNewline = truncated.lastIndexOf('\n');
          endIndex = startIndex + Math.max(lastPeriod, lastNewline);
        } else {
          endIndex = contentLines.length;
        }
      }
      
      // Extract the section
      const section = contentLines.slice(startIndex, endIndex).join('\n').trim();
      if (section.length > 100) {
        return section;
      }
    }
    
    // Fallback: Use the content preview but expand it with more context
    // Try to find the preview text in the original content and get surrounding context
    const previewText = stripHtmlToText(chunk.content_preview);
    const previewWords = previewText.split(/\s+/).filter(w => w.length > 4).slice(0, 5);
    
    if (previewWords.length > 0) {
      // Find where preview appears in original content
      const previewPattern = previewWords.join('.*?');
      const regex = new RegExp(previewPattern, 'i');
      const match = plainTextContent.match(regex);
      
      if (match && match.index !== undefined) {
        const start = Math.max(0, match.index - 200);
        const end = Math.min(plainTextContent.length, match.index + match[0].length + 2000);
        return plainTextContent.substring(start, end).trim();
      }
    }
    
    // Last fallback: Use content preview (at least it's something)
    return previewText || chunk.content_preview;
  };

  // Create note from chunk
  const handleCreateNoteFromChunk = async (chunk: ChunkingSuggestion, chunkIndex: number) => {
    if (!sourceNotebookId) {
      setError('No notebook selected for creating the note');
      return;
    }

    // Mark this chunk as being created
    setNoteCreationStatus(prev => ({ ...prev, [chunkIndex]: 'creating' }));
    setError(null);
    
    try {
      // Map priority to string values expected by backend
      let priorityValue = 'medium';
      if (chunk.priority === 'high') {
        priorityValue = 'high';
      } else if (chunk.priority === 'low') {
        priorityValue = 'low';
      }
      
      // Convert key_concepts array to comma-separated string if it's an array
      const tagsValue = Array.isArray(chunk.key_concepts) 
        ? chunk.key_concepts.join(', ') 
        : (chunk.key_concepts || '');
      
      // Extract full content from original note content based on chunk
      const fullContent = extractChunkContent(chunk, content);
      
      const noteData = {
        title: chunk.title || extractTitle(chunk.content_preview),
        content: fullContent,
        notebook: sourceNotebookId,
        priority: priorityValue,
        tags: tagsValue,
        note_type: 'other'
      };

      const response = await axiosInstance.post('/notes/', noteData);
      
      if (response.data && response.data.id) {
        // Mark as successful
        setNoteCreationStatus(prev => ({ ...prev, [chunkIndex]: 'success' }));
        setCreatedNoteIds(prev => {
          const newSet = new Set(prev);
          newSet.add(response.data.id);
          return newSet;
        });
        setError(null);
        
        // Show success message
        console.log('✅ Note created successfully:', response.data);
      } else {
        throw new Error('Failed to create note - no ID returned');
      }
    } catch (error: any) {
      console.error('❌ Failed to create note from chunk:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Failed to create note. Please try again.';
      
      // Mark as error
      setNoteCreationStatus(prev => ({ ...prev, [chunkIndex]: 'error' }));
      setError(`Failed to create note "${chunk.title}": ${errorMessage}`);
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  // Helper function to strip HTML and convert to plain text
  const stripHtmlToText = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Process block elements to add line breaks
    const blockElements = temp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, li, br');
    blockElements.forEach(el => {
      if (el.tagName === 'BR') {
        el.replaceWith('\n');
      } else {
        // Add line break after block elements
        const text = el.textContent || '';
        if (text.trim()) {
          el.textContent = text + '\n';
        }
      }
    });
    
    // Get text content
    let text = temp.textContent || temp.innerText || '';
    
    // Clean up excessive whitespace but preserve line breaks
    text = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    return text;
  };

  // AI Reviewer
  const handleReview = async () => {
    if (!content.trim()) return;
    setIsReviewing(true);
    setReviewResult('');
    try {
      // Strip HTML from content to get plain text
      const plainTextContent = stripHtmlToText(content);
      
      if (!plainTextContent.trim()) {
        setReviewResult('❌ Error: No text content found. Please ensure your note has content.');
        setIsReviewing(false);
        return;
      }
      
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
${plainTextContent}`;

      const response = await axiosInstance.post('/reviewers/ai/generate/', {
        text: detailedPrompt,
        title: (sourceTitle && sourceTitle.trim() ? `${sourceTitle.trim()} - Study Summary` : 'Study Summary'),
        source_note: sourceNoteId ?? null,
        source_notebook: sourceNotebookId ?? null,
        tags: []
      }, {
        timeout: 300000 // 5 minutes timeout for AI generation
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
    if (!content.trim()) {
      setError('No content to convert. Please add content to your note first.');
      return;
    }
    
    setIsConvertingToFlashcards(true);
    setFlashcardResult('');
    setFlashcards([]);
    setError(null);
    
    try {
      // Strip HTML from content to get plain text
      const plainTextContent = stripHtmlToText(content);
      
      if (!plainTextContent.trim()) {
        throw new Error('No text content found. Please ensure your note has readable content.');
      }
      
      // Create a deck first (same as Decks page)
      const deckTitle = sourceTitle ? `${sourceTitle} - Flashcards` : 'Note Flashcards';
      const deckResponse = await axiosInstance.post('/decks/decks/', {
        title: deckTitle
      });
      
      if (!deckResponse.data || !deckResponse.data.id) {
        throw new Error('Failed to create deck for flashcards');
      }
      
      const deckId = deckResponse.data.id;
      setCreatedDeckId(deckId);
      
      // Use the same AI endpoint as Decks page (this creates flashcards automatically)
      const aiResponse = await axiosInstance.post('/decks/ai/generate-flashcards/', {
        content: plainTextContent,
        title: deckTitle,
        strategy: 'ai_enhanced',
        deck_id: deckId
      }, {
        timeout: 120000 // 2 minutes timeout
      });
      
      if (aiResponse.data.error) {
        throw new Error(aiResponse.data.error);
      }
      
      const aiData = aiResponse.data;
      const createdFlashcards = aiData.flashcards || [];
      const flashcardCount = aiData.count || createdFlashcards.length;
      
      if (!flashcardCount || flashcardCount === 0) {
        throw new Error('No flashcards were generated. The content might be too short or unclear.');
      }
      
      // Fetch the updated deck with flashcards to show preview
      const updatedDeckResponse = await axiosInstance.get(`/decks/decks/${deckId}/`);
      if (updatedDeckResponse.data && updatedDeckResponse.data.flashcards) {
        const deckFlashcards = updatedDeckResponse.data.flashcards.map((fc: any) => ({
          front: fc.front || fc.question || 'Definition',
          back: fc.back || fc.answer || 'Term'
        }));
        setFlashcards(deckFlashcards);
      }
      
      setFlashcardResult(`✅ Successfully created ${flashcardCount} flashcards!

📚 Deck: ${deckTitle}
🎴 Flashcards: ${flashcardCount}

Click "View Deck" to see your flashcards in the Decks section.`);
      
    } catch (error: any) {
      console.error('❌ Failed to convert to flashcards:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail ||
                          error.message || 
                          'Failed to convert to flashcards. Please try again.';
      setFlashcardResult(`❌ Error: ${errorMessage}`);
      setError(errorMessage);
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

    // If user asks to stop, acknowledge and do not call backend
    if (shouldHaltChat(chatInput)) {
      setChatMessages(prev => [...prev, userMessage, { role: 'assistant', content: 'Okay.' }]);
      setChatInput('');
      return;
    }

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

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/notes/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: messages })
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
                // DO NOT update chat with any content—keep blank (or a spinner).
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: '' };
                  }
                  return newMessages;
                });
              } else if (data.done && data.full_response) {
                // Only update chat with the final, cleaned answer on completion
                const cleanFinalResponse = cleanThinkingProcess(data.full_response);
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: cleanFinalResponse };
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
                    setChunkingAnalysis(null);
                    setNotebookSummary('');
                    setReviewResult('');
                    setFlashcards([]);
                    setFlashcardResult('');
                    setGeneratedReviewerId(null);
                    setCreatedDeckId(null);
                    setCreatedNoteIds(new Set());
                    setNoteCreationStatus({});
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
                            <div className="space-y-4">
                              {chunkingAnalysis.suggested_chunks.map((chunk, index) => (
                                <div key={index} className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                                        {extractTitle(chunk.content_preview)}
                                      </h5>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {chunk.difficulty_level && (
                                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                            chunk.difficulty_level === 'advanced' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            chunk.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          }`}>
                                            {chunk.difficulty_level}
                                          </span>
                                        )}
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(chunk.priority)}`}>
                                          {chunk.priority} priority
                                        </span>
                                        <span className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                                          {chunk.estimated_length} read
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Content Preview */}
                                  <div className="mb-4">
                                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {formatContentPreview(chunk.content_preview)}
                                    </div>
                                  </div>
                                  
                                  {/* Key Concepts */}
                                  {chunk.key_concepts && chunk.key_concepts.length > 0 && (
                                    <div className="mb-4">
                                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Topics:</div>
                                      <div className="flex flex-wrap gap-2">
                                        {chunk.key_concepts.slice(0, 5).map((concept, idx) => (
                                          <span key={idx} className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
                                            {concept}
                                          </span>
                                        ))}
                                        {chunk.key_concepts.length > 5 && (
                                          <span className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                            +{chunk.key_concepts.length - 5} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Learning Objectives */}
                                  {chunk.learning_objectives && chunk.learning_objectives.length > 0 && (
                                    <div className="mb-4">
                                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What you'll learn:</div>
                                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        {chunk.learning_objectives.slice(0, 3).map((objective, idx) => (
                                          <li key={idx} className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            {objective}
                                          </li>
                                        ))}
                                        {chunk.learning_objectives.length > 3 && (
                                          <li className="text-xs text-gray-500 dark:text-gray-500">
                                            +{chunk.learning_objectives.length - 3} more objectives
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Action Button */}
                                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                                    {noteCreationStatus[index] === 'success' ? (
                                      <div className="w-full px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium flex items-center justify-center">
                                        <span className="mr-2">✓</span>
                                        Note Created!
                                      </div>
                                    ) : noteCreationStatus[index] === 'error' ? (
                                      <div className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium flex items-center justify-center">
                                        <span className="mr-2">✗</span>
                                        Failed - Try Again
                                      </div>
                                    ) : (
                                      <button 
                                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                                        onClick={() => handleCreateNoteFromChunk(chunk, index)}
                                        disabled={noteCreationStatus[index] === 'creating'}
                                      >
                                        {noteCreationStatus[index] === 'creating' ? (
                                          <span className="flex items-center justify-center">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                                            Creating Note...
                                          </span>
                                        ) : (
                                          'Create Study Note'
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Analysis Details */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl border border-blue-200 dark:border-gray-600">
                              <h5 className="font-semibold text-lg text-gray-900 dark:text-white mb-4 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                Analysis Summary
                              </h5>
                              
                              <div className="space-y-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Analysis:</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {formatContentPreview(chunkingAnalysis.reasoning)}
                                  </div>
                                </div>
                                
                                {chunkingAnalysis.study_recommendations.length > 0 && (
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Study Tips:</div>
                                    <ul className="space-y-2">
                                      {chunkingAnalysis.study_recommendations.map((rec, idx) => (
                                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                                          <span className="text-blue-500 mr-2 mt-1">•</span>
                                          {rec}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
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
                        <div className="max-h-64 overflow-y-auto space-y-3">
                          {flashcards.map((flashcard, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                Card {index + 1}
                              </div>
                              <div className="mb-3">
                                <div className="flex items-center mb-1">
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">Definition</span>
                                </div>
                                <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                  {flashcard.front}
                                </div>
                              </div>
                              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                <div className="flex items-center mb-1">
                                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">Term</span>
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-700">
                                  {flashcard.back}
                                </div>
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
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-8">
                          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Start a conversation
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                            Ask questions about your note content, get explanations, or request summaries.
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div className={`flex items-start space-x-2 max-w-[85%] ${
                              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                            }`}>
                              {/* Avatar */}
                              {message.role === 'user' ? (
                                <div className="flex-shrink-0">
                                  {(() => {
                                    const avatar = getCurrentUserAvatar();
                                    return avatar ? (
                                      <img
                                        src={avatar}
                                        alt="You"
                                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
                                        U
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-medium">
                                  AI
                                </div>
                              )}
                              
                              {/* Message bubble */}
                              <div
                                className={`rounded-2xl p-4 break-words transition-all duration-200 ${
                                message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                              } ${
                                message.role === 'assistant' && isTyping && typingMessageIndex === index
                                    ? 'shadow-lg ring-2 ring-indigo-200 dark:ring-indigo-800'
                                    : 'shadow-sm'
                              }`}
                            >
                              {message.role === 'assistant' && isTyping && typingMessageIndex === index ? (
                                <>
                                  {console.log('🎬 Rendering TypingAnimation for message', index, 'content:', message.content)}
                                  <div 
                                      className="text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ 
                                        __html: (message.content ? convertMarkdownToHTML(message.content) : '<span class="text-gray-500 italic">Thinking...</span>') + '<span class="animate-pulse text-indigo-500 ml-1">|</span>'
                                    }}
                                  />
                                </>
                              ) : (
                                <div 
                                    className="text-sm leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(message.content) }}
                                />
                              )}
                            </div>
                          </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <form onSubmit={handleChatSubmit} className="p-4">
                        <div className="relative">
                          <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleChatSubmit(e);
                              }
                            }}
                            placeholder="Type your message..."
                            className="w-full px-4 py-3 pr-16 border border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[44px] max-h-32 overflow-y-auto"
                            disabled={isLoading}
                            rows={1}
                            style={{
                              height: 'auto',
                              minHeight: '44px',
                              maxHeight: '128px'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                            }}
                          />
                          
                          {/* Send button inside the textarea */}
                          <button
                            type="submit"
                            disabled={isLoading || !chatInput.trim()}
                            className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            )}
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

      {/* AI Features Sidebar (navbar at far right - same width as main app sidebar collapsed w-14) */}
      <div className="w-14 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col items-center py-3 space-y-1">
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