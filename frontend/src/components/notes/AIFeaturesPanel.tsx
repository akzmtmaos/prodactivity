// frontend/src/components/notes/AIFeaturesPanel.tsx
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  Scissors,
  BookOpen,
  X,
  GraduationCap,
  CreditCard,
  Send,
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { API_BASE_URL } from '../../config/api';
import HeaderTooltip from '../common/HeaderTooltip';

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

// Plain text for previews: the line clamp in the JSX decides how much is shown,
// so nothing gets cut off mid-sentence here.
const plainText = (text: string): string => cleanHTMLContent(text);

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

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Markdown for the AI results. The rail is 22rem wide, so everything is set at panel
 * scale (13px body) instead of document scale, and the tailwind typography plugin is
 * not installed - these are explicit classes, not `prose`.
 */
const convertMarkdownToHTML = (text: string): string => {
  if (!text) return '';
  
  // Normalize line endings
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let tableRows: string[] = [];

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };

  const renderInline = (s: string) => {
    // Bold, italic and inline code before anything else touches the text
    s = escapeHtml(s);
    s = s.replace(/`([^`]+?)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-indigo-700 dark:bg-[#1a1a1a] dark:text-indigo-300">$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline underline-offset-2 dark:text-indigo-400">$1</a>');
    return s;
  };

  const closeTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows
      .filter((row) => !/^\|[\s:|-]+\|$/.test(row.trim()))
      .map((row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => renderInline(cell.trim())))
      .filter((cells) => cells.length);
    if (rows.length) {
      const [head, ...body] = rows;
      const headHtml = head.map((cell) => `<th class="border-b border-gray-200 px-2 py-1 font-semibold text-gray-500 dark:border-[#333333] dark:text-gray-400">${cell}</th>`).join('');
      const bodyHtml = body.map((cells) => `<tr>${cells.map((cell) => `<td class="border-b border-gray-100 px-2 py-1 align-top text-gray-700 dark:border-[#2a2a2a] dark:text-gray-300">${cell}</td>`).join('')}</tr>`).join('');
      html.push('<div class="my-2 overflow-x-auto rounded-md border border-gray-200 dark:border-[#333333]"><table class="w-full border-collapse text-left text-[11.5px]">');
      html.push(`<thead class="bg-gray-100 dark:bg-[#252525]">${headHtml}</thead>`);
      html.push(`<tbody>${bodyHtml}</tbody>`);
      html.push('</table></div>');
    }
    tableRows = [];
  };

  for (let raw of lines) {
    const line = raw.trimEnd();

    // Fenced code
    if (line.trim().startsWith('```')) {
      closeLists(); closeTable();
      if (inCode) {
        html.push('</code></pre>');
        inCode = false;
      } else {
        html.push('<pre class="my-2 overflow-x-auto rounded-md border border-gray-200 bg-gray-100 p-2.5 font-mono text-[11px] leading-relaxed text-gray-800 dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-gray-200"><code>');
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html.push(`${escapeHtml(raw)}\n`);
      continue;
    }

    // Tables gather until the block ends
    if (line.trim().startsWith('|')) {
      closeLists();
      tableRows.push(line);
      continue;
    }
    if (tableRows.length) closeTable();

    // Headings
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { closeLists(); html.push(`<h3 class="mb-1.5 mt-3 text-[13px] font-semibold text-gray-900 first:mt-0 dark:text-white">${renderInline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^##\s+(.+)/))) { closeLists(); html.push(`<h2 class="mb-1.5 mt-3 text-[14px] font-semibold text-gray-900 first:mt-0 dark:text-white">${renderInline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^#\s+(.+)/)))  { closeLists(); html.push(`<h1 class="mb-2 mt-3 text-[15px] font-semibold text-gray-900 first:mt-0 dark:text-white">${renderInline(m[1])}</h1>`); continue; }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closeLists();
      html.push('<hr class="my-3 border-gray-200 dark:border-[#333333]">');
      continue;
    }

    // Blockquote
    if ((m = line.match(/^>\s?(.*)/))) {
      closeLists();
      html.push(`<blockquote class="my-2 border-l-2 border-gray-200 pl-2.5 text-[13px] italic text-gray-600 dark:border-[#3f3f3f] dark:text-gray-400">${renderInline(m[1])}</blockquote>`);
      continue;
    }

    // Ordered list
    if ((m = line.match(/^\s{0,3}(\d+)\.\s+(.+)/))) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (!inOl) { html.push('<ol class="mb-2 ml-4 list-decimal space-y-0.5 text-[13px] marker:text-gray-400">'); inOl = true; }
      html.push(`<li>${renderInline(m[2])}</li>`);
      continue;
    }

    // Unordered list
    if ((m = line.match(/^\s{0,3}[-*+]\s+(.+)/))) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (!inUl) { html.push('<ul class="mb-2 ml-4 list-disc space-y-0.5 text-[13px] marker:text-gray-400">'); inUl = true; }
      html.push(`<li>${renderInline(m[1])}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      closeLists();
      continue;
    }

    // Paragraph - inherit text color from parent
    closeLists();
    html.push(`<p class="mb-1.5 text-[13px] leading-relaxed last:mb-0">${renderInline(line)}</p>`);
  }

  closeLists();
  closeTable();
  if (inCode) html.push('</code></pre>');
  return html.join('');
};

/** Shared button, surface and skeleton language for every feature panel. */
const PANEL_BUTTON =
  'flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45';
const PANEL_BUTTON_QUIET =
  'flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#333333] dark:text-gray-200 dark:hover:bg-[#2f2f2f]';
const PANEL_SURFACE = 'rounded-md border border-gray-200 bg-gray-50 dark:border-[#333333] dark:bg-[#252525]';
/** Starter questions for the empty chat panel. */
const CHAT_PROMPTS = [
  'Summarize this note in a few lines',
  'Explain the key ideas in simple terms',
  'Ask me a question about this note',
];

/** Priority dot colours, matching the task surfaces. */
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
};
const PANEL_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

const PanelIntro: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{children}</p>
);

const PanelSkeleton: React.FC<{ lines?: number }> = ({ lines = 4 }) => (
  <div className="animate-pulse space-y-2">
    {Array.from({ length: lines }).map((_, index) => (
      <div
        key={index}
        className="h-3 rounded bg-gray-200 dark:bg-[#333333]"
        style={{ width: index === lines - 1 ? '70%' : '100%' }}
      />
    ))}
  </div>
);

/** Small inline spinner for buttons that are working. */
const PanelSpinner = () => (
  <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70" />
);

/** Quiet placeholder for a feature that hasn't produced anything yet. */
const EmptyHint: React.FC<{ icon?: React.ComponentType<{ size?: number; className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <div className={`${PANEL_SURFACE} flex items-start gap-2 px-3 py-2.5`}>
    {Icon && <Icon size={13} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />}
    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{text}</p>
  </div>
);

/** Rendered AI result, in the rail's own type scale. */
const MarkdownResult: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div
    className={`text-gray-700 dark:text-gray-300 ${className}`}
    dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(text) }}
  />
);

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
  const chatInputRef = React.useRef<HTMLTextAreaElement | null>(null);


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

  // Reset chat textarea height and scrollbar when input is cleared (e.g. after send)
  useEffect(() => {
    if (chatInput === '' && chatInputRef.current) {
      const el = chatInputRef.current;
      el.style.height = 'auto';
      el.style.overflowY = 'hidden';
    }
  }, [chatInput]);

  const handleFeatureClick = (featureId: string) => {
    // Clicking the feature that is already open closes its panel again.
    if (activeFeature === featureId) {
      closePanel();
      return;
    }
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

  /** Sends one message. The composer and the starter chips both come through here. */
  const sendChat = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    const userMessage = { role: 'user' as const, content: text };

    // If user asks to stop, acknowledge and do not call backend
    if (shouldHaltChat(text)) {
      setChatMessages(prev => [...prev, userMessage, { role: 'assistant', content: 'Okay.' }]);
      return;
    }

    setChatMessages(prev => [...prev, userMessage]);
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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    sendChat(text);
  };

  /** Closes the results panel and clears whatever the last feature produced. */
  const closePanel = () => {
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

  const activeFeatureMeta = features.find((feature) => feature.id === activeFeature);

  return (
    <>
      {/* AI Feature Results Panel (left of navbar) */}
      {activeFeature && (
        <div
          className={`w-[22rem] max-w-[85vw] h-full border-l border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#191919] transition-all duration-200 ease-out will-change-transform ${panelVisible ? 'opacity-100 -translate-x-0' : 'opacity-0 -translate-x-4'}`}
        >
          <div className="h-full flex flex-col">
            <div className="flex h-11 flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 dark:border-[#2f2f2f]">
              <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-gray-900 dark:text-white">
                {activeFeatureMeta && <activeFeatureMeta.icon size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />}
                <span className="truncate">{activeFeatureMeta ? activeFeatureMeta.label : 'AI Features'}</span>
              </h2>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {activeFeature === 'chat' && chatMessages.length > 0 && (
                  <HeaderTooltip label="Clear chat" fixed>
                    <button
                      onClick={() => {
                        setChatMessages([]);
                        setChatInput('');
                        setIsTyping(false);
                        setTypingMessageIndex(null);
                      }}
                      className="h-7 rounded-md border border-gray-200 px-2 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#333333] dark:text-gray-300 dark:hover:bg-[#2f2f2f]"
                      aria-label="Clear chat"
                    >
                      Clear
                    </button>
                  </HeaderTooltip>
                )}
                <HeaderTooltip label="Close panel" fixed>
                <button
                  onClick={closePanel}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white"
                  aria-label="Close AI panel"
                >
                  <X size={15} />
                </button>
                </HeaderTooltip>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {activeFeature === 'summary' && (
                  <div className="space-y-2.5 p-3">
                    <PanelIntro>
                      Condenses this note into the points worth keeping. Inserting it replaces the note's content.
                    </PanelIntro>

                    <button
                      onClick={handleSummarize}
                      disabled={!content.trim() || isLoading}
                      className={PANEL_BUTTON}
                    >
                      {isLoading ? <PanelSpinner /> : <Brain size={13} />}
                      {isLoading ? 'Summarizing…' : summaryResult ? 'Summarize again' : 'Summarize note'}
                    </button>

                    {isLoading && !summaryResult ? (
                      <div className={`${PANEL_SURFACE} p-3`}>
                        <PanelSkeleton lines={5} />
                      </div>
                    ) : summaryResult ? (
                      <div className={`${PANEL_SURFACE} max-h-80 overflow-y-auto p-3`}>
                        <MarkdownResult text={summaryResult} />
                      </div>
                    ) : (
                      <EmptyHint icon={FileText} text="The summary appears here once it has been written." />
                    )}

                    {summaryResult && (
                      <HeaderTooltip label="Replaces the note's content with this summary" fixed>
                        <button onClick={handleApplySummary} className={PANEL_BUTTON_QUIET}>
                          <Check size={12} />
                          Insert into note
                        </button>
                      </HeaderTooltip>
                    )}
                  </div>
                )}

                {activeFeature === 'notebook-summary' && (
                  <div className="space-y-2.5 p-3">
                    <PanelIntro>
                      Reads every note in this notebook, not just the one you have open.
                    </PanelIntro>

                    <button
                      onClick={handleNotebookSummarize}
                      disabled={!sourceNotebookId || isLoading}
                      className={PANEL_BUTTON}
                    >
                      {isLoading ? <PanelSpinner /> : <BookOpen size={13} />}
                      {isLoading ? 'Reading the notebook…' : notebookSummary ? 'Summarize again' : 'Summarize notebook'}
                    </button>

                    {isLoading && !notebookSummary ? (
                      <div className={`${PANEL_SURFACE} p-3`}>
                        <PanelSkeleton lines={5} />
                      </div>
                    ) : notebookSummary ? (
                      <div className={`${PANEL_SURFACE} max-h-80 overflow-y-auto p-3`}>
                        <MarkdownResult text={notebookSummary} />
                      </div>
                    ) : (
                      <EmptyHint icon={BookOpen} text="A notebook-wide summary appears here once it has been written." />
                    )}
                  </div>
                )}


                {activeFeature === 'chunking' && (
                  <div className="space-y-2.5 p-3">
                    <PanelIntro>
                      Suggests how to split this note into focused study notes — one idea per note.
                    </PanelIntro>

                    <button
                      onClick={handleSmartChunking}
                      disabled={!content.trim() || isLoading}
                      className={PANEL_BUTTON}
                    >
                      {isLoading ? <PanelSpinner /> : <Scissors size={13} />}
                      {isLoading ? 'Reading the note…' : chunkingAnalysis ? 'Analyze again' : 'Analyze chunking'}
                    </button>

                    {isLoading && !chunkingAnalysis ? (
                      <div className={`${PANEL_SURFACE} p-3`}>
                        <PanelSkeleton lines={6} />
                      </div>
                    ) : chunkingAnalysis ? (
                      <div className="space-y-2.5">
                        {/* One summary line, instead of two stacked analysis boxes saying the same thing */}
                        <div className={`${PANEL_SURFACE} px-3 py-2.5`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {chunkingAnalysis.total_notes_suggested}
                              </span>{' '}
                              focused note{chunkingAnalysis.total_notes_suggested === 1 ? '' : 's'}
                              {chunkingAnalysis.chunking_strategy ? ` · ${chunkingAnalysis.chunking_strategy} split` : ''}
                              {chunkingAnalysis.estimated_study_time ? ` · ~${chunkingAnalysis.estimated_study_time}` : ''}
                            </p>
                            {chunkingAnalysis.content_complexity && (
                              <span className="flex-shrink-0 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-600 dark:border-[#333333] dark:text-gray-300">
                                {chunkingAnalysis.content_complexity}
                              </span>
                            )}
                          </div>
                        </div>

                        {chunkingAnalysis.suggested_chunks.map((chunk, index) => (
                          <article key={index} className="rounded-md border border-gray-200 p-3 dark:border-[#333333]">
                            <h5 className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 dark:text-white">
                              {chunk.title || extractTitle(chunk.content_preview)}
                            </h5>

                            <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1.5 capitalize">
                                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[chunk.priority] || 'bg-gray-400'}`} />
                                {chunk.priority}
                              </span>
                              {chunk.difficulty_level && <span className="capitalize">{chunk.difficulty_level}</span>}
                              <span>{chunk.estimated_length} read</span>
                            </div>

                            <p className="line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                              {plainText(chunk.content_preview)}
                            </p>

                            {chunk.key_concepts && chunk.key_concepts.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {chunk.key_concepts.slice(0, 4).map((concept, idx) => (
                                  <span key={idx} className="rounded border border-gray-200 px-1.5 py-0.5 text-[10.5px] text-gray-600 dark:border-[#333333] dark:text-gray-300">
                                    {concept}
                                  </span>
                                ))}
                                {chunk.key_concepts.length > 4 && (
                                  <span className="px-1 py-0.5 text-[10.5px] text-gray-400 dark:text-gray-500">
                                    +{chunk.key_concepts.length - 4}
                                  </span>
                                )}
                              </div>
                            )}

                            {chunk.learning_objectives && chunk.learning_objectives.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {chunk.learning_objectives.slice(0, 2).map((objective, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                                    <Check size={11} className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    {objective}
                                  </li>
                                ))}
                                {chunk.learning_objectives.length > 2 && (
                                  <li className="text-[10.5px] text-gray-400 dark:text-gray-500">
                                    +{chunk.learning_objectives.length - 2} more objectives
                                  </li>
                                )}
                              </ul>
                            )}

                            <div className="mt-2.5">
                              {noteCreationStatus[index] === 'success' ? (
                                <div className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
                                  <Check size={12} />
                                  Note created
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCreateNoteFromChunk(chunk, index)}
                                  disabled={noteCreationStatus[index] === 'creating'}
                                  className={PANEL_BUTTON_QUIET}
                                >
                                  {noteCreationStatus[index] === 'creating' ? <PanelSpinner /> : <FileText size={12} />}
                                  {noteCreationStatus[index] === 'creating'
                                    ? 'Creating note…'
                                    : noteCreationStatus[index] === 'error'
                                      ? "Couldn't create it — try again"
                                      : 'Create study note'}
                                </button>
                              )}
                            </div>
                          </article>
                        ))}

                        {(chunkingAnalysis.reasoning || chunkingAnalysis.study_recommendations.length > 0) && (
                          <section className={`${PANEL_SURFACE} px-3 py-2.5`}>
                            <h4 className={`${PANEL_LABEL} mb-1.5`}>Why this split</h4>
                            {chunkingAnalysis.reasoning && (
                              <p className="line-clamp-4 text-[11.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                                {plainText(chunkingAnalysis.reasoning)}
                              </p>
                            )}
                            {chunkingAnalysis.study_recommendations.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {chunkingAnalysis.study_recommendations.slice(0, 3).map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-gray-600 dark:text-gray-400">
                                    <Sparkles size={11} className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </section>
                        )}
                      </div>
                    ) : (
                      <EmptyHint icon={Scissors} text="Suggestions appear here once the note has been analyzed." />
                    )}
                  </div>
                )}

                {activeFeature === 'review' && (
                  <div className="space-y-2.5 p-3">
                    <PanelIntro>
                      Turns this note into a study reviewer you can come back to before an exam.
                    </PanelIntro>

                    <button
                      onClick={handleReview}
                      disabled={!content.trim() || isReviewing}
                      className={PANEL_BUTTON}
                    >
                      {isReviewing ? <PanelSpinner /> : <GraduationCap size={13} />}
                      {isReviewing ? 'Reviewing…' : reviewResult ? 'Review again' : 'Generate review'}
                    </button>

                    {isReviewing && !reviewResult ? (
                      <div className={`${PANEL_SURFACE} p-3`}>
                        <PanelSkeleton lines={5} />
                      </div>
                    ) : reviewResult ? (
                      <div className="space-y-2.5">
                        <div className={`${PANEL_SURFACE} max-h-72 overflow-y-auto p-3`}>
                          <MarkdownResult text={reviewResult} />
                        </div>
                        {generatedReviewerId && (
                          <button onClick={handleViewFullReview} className={PANEL_BUTTON_QUIET}>
                            Open in Reviewer
                          </button>
                        )}
                      </div>
                    ) : (
                      <EmptyHint icon={GraduationCap} text="Your reviewer appears here once it has been generated." />
                    )}
                  </div>
                )}

                {activeFeature === 'flashcards' && (
                  <div className="space-y-2.5 p-3">
                    <PanelIntro>
                      Builds a flashcard deck from this note's content.
                    </PanelIntro>

                    <button
                      onClick={handleConvertToFlashcards}
                      disabled={!content.trim() || isConvertingToFlashcards}
                      className={PANEL_BUTTON}
                    >
                      {isConvertingToFlashcards ? <PanelSpinner /> : <CreditCard size={13} />}
                      {isConvertingToFlashcards ? 'Building the deck…' : 'Convert to flashcards'}
                    </button>

                    {isConvertingToFlashcards && flashcards.length === 0 && (
                      <div className={`${PANEL_SURFACE} p-3`}>
                        <PanelSkeleton lines={4} />
                      </div>
                    )}

                    {!isConvertingToFlashcards && !createdDeckId && !flashcardResult && flashcards.length === 0 && (
                      <EmptyHint icon={CreditCard} text="A preview of the generated cards appears here." />
                    )}

                    {createdDeckId && flashcards.length > 0 && (
                      <div className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <Check size={12} />
                        {flashcards.length} card{flashcards.length === 1 ? '' : 's'} created
                      </div>
                    )}

                    {flashcards.length > 0 && (
                      <div className="space-y-2">
                        <h3 className={PANEL_LABEL}>Preview · {flashcards.length} cards</h3>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {flashcards.map((flashcard, index) => (
                            <div key={index} className="rounded-md border border-gray-200 p-2.5 dark:border-[#333333]">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                  Card {index + 1}
                                </span>
                              </div>
                              <div className="mb-2">
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Front</div>
                                <div className="text-xs leading-relaxed text-gray-800 dark:text-gray-200">{flashcard.front}</div>
                              </div>
                              <div className="border-t border-gray-100 pt-2 dark:border-[#2a2a2a]">
                                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Back</div>
                                <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">{flashcard.back}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {flashcardResult && !createdDeckId && (
                      <div className={`${PANEL_SURFACE} max-h-64 overflow-y-auto p-3`}>
                        <MarkdownResult text={flashcardResult} />
                      </div>
                    )}

                    {createdDeckId && (
                      <button onClick={handleViewDeck} className={PANEL_BUTTON_QUIET}>
                        Open the deck
                      </button>
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
                        <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#252525]">
                            <MessageSquare size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <h3 className="mb-1 text-[13px] font-semibold text-gray-900 dark:text-white">
                            Chat with this note
                          </h3>
                          <p className="mb-3 max-w-[16rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                            Answers come from this note, so questions about its content work best.
                          </p>
                          <div className="flex w-full max-w-[17rem] flex-col gap-1.5">
                            {CHAT_PROMPTS.map((prompt) => (
                              <button
                                key={prompt}
                                onClick={() => sendChat(prompt)}
                                disabled={isLoading}
                                className="flex items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-left text-[11.5px] text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-45 dark:border-[#333333] dark:text-gray-300 dark:hover:bg-[#2f2f2f]"
                              >
                                <Sparkles size={11} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                {prompt}
                              </button>
                            ))}
                          </div>
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
                                        className="h-6 w-6 rounded-md object-cover border border-gray-200 dark:border-[#333333]"
                                      />
                                    ) : (
                                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-semibold text-white">
                                        U
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-semibold text-gray-600 dark:bg-[#2f2f2f] dark:text-gray-300">
                                  AI
                                </div>
                              )}
                              
                              {/* Message bubble: same scale as profile circle (w-8/h-8), light inner, dark border */}
                              <div
                                className={`max-w-full break-words rounded-lg border px-2.5 py-1.5 transition-colors ${
                                  message.role === 'user'
                                    ? 'border-transparent bg-indigo-600 text-white'
                                    : 'border-gray-200 bg-gray-50 text-gray-900 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-100'
                                } ${
                                  message.role === 'assistant' && isTyping && typingMessageIndex === index
                                    ? 'ring-1 ring-indigo-300 dark:ring-indigo-500/50'
                                    : ''
                                }`}
                            >
                              {message.role === 'assistant' && isTyping && typingMessageIndex === index ? (
                                <>
                                  <div 
                                      className="text-xs leading-relaxed [&_p:last-child]:mb-0 [&_*:last-child]:mb-0"
                                    dangerouslySetInnerHTML={{ 
                                        __html: (message.content ? convertMarkdownToHTML(message.content) : '<span class="text-gray-500 italic">Thinking...</span>') + '<span class="animate-pulse text-indigo-500 ml-1">|</span>'
                                    }}
                                  />
                                </>
                              ) : (
                                <div 
                                    className="text-xs leading-relaxed [&_p:last-child]:mb-0 [&_*:last-child]:mb-0"
                                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(message.content) }}
                                />
                              )}
                            </div>
                          </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#191919]">
                      <form onSubmit={handleChatSubmit} className="flex items-end gap-1.5 p-2">
                        <textarea
                          ref={chatInputRef}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSubmit(e);
                            }
                          }}
                          placeholder="Ask about this note…"
                          className="min-w-0 flex-1 resize-none rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-[#333333] dark:bg-[#252525] dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-[#404040] min-h-7 max-h-24 overflow-y-hidden"
                          disabled={isLoading}
                          rows={1}
                          style={{
                            height: 'auto',
                            minHeight: '28px',
                            maxHeight: '96px'
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            const newHeight = Math.min(target.scrollHeight, 96);
                            target.style.height = newHeight + 'px';
                            target.style.overflowY = newHeight >= 96 ? 'auto' : 'hidden';
                          }}
                        />
                        <HeaderTooltip label="Send" side="left" fixed>
                          <button
                            type="submit"
                            aria-label="Send message"
                            disabled={!chatInput.trim() || isLoading}
                            className="mb-px flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-900 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                          >
                            <Send size={13} />
                          </button>
                        </HeaderTooltip>
                      </form>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-3">
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 dark:border-red-900/60 dark:bg-red-900/20">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] leading-relaxed text-red-700 dark:text-red-300">{error}</p>
                        <button
                          onClick={() => setError(null)}
                          className="mt-1 text-[11px] font-medium text-red-800 underline underline-offset-2 hover:text-red-900 dark:text-red-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI features rail — quiet Notion-style icon column at the far right */}
      <div className="flex w-12 flex-shrink-0 flex-col items-center gap-0.5 border-l border-gray-200 bg-white py-2 dark:border-[#2f2f2f] dark:bg-[#191919]">
        {features.filter(f => f.show).map((feature) => (
          <React.Fragment key={feature.id}>
            {/* Chat is a conversation, not a one-shot tool: keep it visually separate */}
            {feature.id === 'chat' && <span className="my-1 h-px w-5 bg-gray-200 dark:bg-[#333333]" />}
            <HeaderTooltip label={feature.label} side="left" fixed>
              <button
                onClick={feature.action}
                disabled={isLoading}
                aria-label={feature.label}
                aria-pressed={activeFeature === feature.id}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeFeature === feature.id
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white'
                }`}
              >
                <feature.icon size={17} />
              </button>
            </HeaderTooltip>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default AIFeaturesPanel; 