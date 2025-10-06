// frontend/src/components/notes/NoteEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  FileUp,
  Download,
  X,
  FileText,
  FileDown,
  Table,
  Settings,
  Image
} from 'lucide-react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import ImportModal from '../../components/common/ImportModal';
import Toast from '../../components/common/Toast';
import AIFeaturesPanel from './AIFeaturesPanel';
import TextFormatting from './TextFormatting';
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';
import FloatingToolbar from './FloatingToolbar';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
  notebook_type: string;
  notebook_urgency: string;
  note_type: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_urgent: boolean;
  tags: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface NoteEditorProps {
  note: Note | null;
  isNewNote: boolean;
  onSave: (title: string, content: string, priority: 'low' | 'medium' | 'high' | 'urgent', closeAfterSave?: boolean) => void;
  onDelete: (noteId: number) => void;
  onBack: () => void;
  isSaving?: boolean;
}

const AUTO_SAVE_DELAY = 2000; // 2 seconds delay for auto-save

// Function to convert markdown to HTML
const convertMarkdownToHTML = (text: string): string => {
  if (!text) return '';
  
  return text
    // Convert ### headings to h3
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-black dark:text-white mb-2 mt-4">$1</h3>')
    // Convert ## headings to h2
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-black dark:text-white mb-3 mt-5">$1</h2>')
    // Convert # headings to h1
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-black dark:text-white mb-4 mt-6">$1</h1>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Convert numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$1. $2</li>')
    // Convert bullet points
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
    // Convert horizontal rules (3 or more dashes on their own line)
    .replace(/^-{3,}$/gm, '<hr class="my-4 border-gray-300 dark:border-gray-600">')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>');
};

// Function to convert HTML back to markdown for storage
const convertHTMLToMarkdown = (html: string): string => {
  if (!html) return '';
  
  return html
    // Convert h3 back to ###
    .replace(/<h3[^>]*>(.+?)<\/h3>/g, '### $1')
    // Convert h2 back to ##
    .replace(/<h2[^>]*>(.+?)<\/h2>/g, '## $1')
    // Convert h1 back to #
    .replace(/<h1[^>]*>(.+?)<\/h1>/g, '# $1')
    // Convert <strong> back to **
    .replace(/<strong[^>]*>(.+?)<\/strong>/g, '**$1**')
    // Convert <em> back to *
    .replace(/<em[^>]*>(.+?)<\/em>/g, '*$1*')
    // Convert <hr> back to dashes
    .replace(/<hr[^>]*>/g, '\n---\n')
    // Convert <br> back to \n
    .replace(/<br\s*\/?>/g, '\n')
    // Remove other HTML tags
    .replace(/<[^>]*>/g, '');
};

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Blue', value: '#90caf9' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Orange', value: '#ffb74d' },
  { name: 'Purple', value: '#ce93d8' },
  { name: 'Red', value: '#ef9a9a' },
  { name: 'Light Blue', value: '#81d4fa' },
  { name: 'Light Green', value: '#c8e6c9' },
  { name: 'Light Yellow', value: '#fff9c4' }
];

// Function to convert plain text to HTML with formatting detection
const convertTextToHtml = (text: string): string => {
  const lines = text.split('\n');
  const htmlLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push('<br>');
      continue;
    }
    
    // Detect bullet points (various formats)
    if (line.match(/^[\•\*\-\+]\s/) || line.match(/^\d+\.\s/)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      const listItem = line.replace(/^[\•\*\-\+]\s/, '').replace(/^\d+\.\s/, '');
      htmlLines.push(`<li>${listItem}</li>`);
    }
    // Detect table-like content (lines with multiple spaces or tabs)
    else if (line.includes('\t') || (line.split(/\s{2,}/).length > 2)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      // Convert tab-separated or space-separated content to table
      const cells = line.split(/\t|\s{2,}/).filter(cell => cell.trim());
      if (cells.length > 1) {
        htmlLines.push('<table class="notion-table"><tr>');
        cells.forEach(cell => {
          htmlLines.push(`<td>${cell.trim()}</td>`);
        });
        htmlLines.push('</tr></table>');
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    }
    // Regular paragraph
    else {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<p>${line}</p>`);
    }
  }
  
  if (inList) {
    htmlLines.push('</ul>');
  }
  
  return htmlLines.join('\n');
};

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isNewNote,
  onSave,
  onDelete,
  onBack,
  isSaving = false,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(note?.priority || 'medium');
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isAutoSaving = useRef<boolean>(false);
  const contentRef = useRef<string>('');
  const lastAutoSaveTime = useRef<number>(0);
  const isUpdatingFromAutosave = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.56.1:8000/api';
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Export functionality state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'doc'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Floating toolbar state
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  // Simple contentEditable ref
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Simple markdown conversion function
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
      // Convert bullet lists
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
      // Convert line breaks
      .replace(/\n/g, '<br>');
  };
  
  // Save and restore cursor position to prevent jumping
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  };

  const restoreCursorPosition = (range: Range | null) => {
    if (range && contentEditableRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        contentEditableRef.current.focus();
      }
    }
  };

  // Export functionality
  const handleExportNote = async (format: 'pdf' | 'doc') => {
    if (!note) return;
    
    setIsExporting(true);
    try {
      const response = await axios.post(`/api/notes/export/`, {
        note_id: note.id,
        format: format
      }, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format and note title
      const timestamp = new Date().toISOString().split('T')[0];
      const title = note.title.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${title}_${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export note. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Add state for tracking active formatting
  const [activeFormatting, setActiveFormatting] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    blockquote: boolean;
    highlight: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    blockquote: false,
    highlight: false
  });

  const [pageView, setPageView] = useState<boolean>(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState<{ top: number; right: number; bottom: number; left: number }>({ top: 24, right: 24, bottom: 24, left: 24 });

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // If no token is found, redirect to login
      window.location.href = '/login';
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // COMPLETELY DISABLED: This useEffect was causing content to disappear after autosave
  // The editor now works purely from DOM, no React state interference
  // useEffect(() => {
  //   if (note) {
  //     console.log('Note loaded:', note);
  //     
  //     // CRITICAL FIX: If the editor has content, NEVER overwrite it to prevent disappearing
  //     if (contentEditableRef.current && contentEditableRef.current.innerHTML.trim()) {
  //       console.log('Editor has content, preserving it to prevent disappearing');
  //       // Only update title and priority, never touch content
  //       setTitle(note.title || '');
  //       setPriority(note.priority || 'medium');
  //       setHasChanges(false);
  //       return;
  //     }
  //     
  //     // CRITICAL FIX: For new notes, COMPLETELY skip this useEffect to prevent any interference
  //     if (isNewNote) {
  //       console.log('New note detected, completely skipping useEffect to preserve editor content');
  //       return;
  //     }
  //     
  //     // CRITICAL FIX: Don't update content if we're in the middle of an autosave update
  //     if (isUpdatingFromAutosave.current) {
  //       console.log('Autosave update in progress, preserving editor content');
  //       // Still update title and priority, but preserve content
  //       setTitle(note.title || '');
  //       setPriority(note.priority || 'medium');
  //       setHasChanges(false);
  //       // Don't update content state to preserve what's in the editor
  //       return;
  //     }
  //     
  //     setTitle(note.title || '');
  //     setPriority(note.priority || 'medium');
  //     setHasChanges(false);
  //     
  //     // Only update content state for existing notes that are being loaded fresh
  //     const noteContent = note.content || '';
  //     contentRef.current = noteContent;
  //     setContent(noteContent);
  //     
  //     // Update last_visited timestamp when note is loaded
  //     const updateLastVisited = async () => {
  //       try {
  //         console.log('Updating last_visited for note:', note.id);
  //         const response = await axios.patch(`${API_URL}/notes/${note.id}/`, {
  //           last_visited: new Date().toISOString()
  //         }, {
  //           headers: getAuthHeaders()
  //         });
  //         console.log('Visit update response:', response.data);
  //         
  //         // Dispatch event to notify that a note has been updated
  //         window.dispatchEvent(new Event('noteUpdated'));
  //       } catch (error) {
  //         console.error('Failed to update note visit timestamp:', error);
  //         if (axios.isAxiosError(error)) {
  //           console.error('Error details:', {
  //             status: error.response?.status,
  //             data: error.response?.data,
  //             headers: error.response?.headers
  //           });
  //         }
  //       }
  //     };
  //     
  //     updateLastVisited();
  //   }
  // }, [note, isNewNote]);

  // COMPLETELY DISABLED: No title/priority updates to prevent any re-renders
  // useEffect(() => {
  //   if (note) {
  //     console.log('Updating title and priority for note:', note.title, note.priority);
  //     setTitle(note.title || '');
  //     setPriority(note.priority || 'medium');
  //     setHasChanges(false);
  //   }
  // }, [note?.title, note?.priority]);

  // COMPLETELY DISABLED: No content state updates at all
  // useEffect(() => {
  //   if (note && isNewNote) {
  //     console.log('New note detected - NEVER updating content state to prevent disappearing');
  //     // Don't call setContent at all for new notes
  //     return;
  //   }
  // }, [note?.content, isNewNote]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setHasChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  // Text selection and floating toolbar functions
  const handleTextSelection = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Use a small delay to ensure the selection is properly updated
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowFloatingToolbar(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        // Get the bounding rectangle of the selection
        const rect = range.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        setSelectedText(selectedText);
        setToolbarPosition({
          x: rect.left + scrollLeft + (rect.width / 2),
          y: rect.top + scrollTop
        });
        setShowFloatingToolbar(true);
      } else {
        setShowFloatingToolbar(false);
      }
    }, 10);
  };

  const handleFloatingToolbarFormat = (command: string, value?: string) => {
    if (!contentEditableRef.current) return;

    // Restore focus to the contentEditable div
    contentEditableRef.current.focus();
    
    // Execute the formatting command
    document.execCommand(command, false, value);
    
    // Mark as having changes
    setHasChanges(true);
    
    // Don't hide the toolbar - let it stay visible while text is selected
  };

  const handleCloseFloatingToolbar = () => {
    setShowFloatingToolbar(false);
  };

  // Close floating toolbar when clicking outside or when selection changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFloatingToolbar && !(event.target as Element).closest('.floating-toolbar')) {
        setShowFloatingToolbar(false);
      }
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
        setShowFloatingToolbar(false);
      }
    };

    if (showFloatingToolbar) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }
  }, [showFloatingToolbar]);

  const handleSave = () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    // Set flag to prevent content state updates during save
    isAutoSaving.current = true;
    
    // Save cursor position before any operations
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const cursorPosition = range ? {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    } : null;
    
    // Get current content from DOM instead of state to ensure we have the latest content
    const currentContent = contentEditableRef.current?.innerHTML || contentRef.current;
    
    // Update content ref but NEVER update state to prevent re-renders that cause text to disappear
    contentRef.current = currentContent;
    // NEVER call setContent to prevent content disappearing - editor works purely from DOM
    
    // Set flag to indicate we're updating from autosave
    isUpdatingFromAutosave.current = true;
    
    // Save the content
    onSave(title.trim() || 'Untitled Note', currentContent, priority);
    setHasChanges(false);
    setLastSaved(new Date());
    
    // Record the time of autosave
    lastAutoSaveTime.current = Date.now();
    
    // Restore cursor position immediately after save
    if (cursorPosition && selection) {
      // Use requestAnimationFrame to ensure DOM is stable
      requestAnimationFrame(() => {
        try {
          const newRange = document.createRange();
          newRange.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
          newRange.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (error) {
          // If cursor restoration fails, try to place it at the end
          if (contentEditableRef.current) {
            const newRange = document.createRange();
            newRange.selectNodeContents(contentEditableRef.current);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        
        // Clear the autosave flag after cursor restoration
        isAutoSaving.current = false;
        // Clear the autosave update flag after a short delay
        setTimeout(() => {
          isUpdatingFromAutosave.current = false;
        }, 100);
      });
    } else {
      // Clear the autosave flag if no cursor to restore
      isAutoSaving.current = false;
      // Clear the autosave update flag after a short delay
      setTimeout(() => {
        isUpdatingFromAutosave.current = false;
      }, 100);
    }
    
    // Dispatch event to notify that a note has been updated
    window.dispatchEvent(new Event('noteUpdated'));
  };

  // REMOVED: debouncedContentUpdate function that was causing cursor jumping
  // Content state will be updated only when needed for saving

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
    }, AUTO_SAVE_DELAY);
  }, [title, priority, hasChanges, handleSave]);

  // Auto-save when title, priority, or hasChanges changes
  useEffect(() => {
    if (hasChanges) {
      debouncedSave();
    }
  }, [title, priority, hasChanges, debouncedSave]);

  // Maintain focus and cursor position when content changes
  useEffect(() => {
    if (contentEditableRef.current && document.activeElement !== contentEditableRef.current) {
      // Only restore focus if the editor doesn't already have focus
      const savedRange = saveCursorPosition();
      if (savedRange) {
        setTimeout(() => {
          restoreCursorPosition(savedRange);
        }, 0);
      }
    }
  }, [content]);

  // Focus the editor when it first loads
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized) {
      contentEditableRef.current.focus();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Simple table creation (matching import feature style)
  const createSimpleTable = (rows: number = 3, cols: number = 3) => {
    const table = document.createElement('table');
    table.className = 'notion-table';
    
    // Create simple table structure like import feature
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.innerHTML = '&nbsp;';
        td.style.cursor = 'text';
        td.setAttribute('data-row', i.toString());
        td.setAttribute('data-col', j.toString());
        
        // Add keyboard navigation
        addSimpleCellNavigation(td, table);
        
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    
    return table;
  };

  // Simple cell navigation for arrow keys
  const addSimpleCellNavigation = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
    cell.addEventListener('keydown', (e) => {
      const currentRow = parseInt(cell.getAttribute('data-row') || '0');
      const currentCol = parseInt(cell.getAttribute('data-col') || '0');
      const totalRows = table.rows.length;
      const totalCols = table.rows[0]?.cells.length || 0;
      
      let targetCell: HTMLTableCellElement | null = null;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentRow < totalRows - 1) {
            targetCell = table.rows[currentRow + 1]?.cells[currentCol] as HTMLTableCellElement;
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentRow > 0) {
            targetCell = table.rows[currentRow - 1]?.cells[currentCol] as HTMLTableCellElement;
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentCol < totalCols - 1) {
            targetCell = table.rows[currentRow]?.cells[currentCol + 1] as HTMLTableCellElement;
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentCol > 0) {
            targetCell = table.rows[currentRow]?.cells[currentCol - 1] as HTMLTableCellElement;
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab: Move to previous cell
            if (currentCol > 0) {
              targetCell = table.rows[currentRow]?.cells[currentCol - 1] as HTMLTableCellElement;
            } else if (currentRow > 0) {
              targetCell = table.rows[currentRow - 1]?.cells[totalCols - 1] as HTMLTableCellElement;
            }
          } else {
            // Tab: Move to next cell
            if (currentCol < totalCols - 1) {
              targetCell = table.rows[currentRow]?.cells[currentCol + 1] as HTMLTableCellElement;
            } else if (currentRow < totalRows - 1) {
              targetCell = table.rows[currentRow + 1]?.cells[0] as HTMLTableCellElement;
            }
          }
          break;
      }
      
      if (targetCell) {
        targetCell.focus();
        // Move cursor to end of content
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(targetCell);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  };

  // Enhanced Notion-style Table functionality (keeping for compatibility)
  const createTable = (rows: number = 3, cols: number = 3) => {
    const table = document.createElement('table');
    table.className = 'notion-table';
    table.setAttribute('data-rows', rows.toString());
    table.setAttribute('data-cols', cols.toString());
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const th = document.createElement('th');
      th.contentEditable = 'true';
      th.textContent = `Column ${i + 1}`;
      th.className = 'notion-table-header';
      th.setAttribute('data-column', i.toString());
      th.style.cursor = 'text';
      
      // Add placeholder for empty headers
      th.addEventListener('blur', () => {
        if (!th.textContent?.trim()) {
          th.textContent = `Column ${i + 1}`;
        }
      });
      
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    for (let i = 0; i < rows - 1; i++) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row', i.toString());
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.innerHTML = '&nbsp;'; // Add non-breaking space for proper height
        td.className = 'notion-table-cell';
        td.setAttribute('data-column', j.toString());
        td.setAttribute('data-row', i.toString());
        td.style.cursor = 'text';
        
        // Add cell selection and navigation
        addCellNavigation(td, table);
        
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    
    return table;
  };

  // Add cell navigation (Tab, Enter, Arrow keys)
  const addCellNavigation = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
    // Ensure cursor is always visible
    cell.style.cursor = 'text';
    
    cell.addEventListener('keydown', (e) => {
      const currentRow = parseInt(cell.getAttribute('data-row') || '0');
      const currentCol = parseInt(cell.getAttribute('data-column') || '0');
      const totalRows = table.querySelectorAll('tbody tr').length;
      const totalCols = table.querySelectorAll('thead th').length;
      
      let targetCell: HTMLTableCellElement | null = null;
      
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab: Move to previous cell
            if (currentCol > 0) {
              targetCell = table.querySelector(`td[data-row="${currentRow}"][data-column="${currentCol - 1}"]`) as HTMLTableCellElement;
            } else if (currentRow > 0) {
              targetCell = table.querySelector(`td[data-row="${currentRow - 1}"][data-column="${totalCols - 1}"]`) as HTMLTableCellElement;
            }
          } else {
            // Tab: Move to next cell
            if (currentCol < totalCols - 1) {
              targetCell = table.querySelector(`td[data-row="${currentRow}"][data-column="${currentCol + 1}"]`) as HTMLTableCellElement;
            } else if (currentRow < totalRows - 1) {
              targetCell = table.querySelector(`td[data-row="${currentRow + 1}"][data-column="0"]`) as HTMLTableCellElement;
            } else {
              // At last cell, add new row
              addTableRow(table);
              targetCell = table.querySelector(`td[data-row="${totalRows}"][data-column="0"]`) as HTMLTableCellElement;
            }
          }
          break;
          
        case 'Enter':
          e.preventDefault();
          // Enter: Move to cell below, or add new row if at bottom
          if (currentRow < totalRows - 1) {
            targetCell = table.querySelector(`td[data-row="${currentRow + 1}"][data-column="${currentCol}"]`) as HTMLTableCellElement;
          } else {
            addTableRow(table);
            targetCell = table.querySelector(`td[data-row="${totalRows}"][data-column="${currentCol}"]`) as HTMLTableCellElement;
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          if (currentRow > 0) {
            targetCell = table.querySelector(`td[data-row="${currentRow - 1}"][data-column="${currentCol}"]`) as HTMLTableCellElement;
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (currentRow < totalRows - 1) {
            targetCell = table.querySelector(`td[data-row="${currentRow + 1}"][data-column="${currentCol}"]`) as HTMLTableCellElement;
          }
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          if (currentCol > 0) {
            targetCell = table.querySelector(`td[data-row="${currentRow}"][data-column="${currentCol - 1}"]`) as HTMLTableCellElement;
          }
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          if (currentCol < totalCols - 1) {
            targetCell = table.querySelector(`td[data-row="${currentRow}"][data-column="${currentCol + 1}"]`) as HTMLTableCellElement;
          }
          break;
      }
      
      if (targetCell) {
        targetCell.focus();
        const range = document.createRange();
        range.selectNodeContents(targetCell);
        range.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    });
    
    // Add cell selection highlighting
    cell.addEventListener('focus', () => {
      // Remove previous selection
      table.querySelectorAll('.notion-table-cell-selected').forEach(c => 
        c.classList.remove('notion-table-cell-selected')
      );
      // Add selection to current cell
      cell.classList.add('notion-table-cell-selected');
    });
  };

  const insertTable = (rows: number = 3, cols: number = 3) => {
    const selection = window.getSelection();
    if (!selection || !contentEditableRef.current) return;
    
    const range = selection.getRangeAt(0);
    const table = createSimpleTable(rows, cols);
    
    // Wrap table in a container to prevent overflow
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.style.cssText = `
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      margin: 16px 0;
    `;
    wrapper.appendChild(table);
    
    // Insert table at cursor position
    range.deleteContents();
    range.insertNode(wrapper);
    
          // Focus on first cell
    const firstCell = table.querySelector('td') as HTMLElement;
      if (firstCell) {
        const newRange = document.createRange();
        newRange.setStart(firstCell, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        firstCell.focus();
      }
  };

  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableGridPosition, setTableGridPosition] = useState({ x: 0, y: 0 });
  const [hoveredTableSize, setHoveredTableSize] = useState<{ rows: number; cols: number } | null>(null);
  const [previewTable, setPreviewTable] = useState<HTMLTableElement | null>(null);
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const isConvertingMarkdown = useRef(false);

  // Image upload functionality
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        insertImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const insertImage = (imageUrl: string) => {
    const selection = window.getSelection();
    if (!selection || !contentEditableRef.current) return;

    const range = selection.getRangeAt(0);
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'note-image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '8px 0';
    img.style.cursor = 'pointer';
    
    // Add image wrapper for resizing
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '8px 0';
    wrapper.appendChild(img);
    
    // Add resize handles
    addImageResizeHandles(wrapper);
    
    // Insert the image
    range.deleteContents();
    range.insertNode(wrapper);
    
    // Move cursor after the image
    range.setStartAfter(wrapper);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update content
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
      setHasChanges(true);
    }
  };

  const addImageResizeHandles = (wrapper: HTMLDivElement) => {
    // Create resize handles
    const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    
    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.className = `resize-handle resize-handle-${handle}`;
      handleEl.style.cssText = `
        position: absolute;
        background: #2196f3;
        border: 2px solid white;
        border-radius: 50%;
        width: 8px;
        height: 8px;
        z-index: 10;
        cursor: ${handle.includes('n') || handle.includes('s') ? 'ns-resize' : handle.includes('e') || handle.includes('w') ? 'ew-resize' : 'nwse-resize'};
        display: none;
      `;
      
      // Position the handle
      if (handle.includes('n')) handleEl.style.top = '-4px';
      if (handle.includes('s')) handleEl.style.bottom = '-4px';
      if (handle.includes('w')) handleEl.style.left = '-4px';
      if (handle.includes('e')) handleEl.style.right = '-4px';
      if (handle === 'n' || handle === 's') {
        handleEl.style.left = '50%';
        handleEl.style.transform = 'translateX(-50%)';
      }
      if (handle === 'e' || handle === 'w') {
        handleEl.style.top = '50%';
        handleEl.style.transform = 'translateY(-50%)';
      }
      
      wrapper.appendChild(handleEl);
    });
    
    // Show handles on hover/focus
    wrapper.addEventListener('mouseenter', () => {
      wrapper.querySelectorAll('.resize-handle').forEach(h => {
        (h as HTMLElement).style.display = 'block';
      });
    });
    
    wrapper.addEventListener('mouseleave', () => {
      wrapper.querySelectorAll('.resize-handle').forEach(h => {
        (h as HTMLElement).style.display = 'none';
      });
    });
    
    // Add resize functionality
    wrapper.addEventListener('mousedown', (e) => {
      const handle = (e.target as HTMLElement).classList.contains('resize-handle');
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        startResize(e, wrapper);
      }
    });
  };

  const startResize = (e: MouseEvent, wrapper: HTMLDivElement) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = wrapper.offsetWidth;
    const startHeight = wrapper.offsetHeight;
    const handle = (e.target as HTMLElement).classList[1]; // Get handle direction
    
    const doResize = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (handle.includes('e')) newWidth = startWidth + deltaX;
      if (handle.includes('w')) newWidth = startWidth - deltaX;
      if (handle.includes('s')) newHeight = startHeight + deltaY;
      if (handle.includes('n')) newHeight = startHeight - deltaY;
      
      // Maintain aspect ratio for corner handles
      if (handle.includes('n') || handle.includes('s')) {
        const aspectRatio = startWidth / startHeight;
        if (handle.includes('e') || handle.includes('w')) {
          newHeight = newWidth / aspectRatio;
        }
      }
      
      wrapper.style.width = Math.max(50, newWidth) + 'px';
      wrapper.style.height = Math.max(50, newHeight) + 'px';
    };
    
    const stopResize = () => {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    };
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  };

  const showTableSizeSelector = (event: React.MouseEvent) => {
    console.log('Table button clicked!');
    const rect = event.currentTarget.getBoundingClientRect();
    console.log('Button position:', rect);
    
    // Calculate position relative to viewport
    const x = Math.max(10, Math.min(rect.left - 100, window.innerWidth - 250)); // Keep on screen
    const y = Math.max(10, rect.bottom + 10); // Add more space below button
    
    setTableGridPosition({ x, y });
    setShowTableGrid(true);
    console.log('showTableGrid set to true, position:', { x, y });
  };

  const insertTableFromGrid = (rows: number, cols: number) => {
    console.log('insertTableFromGrid called with:', rows, cols);
    console.log('previewTable exists:', !!previewTable);
    
    setShowTableGrid(false);
    
    // If there's a preview table, convert it to a real table
    if (previewTable) {
      console.log('Converting preview table to real table');
      // Remove the preview styling and make it a real table
      previewTable.className = 'notion-table';
      previewTable.style.opacity = '';
      previewTable.style.border = '';
      previewTable.style.backgroundColor = '';
      
      // Clear the preview reference
      setPreviewTable(null);
      console.log('Table converted successfully');
    } else {
      console.log('No preview table, creating new table');
      // Fallback: create a new table if no preview exists
      insertTable(rows, cols);
    }
  };

  const insertCustomTable = () => {
    insertTable(customRows, customCols);
    setShowTableGrid(false);
    setHoveredTableSize(null);
    setPreviewTable(null);
  };

  const showPreviewTable = (rows: number, cols: number) => {
    // Remove existing preview
    removePreviewTable();
    
    // Create preview table
    const table = createSimpleTable(rows, cols);
    table.className = 'notion-table-preview';
    table.style.opacity = '0.7';
    table.style.border = '2px dashed #3b82f6';
    table.style.backgroundColor = '#f0f9ff';
    table.style.margin = '8px 0';
    
    // Wrap in container
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.style.cssText = `
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      margin: 16px 0;
    `;
    wrapper.appendChild(table);
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && contentEditableRef.current) {
      const range = selection.getRangeAt(0);
      
      // If there's already content at the cursor, insert after it
      if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
        // Insert after the current text
        range.setStartAfter(range.startContainer);
        range.collapse(true);
      }
      
      range.insertNode(wrapper);
      setPreviewTable(table);
      
      // Move cursor after the table
      range.setStartAfter(table);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const removePreviewTable = () => {
    if (previewTable) {
      previewTable.remove();
      setPreviewTable(null);
    }
  };

  // Debug: Log when table grid is shown
  useEffect(() => {
    if (showTableGrid) {
      console.log('Table grid is now visible at position:', tableGridPosition);
    }
  }, [showTableGrid, tableGridPosition]);

  const addTableControls = (table: HTMLTableElement) => {
    // Create table wrapper for hover effects
    const wrapper = document.createElement('div');
    wrapper.className = 'notion-table-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.margin = '16px 0';
    
    // Insert wrapper before table and move table into it
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    
    // Add smart scrollbar behavior - only show when absolutely necessary
    const checkScrollbar = () => {
      // Always start with hidden scrollbar
      wrapper.style.overflow = 'hidden';
      wrapper.classList.remove('needs-scroll');
      
      // Check if content actually overflows the container
      const table = wrapper.querySelector('table');
      if (table) {
        const tableWidth = table.offsetWidth;
        const wrapperWidth = wrapper.offsetWidth;
        
        // Only show scrollbar if table is significantly wider than wrapper
        if (tableWidth > wrapperWidth + 20) { // 20px buffer
          wrapper.classList.add('needs-scroll');
        }
      }
    };
    
    // Check on load and resize
    setTimeout(checkScrollbar, 200); // Longer delay to ensure everything is rendered
    window.addEventListener('resize', checkScrollbar);
    
    // Store the cleanup function
    (wrapper as any).__cleanupScrollbar = () => {
      window.removeEventListener('resize', checkScrollbar);
    };
    
    // Add floating toolbar (appears on hover)
    const toolbar = document.createElement('div');
    toolbar.className = 'notion-table-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      padding: 4px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    `;
    
    // Add column button
    const addColBtn = document.createElement('button');
    addColBtn.innerHTML = '📊 Add Column';
    addColBtn.title = 'Add Column';
    addColBtn.style.cssText = `
      padding: 6px 12px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: #37352f;
    `;
    addColBtn.onclick = () => addTableColumn(table);
    addColBtn.onmouseover = () => addColBtn.style.background = '#f1f3f4';
    addColBtn.onmouseout = () => addColBtn.style.background = 'transparent';
    
    // Add row button
    const addRowBtn = document.createElement('button');
    addRowBtn.innerHTML = '📋 Add Row';
    addRowBtn.title = 'Add Row';
    addRowBtn.style.cssText = `
      padding: 6px 12px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: #37352f;
    `;
    addRowBtn.onclick = () => addTableRow(table);
    addRowBtn.onmouseover = () => addRowBtn.style.background = '#f1f3f4';
    addRowBtn.onmouseout = () => addRowBtn.style.background = 'transparent';
    
    // Delete table button
    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️ Delete';
    deleteBtn.title = 'Delete Table';
    deleteBtn.style.cssText = `
      padding: 6px 12px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: #e74c3c;
    `;
    deleteBtn.onclick = () => deleteTable(table);
    deleteBtn.onmouseover = () => deleteBtn.style.background = '#fdf2f2';
    deleteBtn.onmouseout = () => deleteBtn.style.background = 'transparent';
    
    toolbar.appendChild(addColBtn);
    toolbar.appendChild(addRowBtn);
    toolbar.appendChild(deleteBtn);
    wrapper.appendChild(toolbar);
    
    // Add column add button (right edge)
    const addColEdgeBtn = document.createElement('div');
    addColEdgeBtn.className = 'notion-table-add-col-btn';
    addColEdgeBtn.innerHTML = '+';
    addColEdgeBtn.title = 'Add Column';
    addColEdgeBtn.style.cssText = `
      position: absolute;
      right: -20px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 40px;
      background: #f8f9fa;
      border: 1px solid #e1e5e9;
      border-left: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      font-size: 16px;
      color: #6c757d;
    `;
    addColEdgeBtn.onclick = () => addTableColumn(table);
    wrapper.appendChild(addColEdgeBtn);
    
    // Add row add button (bottom edge)
    const addRowEdgeBtn = document.createElement('div');
    addRowEdgeBtn.className = 'notion-table-add-row-btn';
    addRowEdgeBtn.innerHTML = '+';
    addRowEdgeBtn.title = 'Add Row';
    addRowEdgeBtn.style.cssText = `
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 20px;
      background: #f8f9fa;
      border: 1px solid #e1e5e9;
      border-top: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      font-size: 16px;
      color: #6c757d;
    `;
    addRowEdgeBtn.onclick = () => addTableRow(table);
    wrapper.appendChild(addRowEdgeBtn);
    
    // Make columns resizable
    makeTableResizable(table);
    
    // Show/hide controls on hover
    wrapper.addEventListener('mouseenter', () => {
      toolbar.style.opacity = '1';
      addColEdgeBtn.style.opacity = '1';
      addRowEdgeBtn.style.opacity = '1';
    });
    
    wrapper.addEventListener('mouseleave', () => {
      toolbar.style.opacity = '0';
      addColEdgeBtn.style.opacity = '0';
      addRowEdgeBtn.style.opacity = '0';
    });
  };

  const addTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const cols = parseInt(table.getAttribute('data-cols') || '3');
    const currentRows = tbody.children.length;
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-row', currentRows.toString());
    
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.innerHTML = '&nbsp;'; // Add non-breaking space for proper height
      td.className = 'notion-table-cell';
      td.setAttribute('data-column', i.toString());
      td.setAttribute('data-row', currentRows.toString());
      td.style.cursor = 'text';
      
      // Add cell navigation
      addCellNavigation(td, table);
      
      newRow.appendChild(td);
    }
    
    tbody.appendChild(newRow);
    table.setAttribute('data-rows', String(tbody.children.length + 1));
  };

  const addTableColumn = (table: HTMLTableElement) => {
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    if (!headerRow) return;
    
    const newColIndex = headerRow.children.length;
    
    // Add header cell
          const th = document.createElement('th');
      th.contentEditable = 'true';
    th.textContent = `Column ${newColIndex + 1}`;
    th.className = 'notion-table-header';
    th.setAttribute('data-column', newColIndex.toString());
    th.style.cursor = 'text';
    
    // Add placeholder for empty headers
    th.addEventListener('blur', () => {
      if (!th.textContent?.trim()) {
        th.textContent = `Column ${newColIndex + 1}`;
      }
    });
    
      headerRow.appendChild(th);
    
    // Add body cells
    bodyRows.forEach((row, rowIndex) => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.innerHTML = '&nbsp;'; // Add non-breaking space for proper height
      td.className = 'notion-table-cell';
      td.setAttribute('data-column', newColIndex.toString());
      td.setAttribute('data-row', rowIndex.toString());
      td.style.cursor = 'text';
      
      // Add cell navigation
      addCellNavigation(td, table);
      
      row.appendChild(td);
    });
    
    table.setAttribute('data-cols', String(headerRow.children.length));
  };

  const deleteTable = (table: HTMLTableElement) => {
    const wrapper = table.parentElement;
    if (wrapper && (wrapper.classList.contains('table-wrapper') || wrapper.classList.contains('notion-table-wrapper'))) {
      wrapper.remove();
    } else {
      table.remove();
    }
  };

  const makeTableResizable = (table: HTMLTableElement) => {
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      const resizer = document.createElement('div');
      resizer.className = 'table-resizer';
      resizer.style.position = 'absolute';
      resizer.style.right = '0';
      resizer.style.top = '0';
      resizer.style.bottom = '0';
      resizer.style.width = '4px';
      resizer.style.cursor = 'col-resize';
      resizer.style.backgroundColor = 'transparent';
      
      header.style.position = 'relative';
      header.appendChild(resizer);
      
      let startX: number;
      let startWidth: number;
      
      resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = header.offsetWidth;
        
        const mouseMoveHandler = (e: MouseEvent) => {
          const diff = e.clientX - startX;
          const newWidth = Math.max(50, startWidth + diff);
          header.style.width = `${newWidth}px`;
          
          // Update all cells in this column
          const cells = table.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
          cells.forEach(cell => {
            (cell as HTMLElement).style.width = `${newWidth}px`;
          });
        };
        
        const mouseUpHandler = () => {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      });
    });
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  const handleImportPDF = () => {
    setShowImportModal(true);
  };

  const handleFileImport = async (file: File) => {
    try {
      if (file.type === 'application/pdf') {
        await handlePDFFile(file);
      } else if (file.type === 'application/msword' || 
                 file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        await handleDocFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOC/DOCX file.');
      }
      // After import, content will be updated automatically
    } catch (error: any) {
      setError(error.message || 'Error processing file. Please try again.');
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handlePDFFile = async (file: File) => {
    try {
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async function(event) {
          try {
            const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let text = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageText = content.items
                .map((item: any) => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
              text += pageText + '\n\n';
            }
            
            if (!text.trim()) {
              throw new Error('No text could be extracted from the PDF. The file might be scanned or contain only images.');
            }
            
            // Remove extra blank lines between paragraphs and convert to HTML with formatting
            const cleanedText = text.replace(/\n{2,}/g, '\n');
            const htmlContent = convertTextToHtml(cleanedText);
            setContent(htmlContent);
            setHasChanges(true);
            resolve(true);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      throw new Error('Failed to process PDF file. Please ensure it is not corrupted and try again.');
    }
  };

  const handleDocFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Always use the correct endpoint regardless of API_URL
      const endpoint = `${API_URL.replace(/\/?$/, '')}/notes/convert-doc/`;
      
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      if (!response.data.text) {
        throw new Error('No text could be extracted from the document.');
      }
      
      // The backend now returns HTML with preserved formatting
      setContent(response.data.text);
      setHasChanges(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to process document. Please try again.');
    }
  };

  const handleApplySummary = (summary: string) => {
    setContent(summary);
    setHasChanges(true);
  };

  // Helper function to get current selection
  const getSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
  };

  // Helper function to restore selection
  const restoreSelection = (range: Range) => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Create list functionality
  const createList = (isOrdered: boolean = false) => {
    const range = getSelection();
    if (!range || !contentEditableRef.current) return;

    const listType = isOrdered ? 'ol' : 'ul';
    const listItem = document.createElement('li');
    listItem.textContent = '\u200B'; // Zero-width space to maintain cursor

    const list = document.createElement(listType);
    list.appendChild(listItem);

    // Insert the list
    range.deleteContents();
    range.insertNode(list);

    // Move cursor inside the list item
    const newRange = document.createRange();
    newRange.setStart(listItem, 0);
    newRange.collapse(true);
    restoreSelection(newRange);

    // Update content
    setContent(contentEditableRef.current.innerHTML);
    setHasChanges(true);
  };

  // Convert text to list
  const convertToBulletList = () => {
    const range = getSelection();
    if (!range || !contentEditableRef.current) return;

    const container = range.commonAncestorContainer;
    const textNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      if (text.trim().startsWith('- ')) {
        // Remove the "- " and create bullet list
        const newText = text.replace(/^- /, '');
        const listItem = document.createElement('li');
        listItem.textContent = newText;

        const list = document.createElement('ul');
        list.appendChild(listItem);

        // Replace the text node with the list
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(list, textNode);
          
          // Move cursor to end of list item
          const newRange = document.createRange();
          newRange.setStart(listItem, 1);
          newRange.collapse(true);
          restoreSelection(newRange);
        }

        setContent(contentEditableRef.current.innerHTML);
        setHasChanges(true);
      }
    }
  };

  // Handle backspace in lists
  const handleListBackspace = (e: React.KeyboardEvent) => {
    const range = getSelection();
    if (!range) return;

    const listItem = range.startContainer.parentElement;
    
    // Check if we're in a list item
    if (listItem && (listItem.tagName === 'LI' || listItem.closest('li'))) {
      const actualListItem = listItem.tagName === 'LI' ? listItem : listItem.closest('li');
      if (actualListItem) {
        const list = actualListItem.closest('ul, ol');
        if (list) {
          // Check if cursor is at the beginning of the list item
          const isAtStart = range.startOffset === 0;
          
          // If list item is empty or only has zero-width space, remove the bullet
          if (actualListItem.textContent?.trim() === '' || actualListItem.textContent?.trim() === '\u200B') {
            e.preventDefault();
            
            // Store the position of the list item in the list
            const listItems = Array.from(list.children);
            const itemIndex = listItems.indexOf(actualListItem);
            
            // Create a new paragraph
            const paragraph = document.createElement('p');
            paragraph.innerHTML = '<br>';
            
            // Insert the paragraph at the same position as the list item
            if (actualListItem.parentNode) {
              actualListItem.parentNode.insertBefore(paragraph, actualListItem);
              
              // Remove the list item
              actualListItem.remove();
              
              // Use setTimeout to ensure DOM is updated before setting cursor
              setTimeout(() => {
                const newRange = document.createRange();
                // Try to set cursor at the beginning of the paragraph content
                if (paragraph.firstChild) {
                  newRange.setStart(paragraph.firstChild, 0);
                } else {
                  newRange.setStart(paragraph, 0);
                }
                newRange.collapse(true);
                restoreSelection(newRange);
              }, 0);
              
              // If list is empty, remove it too
              if (list.children.length === 0) {
                list.remove();
              }
            }
            
            if (contentEditableRef.current) {
              setContent(contentEditableRef.current.innerHTML);
              setHasChanges(true);
            }
          } else if (isAtStart) {
            // If cursor is at the beginning of a non-empty list item, remove the bullet
            e.preventDefault();
            
            // Get the text content (not HTML) to avoid formatting issues
            const textContent = actualListItem.textContent || '';
            
            // Create a new paragraph with just the text content
            const paragraph = document.createElement('p');
            paragraph.textContent = textContent;
            
            // Replace the list item with the paragraph
            if (actualListItem.parentNode) {
              actualListItem.parentNode.replaceChild(paragraph, actualListItem);
              
              // Move cursor to the beginning of the text content (same visual position)
              const newRange = document.createRange();
              newRange.setStart(paragraph.firstChild || paragraph, 0);
              newRange.collapse(true);
              restoreSelection(newRange);
              
              // If list is empty, remove it too
              if (list.children.length === 0) {
                list.remove();
              }
            }
            
            if (contentEditableRef.current) {
              setContent(contentEditableRef.current.innerHTML);
              setHasChanges(true);
            }
          }
        }
      }
    }
  };

  // Simple formatting function for contentEditable
  const toggleFormatting = (command: string, value: string = '') => {
    console.log('toggleFormatting called:', { command, value });
    
    // Ensure we have a selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('No selection found for formatting');
      return;
    }

    // Focus the contentEditable element
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
    }

    // Handle list commands specially
    if (command === 'insertUnorderedList') {
      createList(false);
      return;
    } else if (command === 'insertOrderedList') {
      createList(true);
      return;
    }

    // Check if the formatting is already applied
    let isActive = false;
    if (command === 'bold') isActive = document.queryCommandState('bold');
    else if (command === 'italic') isActive = document.queryCommandState('italic');
    else if (command === 'underline') isActive = document.queryCommandState('underline');
    else if (command === 'strikeThrough') isActive = document.queryCommandState('strikeThrough');
    else if (command === 'formatBlock') isActive = document.queryCommandValue('formatBlock') === value;
    else if (command === 'hiliteColor') {
      const currentColor = document.queryCommandValue('hiliteColor');
      isActive = currentColor !== 'transparent' && currentColor !== '';
    }

    console.log('Formatting state before toggle:', { command, value, isActive });

    // Toggle the formatting
    if (isActive) {
      if (command === 'formatBlock') {
        console.log('Removing formatBlock, setting to div');
        document.execCommand('formatBlock', false, 'div');
      } else if (command === 'hiliteColor') {
        document.execCommand('hiliteColor', false, 'transparent');
      } else {
        document.execCommand(command, false);
      }
    } else {
      console.log('Applying formatting command:', { command, value });
      const result = document.execCommand(command, false, value);
      console.log('execCommand result:', result);
    }
    
    console.log('Applied formatting command:', { command, value });

    // Update active formatting state based on the command result
    if (command === 'bold') {
      setActiveFormatting(prev => ({ ...prev, bold: document.queryCommandState('bold') }));
    } else if (command === 'italic') {
      setActiveFormatting(prev => ({ ...prev, italic: document.queryCommandState('italic') }));
    } else if (command === 'underline') {
      setActiveFormatting(prev => ({ ...prev, underline: document.queryCommandState('underline') }));
    } else if (command === 'strikeThrough') {
      setActiveFormatting(prev => ({ ...prev, strikethrough: document.queryCommandState('strikeThrough') }));
    } else if (command === 'hiliteColor') {
      const currentColor = document.queryCommandValue('hiliteColor');
      setActiveFormatting(prev => ({ 
        ...prev, 
        highlight: currentColor !== 'transparent' && currentColor !== '' 
      }));
    }

    // Log the current HTML after formatting
    setTimeout(() => {
      if (contentEditableRef.current) {
        console.log('HTML after formatting:', contentEditableRef.current.innerHTML);
        console.log('Current formatBlock value:', document.queryCommandValue('formatBlock'));
      }
    }, 100);
  };

  // Function to show color picker at selection position
  const showColorPickerAtSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Position the color picker above the selection
    setColorPickerPosition({
      x: rect.left + (rect.width / 2),
      y: rect.top - 10
    });
    
    setShowColorPicker(true);
  };

  // Function to handle highlight color selection
  const handleHighlightColor = (color: string) => {
    if (color === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
      setActiveFormatting(prev => ({ ...prev, highlight: false }));
    } else {
      document.execCommand('hiliteColor', false, color);
      setActiveFormatting(prev => ({ ...prev, highlight: true }));
      setSelectedColor(color);
    }
    setShowColorPicker(false);
  };

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.color-picker') && !target.closest('.highlight-button')) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    document.execCommand('removeFormat', false);
    if (alignment === 'justify') {
      document.execCommand('justifyFull', false);
    } else {
      document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
    }
  };

  // Handle formatting changes from contentEditable
  const handleFormattingChange = () => {
    const formatting = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
      highlight: document.queryCommandValue('hiliteColor') !== 'transparent' && document.queryCommandValue('hiliteColor') !== ''
    };
    setActiveFormatting(formatting);
    
    // NEVER update content state to prevent text disappearing - editor works purely from DOM
    // Content is managed entirely by contentEditableRef.current.innerHTML
  };

  // Initialize contentEditable with content - ONLY ONCE when component mounts
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized && !isConvertingMarkdown.current) {
      // Only set content if it's not empty and editor is empty
      if (content && content.trim() && !contentEditableRef.current.innerHTML.trim()) {
      contentEditableRef.current.innerHTML = content;
      }
      setIsInitialized(true);
    }
  }, [isInitialized]); // Removed content dependency to prevent re-initialization

  // Handle content updates from imports - this runs when content changes externally
  useEffect(() => {
    if (contentEditableRef.current && isInitialized && content && content.trim()) {
      // Check if the current DOM content is different from the state content
      const currentDOMContent = contentEditableRef.current.innerHTML;
      
      // Only update if the content is significantly different (like from import)
      if (currentDOMContent !== content) {
        console.log('Updating content in editor:', content.substring(0, 100) + '...');
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [content, isInitialized]);

  // DISABLED: This useEffect was causing text to disappear after autosave
  // The editor now works purely from DOM during typing, and only updates state when needed
  // useEffect(() => {
  //   if (contentEditableRef.current && isInitialized && !isAutoSaving.current) {
  //     // Only update DOM if content is different from what's currently displayed
  //     const currentDOMContent = contentEditableRef.current.innerHTML;
  //     if (currentDOMContent !== content) {
  //       // Check if the editor is currently focused (user is typing)
  //       const isEditorFocused = document.activeElement === contentEditableRef.current;
  //       
  //       if (isEditorFocused) {
  //         // If user is typing, don't update DOM to avoid cursor issues
  //         return;
  //       }
  //       
  //       // Don't update DOM if we just autosaved recently (within 3 seconds)
  //       const timeSinceAutoSave = Date.now() - lastAutoSaveTime.current;
  //       if (timeSinceAutoSave < 3000) {
  //         console.log('Recently autosaved, not updating DOM to preserve user input');
  //         return;
  //       }
  //       
  //       // Additional check: if the DOM content is longer than the state content,
  //       // it means the user has typed more content, so don't overwrite it
  //       if (currentDOMContent.length > content.length && content.length > 0) {
  //         console.log('DOM content is longer than state content, preserving user input');
  //         return;
  //       }
  //       
  //       // Save cursor position before updating DOM
  //       const selection = window.getSelection();
  //       const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  //       const cursorPosition = range ? {
  //         startContainer: range.startContainer,
  //         startOffset: range.startOffset,
  //         endContainer: range.endContainer,
  //         endOffset: range.endOffset
  //       } : null;
  //       
  //       // Update DOM
  //       contentEditableRef.current.innerHTML = content;
  //       
  //       // Restore cursor position if it was saved
  //       if (cursorPosition && selection) {
  //         // Use requestAnimationFrame to ensure DOM is stable before restoring cursor
  //         requestAnimationFrame(() => {
  //           try {
  //             const newRange = document.createRange();
  //             newRange.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
  //             newRange.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
  //             selection.removeAllRanges();
  //             selection.addRange(newRange);
  //           } catch (error) {
  //             // If cursor restoration fails, try to find a similar position
  //             try {
  //               const newRange = document.createRange();
  //               if (contentEditableRef.current) {
  //                 // Try to place cursor at the end of the content
  //                 newRange.selectNodeContents(contentEditableRef.current);
  //                 newRange.collapse(false);
  //                 selection.removeAllRanges();
  //                 selection.addRange(newRange);
  //               }
  //             } catch (fallbackError) {
  //               // If all else fails, just focus the editor
  //               if (contentEditableRef.current) {
  //                 contentEditableRef.current.focus();
  //               }
  //             }
  //           }
  //         });
  //       }
  //     }
  //   }
  // }, [content, isInitialized]);

  // Update contentEditable when content changes externally (like from import)
  // REMOVED: This was causing cursor to jump to top during typing
  // useEffect(() => {
  //   if (contentEditableRef.current && isInitialized) {
  //     const currentContent = contentEditableRef.current.innerHTML;
  //     if (currentContent !== content) {
  //       contentEditableRef.current.innerHTML = content;
  //     }
  //   }
  // }, [content, isInitialized]);

  // Handler for back/close button
  const handleBack = () => {
    if (hasChanges) {
      setShowUnsavedModal(true);
      setPendingClose(true);
    } else {
      onBack();
    }
  };

  // Handler for confirming save changes
  const handleConfirmSave = () => {
    setShowUnsavedModal(false);
    setPendingClose(false);
    handleSave();
    onBack();
  };

  // Handler for canceling discard
  const handleCancelDiscard = () => {
    setShowUnsavedModal(false);
    setPendingClose(false);
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col" style={{ position: 'fixed', top: '-100vh', left: 0, right: 0, bottom: 0, marginTop: '100vh' }}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 p-2 px-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
              type="button"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled Note"
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-gray-900 dark:text-white"
              />
              {/* Save status indicator */}
              <div 
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  hasChanges ? 'bg-orange-500' : 'bg-green-500'
                }`}
                title={hasChanges ? 'Unsaved changes' : 'Saved'}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              onClick={() => onSave(title, content, priority)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
              title="Save"
              type="button"
            >
              <Save size={16} />
            </button>
            <TextFormatting
              activeFormatting={activeFormatting}
              onToggleFormatting={toggleFormatting}
              onShowColorPicker={showColorPickerAtSelection}
              onAlignmentChange={handleAlignment}
              selectedColor={selectedColor}
              onSelectHighlightColor={(color) => handleHighlightColor(color)}
              highlightColors={HIGHLIGHT_COLORS}
            />
            <button
              onClick={showTableSizeSelector}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
              title="Insert Table"
              type="button"
            >
              <Table size={16} />
            </button>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <button
                onClick={() => document.getElementById('image-upload')?.click()}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
                title="Insert Image"
                type="button"
              >
                <Image size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={pageView} onChange={(e) => setPageView(e.target.checked)} />
                Page view
              </label>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
              title="Settings"
              type="button"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex min-w-0">
          {/* Editor */}
          <div className={`flex-1 overflow-y-auto p-4 min-w-0 flex justify-center ${pageView ? 'bg-gray-100 dark:bg-gray-900' : ''}`}>
            <div className={`${pageView ? 'w-full flex justify-center' : 'w-full'} ${/* compress width when AI panel open */''}`} style={{}}>
              <div
                className={`${pageView ? 'bg-white dark:bg-gray-800 shadow transition-[width] duration-200' : ''}`}
                                 style={pageView ? (() => {
                   const sizes = {
                     A4: { width: 794, height: 1123 },
                     Letter: { width: 816, height: 1056 },
                   } as const;
                   const size = sizes[paperSize];
                   const baseW = orientation === 'portrait' ? size.width : size.height;
                   const baseH = orientation === 'portrait' ? size.height : size.width;
                                       return {
                      width: `${baseW}px`,
                      height: 'fit-content',
                      minHeight: `${baseH}px`,
                      margin: '16px',
                      padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                    } as React.CSSProperties;
                 })() : {}}
              >
                                 <div className="w-full" style={{ width: '100%' }}>
                  <style>
                    {`
                                             .note-editor {
                         width: 100% !important;
                         max-width: 100% !important;
                         overflow-wrap: break-word !important;
                         word-wrap: break-word !important;
                         word-break: normal !important;
                         white-space: normal !important;
                         box-sizing: border-box !important;
                         height: auto !important;
                       }
                       .note-editor * {
                         max-width: 100% !important;
                         overflow-wrap: break-word !important;
                         word-wrap: break-word !important;
                         word-break: normal !important;
                         box-sizing: border-box !important;
                       }
                                             .note-editor h1 {
                         font-size: 2rem !important;
                         font-weight: 700 !important;
                         line-height: 1.2 !important;
                         margin-bottom: 1rem !important;
                         margin-top: 1.5rem !important;
                         display: block !important;
                         max-width: 100% !important;
                         width: 100% !important;
                         color: #000000 !important;
                       }
                       .dark .note-editor h1 {
                         color: #ffffff !important;
                       }
                       .note-editor h2 {
                         font-size: 1.5rem !important;
                         font-weight: 700 !important;
                         line-height: 1.3 !important;
                         margin-bottom: 0.75rem !important;
                         margin-top: 1.25rem !important;
                         display: block !important;
                         max-width: 100% !important;
                         width: 100% !important;
                         color: #000000 !important;
                       }
                       .dark .note-editor h2 {
                         color: #ffffff !important;
                       }
                       .note-editor h3 {
                         font-size: 1.25rem !important;
                         font-weight: 700 !important;
                         line-height: 1.4 !important;
                         margin-bottom: 0.5rem !important;
                         margin-top: 1rem !important;
                         display: block !important;
                         max-width: 100% !important;
                         width: 100% !important;
                         color: #000000 !important;
                       }
                       .dark .note-editor h3 {
                         color: #ffffff !important;
                       }
                       .note-editor p, .note-editor div {
                         max-width: 100% !important;
                         width: 100% !important;
                         white-space: normal !important;
                         box-sizing: border-box !important;
                         word-break: normal !important;
                       }
                       .note-editor span {
                         max-width: 100% !important;
                         box-sizing: border-box !important;
                       }
                      .note-editor br {
                        display: block !important;
                        content: "" !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                                             .note-editor strong, .note-editor b {
                         max-width: 100% !important;
                         box-sizing: border-box !important;
                       }
                       .note-editor em, .note-editor i {
                         max-width: 100% !important;
                         box-sizing: border-box !important;
                       }
                       .note-editor u {
                         max-width: 100% !important;
                         box-sizing: border-box !important;
                       }
                       .note-editor mark {
                         max-width: 100% !important;
                         box-sizing: border-box !important;
                       }
                       .note-editor ul {
                         list-style-type: disc !important;
                         padding-left: 2rem !important;
                         margin: 0.5rem 0 !important;
                       }
                       .note-editor ul li {
                         margin: 0.25rem 0 !important;
                         line-height: 1.5 !important;
                         position: relative !important;
                       }
                       .note-editor ul li::marker {
                         color: #6b7280 !important;
                         font-size: 0.875rem !important;
                       }
                       .note-editor ol {
                         list-style-type: decimal !important;
                         padding-left: 2rem !important;
                         margin: 0.5rem 0 !important;
                       }
                       .note-editor ol li {
                         margin: 0.25rem 0 !important;
                         line-height: 1.5 !important;
                       }
                       .note-editor ol li::marker {
                         color: #6b7280 !important;
                         font-size: 0.875rem !important;
                       }
                       
                       /* Notion-style Table Styles */
                       .note-editor .notion-table-wrapper {
                         position: relative !important;
                         margin: 16px 0 !important;
                         display: block !important;
                         border-radius: 6px !important;
                         box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                         min-height: 120px !important;
                         max-width: 100% !important;
                         width: 100% !important;
                         /* Completely hide scrollbar by default */
                         overflow: hidden !important;
                         scrollbar-width: none !important;
                         -ms-overflow-style: none !important;
                       }
                       
                       .note-editor .notion-table-wrapper::-webkit-scrollbar {
                         display: none !important;
                       }
                       
                       /* Show scrollbar only when JavaScript adds the 'needs-scroll' class */
                       .note-editor .notion-table-wrapper.needs-scroll {
                         overflow-x: auto !important;
                         scrollbar-width: thin !important;
                         -ms-overflow-style: auto !important;
                       }
                       
                       .note-editor .notion-table-wrapper.needs-scroll::-webkit-scrollbar {
                         display: block !important;
                         height: 8px !important;
                       }
                       
                       
                       .note-editor .notion-table-wrapper::-webkit-scrollbar-track {
                         background: #f1f5f9 !important;
                         border-radius: 4px !important;
                       }
                       
                       .note-editor .notion-table-wrapper::-webkit-scrollbar-thumb {
                         background: #cbd5e1 !important;
                         border-radius: 4px !important;
                       }
                       
                       .note-editor .notion-table-wrapper::-webkit-scrollbar-thumb:hover {
                         background: #94a3b8 !important;
                       }
                       
                       .note-editor .notion-table {
                         border-collapse: collapse !important;
                         border: 1px solid #e1e5e9 !important;
                         border-radius: 6px !important;
                         overflow: hidden !important;
                         background: white !important;
                         width: 100% !important;
                         min-width: auto !important;
                         min-height: 120px !important;
                         table-layout: auto !important;
                       }
                       
                       .note-editor .notion-table th,
                       .note-editor .notion-table td {
                         border: 1px solid #e1e5e9 !important;
                         padding: 8px 12px !important;
                         text-align: left !important;
                         vertical-align: top !important;
                         min-width: 80px !important;
                         min-height: 32px !important;
                         position: relative !important;
                         font-size: 14px !important;
                         line-height: 1.4 !important;
                         cursor: text !important;
                         white-space: nowrap !important;
                       }
                       
                       /* Simple table styling (matching import feature) */
                       .note-editor .notion-table {
                         border-collapse: collapse !important;
                         width: 100% !important;
                         max-width: 100% !important;
                         margin: 16px 0 !important;
                         background: white !important;
                         border: 1px solid #e1e5e9 !important;
                         border-radius: 6px !important;
                         table-layout: fixed !important;
                         word-wrap: break-word !important;
                         overflow-wrap: break-word !important;
                       }
                       
                       .note-editor .notion-table td {
                         border: 1px solid #e1e5e9 !important;
                         padding: 8px 12px !important;
                         background: white !important;
                         cursor: text !important;
                         min-height: 32px !important;
                         max-width: 200px !important;
                         word-wrap: break-word !important;
                         overflow-wrap: break-word !important;
                         white-space: normal !important;
                       }
                       
                       .note-editor .notion-table td:hover {
                         background: #f8f9fa !important;
                       }
                       
                       .note-editor .notion-table-header {
                         background-color: #f8f9fa !important;
                         font-weight: 500 !important;
                         color: #37352f !important;
                         border-bottom: 2px solid #e1e5e9 !important;
                         font-size: 13px !important;
                         text-transform: uppercase !important;
                         letter-spacing: 0.5px !important;
                       }
                       
                       .note-editor .notion-table-cell {
                         background-color: #ffffff !important;
                         transition: background-color 0.1s ease !important;
                       }
                       
                       .note-editor .notion-table-cell:hover {
                         background-color: #f8f9fa !important;
                       }
                       
                       .note-editor .notion-table-cell-selected {
                         background-color: #e3f2fd !important;
                         box-shadow: inset 0 0 0 2px #2196f3 !important;
                       }
                       
                       .note-editor .notion-table-cell:focus {
                         outline: none !important;
                         background-color: #e3f2fd !important;
                         box-shadow: inset 0 0 0 2px #2196f3 !important;
                         cursor: text !important;
                       }
                       
                       /* Force cursor to be visible on table cells */
                       .note-editor .notion-table th:hover,
                       .note-editor .notion-table td:hover,
                       .note-editor .notion-table th:focus,
                       .note-editor .notion-table td:focus,
                       .note-editor .notion-table th:active,
                       .note-editor .notion-table td:active {
                         cursor: text !important;
                       }
                       
                       /* Ensure cursor is visible when clicking on table cells */
                       .note-editor .notion-table th[contenteditable="true"],
                       .note-editor .notion-table td[contenteditable="true"] {
                         cursor: text !important;
                       }
                       
                       /* Notion-style table controls */
                       .note-editor .notion-table-toolbar {
                         position: absolute !important;
                         top: -40px !important;
                         left: 0 !important;
                         background: white !important;
                         border: 1px solid #e1e5e9 !important;
                         border-radius: 6px !important;
                         padding: 4px !important;
                         display: flex !important;
                         gap: 4px !important;
                         opacity: 0 !important;
                         transition: opacity 0.2s !important;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                         z-index: 1000 !important;
                       }
                       
                       .note-editor .notion-table-add-col-btn,
                       .note-editor .notion-table-add-row-btn {
                         position: absolute !important;
                         background: #f8f9fa !important;
                         border: 1px solid #e1e5e9 !important;
                         display: flex !important;
                         align-items: center !important;
                         justify-content: center !important;
                         cursor: pointer !important;
                         font-size: 16px !important;
                         color: #6c757d !important;
                         opacity: 0 !important;
                         transition: opacity 0.2s !important;
                         z-index: 10 !important;
                       }
                       
                       .note-editor .notion-table-add-col-btn {
                         right: -20px !important;
                         top: 50% !important;
                         transform: translateY(-50%) !important;
                         width: 20px !important;
                         height: 40px !important;
                         border-left: none !important;
                       }
                       
                       .note-editor .notion-table-add-row-btn {
                         bottom: -20px !important;
                         left: 50% !important;
                         transform: translateX(-50%) !important;
                         width: 40px !important;
                         height: 20px !important;
                         border-top: none !important;
                       }
                       
                       .note-editor .notion-table-add-col-btn:hover,
                       .note-editor .notion-table-add-row-btn:hover {
                         background: #e9ecef !important;
                         color: #495057 !important;
                       }
                       
                       .note-editor .table-delete-btn:hover {
                         background: #dc2626 !important;
                         transform: scale(1.1) !important;
                         box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4) !important;
                       }
                       
                       /* Image Styles */
                       .note-editor .image-wrapper {
                         position: relative !important;
                         display: inline-block !important;
                         margin: 8px 0 !important;
                         border: 2px solid transparent !important;
                         border-radius: 4px !important;
                         transition: border-color 0.2s ease !important;
                       }
                       
                       .note-editor .image-wrapper:hover {
                         border-color: #2196f3 !important;
                       }
                       
                       .note-editor .note-image {
                         display: block !important;
                         max-width: 100% !important;
                         height: auto !important;
                         border-radius: 4px !important;
                         cursor: pointer !important;
                       }
                       
                       .note-editor .resize-handle {
                         position: absolute !important;
                         background: #2196f3 !important;
                         border: 2px solid white !important;
                         border-radius: 50% !important;
                         width: 8px !important;
                         height: 8px !important;
                         z-index: 10 !important;
                         display: none !important;
                       }
                       
                       .note-editor .image-wrapper:hover .resize-handle {
                         display: block !important;
                       }
                       
                       .note-editor .resize-handle-nw {
                         top: -4px !important;
                         left: -4px !important;
                         cursor: nw-resize !important;
                       }
                       
                       .note-editor .resize-handle-ne {
                         top: -4px !important;
                         right: -4px !important;
                         cursor: ne-resize !important;
                       }
                       
                       .note-editor .resize-handle-sw {
                         bottom: -4px !important;
                         left: -4px !important;
                         cursor: sw-resize !important;
                       }
                       
                       .note-editor .resize-handle-se {
                         bottom: -4px !important;
                         right: -4px !important;
                         cursor: se-resize !important;
                       }
                       
                       .note-editor .resize-handle-n {
                         top: -4px !important;
                         left: 50% !important;
                         transform: translateX(-50%) !important;
                         cursor: n-resize !important;
                       }
                       
                       .note-editor .resize-handle-s {
                         bottom: -4px !important;
                         left: 50% !important;
                         transform: translateX(-50%) !important;
                         cursor: s-resize !important;
                       }
                       
                       .note-editor .resize-handle-e {
                         top: 50% !important;
                         right: -4px !important;
                         transform: translateY(-50%) !important;
                         cursor: e-resize !important;
                       }
                       
                       .note-editor .resize-handle-w {
                         top: 50% !important;
                         left: -4px !important;
                         transform: translateY(-50%) !important;
                         cursor: w-resize !important;
                       }
                       
                       .note-editor .table-wrapper:hover .table-delete-btn {
                         opacity: 1 !important;
                       }
                       
                       /* Column resizer */
                       .note-editor .table-resizer {
                         position: absolute !important;
                         right: 0 !important;
                         top: 0 !important;
                         bottom: 0 !important;
                         width: 4px !important;
                         cursor: col-resize !important;
                         background-color: transparent !important;
                         transition: background-color 0.2s !important;
                       }
                       
                       .note-editor .table-resizer:hover {
                         background-color: #3b82f6 !important;
                       }
                    `}
                  </style>
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    // NO KEY PROP: Keep the div completely stable to prevent remounting
                    className="outline-none focus:outline-none note-editor w-full"
                    onInput={(e) => {
                      // COMPLETELY DISABLED: Just mark that there are changes, do nothing else
                      setHasChanges(true);
                      // Don't call handleFormattingChange to prevent any interference
                    }}
                    onBlur={() => {}} // DISABLED: No formatting change handling
                    onMouseUp={(e) => {
                      handleTextSelection(e);
                    }}
                    onKeyUp={(e) => {
                      // DISABLED: No formatting change handling
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        handleTextSelection(e);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle Backspace key for lists
                      if (e.key === 'Backspace') {
                        handleListBackspace(e);
                      }

                      // Handle Enter key for lists and heading exit
                      if (e.key === 'Enter') {
                        const range = getSelection();
                        if (!range) return;

                        const container = range.commonAncestorContainer;
                        
                        // Check if we're inside a heading element
                        const headingElement = container.nodeType === Node.TEXT_NODE 
                          ? container.parentElement 
                          : container;
                        
                        if (headingElement && headingElement.nodeType === Node.ELEMENT_NODE) {
                          const element = headingElement as Element;
                          if (element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
                            // If we're inside a heading, create a new paragraph after it
                            e.preventDefault();
                            
                            const newParagraph = document.createElement('p');
                            newParagraph.innerHTML = '<br>'; // Add a line break to make it editable
                            
                            // Insert the new paragraph after the heading
                            if (headingElement.parentNode) {
                              headingElement.parentNode.insertBefore(newParagraph, headingElement.nextSibling);
                              
                              // Move cursor to the new paragraph
                              const selection = window.getSelection();
                              if (selection) {
                                const newRange = document.createRange();
                                newRange.setStart(newParagraph, 0);
                                newRange.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                              }
                              
                              // Update content state
                              if (contentEditableRef.current) {
                                setContent(contentEditableRef.current.innerHTML);
                                setHasChanges(true);
                              }
                            }
                            return;
                          }
                        }

                        const listItem = range.startContainer.parentElement;
                        
                        // Check if we're in a list item
                        if (listItem && (listItem.tagName === 'LI' || listItem.closest('li'))) {
                          const actualListItem = listItem.tagName === 'LI' ? listItem : listItem.closest('li');
                          if (actualListItem) {
                            const list = actualListItem.closest('ul, ol');
                            if (list) {
                              // If list item is empty, exit the list
                              if (actualListItem.textContent?.trim() === '' || actualListItem.textContent?.trim() === '\u200B') {
                                e.preventDefault();
                                
                                // Create a new paragraph after the list
                                const paragraph = document.createElement('p');
                                paragraph.innerHTML = '<br>';
                                
                                if (list.parentNode) {
                                  list.parentNode.insertBefore(paragraph, list.nextSibling);
                                  
                                  // Move cursor to the new paragraph
                                  const newRange = document.createRange();
                                  newRange.setStart(paragraph, 0);
                                  newRange.collapse(true);
                                  restoreSelection(newRange);
                                  
                                  // Remove the empty list item
                                  actualListItem.remove();
                                  
                                  // If list is empty, remove it too
                                  if (list.children.length === 0) {
                                    list.remove();
                                  }
                                }
                                
                                if (contentEditableRef.current) {
                                  setContent(contentEditableRef.current.innerHTML);
                                  setHasChanges(true);
                                }
                              } else {
                                // Create new list item
                                e.preventDefault();
                                const newListItem = document.createElement('li');
                                newListItem.textContent = '\u200B';
                                list.appendChild(newListItem);
                                
                                // Move cursor to new list item
                                const newRange = document.createRange();
                                newRange.setStart(newListItem, 0);
                                newRange.collapse(true);
                                restoreSelection(newRange);
                                
                                if (contentEditableRef.current) {
                                  setContent(contentEditableRef.current.innerHTML);
                                  setHasChanges(true);
                                }
                              }
                            }
                          }
                        }
                      }
                      
                      // Handle Space key for markdown conversion - USE SAME APPROACH AS TOOLBAR
                      if (e.key === ' ') {
                        const range = getSelection();
                        if (!range) return;

                        // Get the current line content
                        let currentLine = '';
                        let container = range.commonAncestorContainer;
                        
                        if (container.nodeType === Node.TEXT_NODE) {
                          const text = container.textContent || '';
                          const lines = text.split('\n');
                          currentLine = lines[lines.length - 1];
                        } else if (container.nodeType === Node.ELEMENT_NODE) {
                          const element = container as Element;
                          const textContent = element.textContent || '';
                          const lines = textContent.split('\n');
                          currentLine = lines[lines.length - 1];
                        }
                        
                        // Check for markdown patterns
                        if (currentLine.trim() === '###' || 
                            currentLine.trim() === '##' || 
                            currentLine.trim() === '#' ||
                            currentLine.trim() === '-' ||
                            currentLine.trim().match(/^\d+\.$/) ||
                            currentLine.trim().match(/^-{3,}$/)) {
                            
                            e.preventDefault();
                            
                            // Remove the markdown text first, then apply formatting
                            if (container.nodeType === Node.TEXT_NODE) {
                              const textNode = container;
                              const text = textNode.textContent || '';
                              const lines = text.split('\n');
                              const lastLine = lines[lines.length - 1];
                              
                              // Remove the markdown from the last line
                              lines[lines.length - 1] = '';
                              textNode.textContent = lines.join('\n');
                              
                              // Create a new paragraph/line for the heading
                              const newParagraph = document.createElement('p');
                              newParagraph.innerHTML = '<br>'; // Add a line break to make it editable
                              
                              // Insert the new paragraph after the text node
                              if (textNode.parentNode) {
                                textNode.parentNode.insertBefore(newParagraph, textNode.nextSibling);
                                
                                // Move cursor to the new paragraph
                                const selection = window.getSelection();
                                if (selection) {
                                  const newRange = document.createRange();
                                  newRange.setStart(newParagraph, 0);
                                  newRange.collapse(true);
                                  selection.removeAllRanges();
                                  selection.addRange(newRange);
                                }
                                
                                // Now apply the formatting to the new paragraph
                                if (currentLine.trim() === '###') {
                                  toggleFormatting('formatBlock', 'h3');
                                } else if (currentLine.trim() === '##') {
                                  toggleFormatting('formatBlock', 'h2');
                                } else if (currentLine.trim() === '#') {
                                  toggleFormatting('formatBlock', 'h1');
                                } else if (currentLine.trim() === '-') {
                                  // For bullet list, we need to create it manually since convertToBulletList expects "- " format
                                  const list = document.createElement('ul');
                                  const listItem = document.createElement('li');
                                  listItem.className = 'ml-4 mb-1 list-disc';
                                  listItem.innerHTML = '<br>'; // Make it editable
                                  list.appendChild(listItem);
                                  
                                  // Replace the paragraph with the list
                                  if (newParagraph.parentNode) {
                                    newParagraph.parentNode.replaceChild(list, newParagraph);
                                    
                                    // Move cursor to the list item
                                    const selection = window.getSelection();
                                    if (selection) {
                                      const newRange = document.createRange();
                                      newRange.setStart(listItem, 0);
                                      newRange.collapse(true);
                                      selection.removeAllRanges();
                                      selection.addRange(newRange);
                                    }
                                  }
                                } else if (currentLine.trim().match(/^\d+\.$/)) {
                                  createList(true); // true for ordered list
                                } else if (currentLine.trim().match(/^-{3,}$/)) {
                                  // For horizontal rule, we need to handle it differently
                                  if (contentEditableRef.current) {
                                    const selection = window.getSelection();
                                    if (selection && selection.rangeCount > 0) {
                                      const range = selection.getRangeAt(0);
                                      const hr = document.createElement('hr');
                                      hr.className = 'my-4 border-gray-300 dark:border-gray-600';
                                      range.deleteContents();
                                      range.insertNode(hr);
                                      
                                      // Move cursor after the HR
                                      const newRange = document.createRange();
                                      newRange.setStartAfter(hr);
                                      newRange.collapse(true);
                                      selection.removeAllRanges();
                                      selection.addRange(newRange);
                                      
                                      setHasChanges(true);
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    suppressContentEditableWarning={true}
                                         style={{
                       fontFamily: 'inherit',
                       fontSize: 'inherit',
                       lineHeight: '1.6',
                       color: 'inherit',
                       width: '100%',
                       maxWidth: '100%',
                       wordWrap: 'break-word',
                       overflowWrap: 'break-word',
                       wordBreak: 'break-all',
                       whiteSpace: 'normal',
                       boxSizing: 'border-box'
                     }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Features Panel */}
          <AIFeaturesPanel
            content={content}
            onApplySummary={handleApplySummary}
            onActiveChange={(open) => {
              // When panel opens, layout already accounts by flex; we keep editor centered so it visually shifts left.
            }}
            sourceNoteId={note?.id}
            sourceNotebookId={note?.notebook}
            sourceTitle={note?.title || ''}
          />
        </div>
      </div>

      {/* Floating Color Picker - Removed in favor of dropdown */}

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleFileImport}
        acceptedFileTypes={[
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]}
        title="Import Document"
      />

      {error && (
        <Toast
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Save Changes?</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">You have unsaved changes. Would you like to save them before leaving?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={handleCancelDiscard}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={handleConfirmSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export Note
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Export your note to your preferred format.
              </p>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'doc')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center space-x-2">
                    <FileText className="text-red-500" size={20} />
                    <span className="text-gray-900 dark:text-white">PDF Document</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="doc"
                    checked={exportFormat === 'doc'}
                    onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'doc')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-center space-x-2">
                    <FileDown className="text-blue-500" size={20} />
                    <span className="text-gray-900 dark:text-white">Word Document</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExportNote(exportFormat)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Export</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Document Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Import & Export
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      handleImportPDF();
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <FileUp size={20} />
                    <div className="text-left">
                      <div className="font-medium">Import Document</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">Upload PDF or Word documents</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowExportModal(true);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Download size={20} />
                    <div className="text-left">
                      <div className="font-medium">Export Document</div>
                      <div className="text-sm text-green-600 dark:text-green-400">Download as PDF or Word</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Document Tools
                </h3>
                <div className="space-y-2">
                  {/* Table option removed - now available in toolbar */}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  View Options
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Page View</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Show document in page format</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={pageView} 
                      onChange={(e) => setPageView(e.target.checked)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MS Word-style Table Grid Selector */}
      {showTableGrid && (
        <div className="fixed inset-0 z-[9999]" onClick={() => {
          setShowTableGrid(false);
          removePreviewTable();
        }}>
          <div 
            className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3"
            style={{
              left: tableGridPosition.x,
              top: tableGridPosition.y,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="text-lg font-bold text-gray-800">
                Insert Table
              </div>
              <button
                onClick={() => {
                  setShowTableGrid(false);
                  removePreviewTable();
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8) + 1;
                const col = (index % 8) + 1;
                return (
                  <div
                    key={index}
                    className="w-4 h-4 border border-gray-400 hover:bg-blue-200 cursor-pointer transition-colors bg-gray-100"
                    onMouseEnter={(e) => {
                      // Set the hovered table size for preview
                      setHoveredTableSize({ rows: row, cols: col });
                      
                      // Show preview table in the page content
                      showPreviewTable(row, col);
                      
                      // Highlight the grid up to this point
                      const cells = e.currentTarget.parentElement?.children;
                      if (cells) {
                        Array.from(cells).forEach((cell, i) => {
                          const cellRow = Math.floor(i / 8) + 1;
                          const cellCol = (i % 8) + 1;
                          if (cellRow <= row && cellCol <= col) {
                            (cell as HTMLElement).style.backgroundColor = '#3b82f6';
                            (cell as HTMLElement).style.borderColor = '#1d4ed8';
                          } else {
                            (cell as HTMLElement).style.backgroundColor = '';
                            (cell as HTMLElement).style.borderColor = '';
                          }
                        });
                      }
                    }}
                    onMouseLeave={(e) => {
                      // Clear the preview
                      setHoveredTableSize(null);
                      removePreviewTable();
                      
                      // Reset all cells
                      const cells = e.currentTarget.parentElement?.children;
                      if (cells) {
                        Array.from(cells).forEach((cell) => {
                          (cell as HTMLElement).style.backgroundColor = '';
                          (cell as HTMLElement).style.borderColor = '';
                        });
                      }
                    }}
                    onClick={() => insertTableFromGrid(row, col)}
                  />
                );
              })}
            </div>
            <div className="text-sm text-gray-600 mt-3 text-center font-medium">
              Hover over the grid to see table preview in the page
            </div>
            
            {/* Custom Table Input */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700 mb-3">Custom Table Size</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Rows:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={customRows}
                    onChange={(e) => setCustomRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Columns:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={customCols}
                    onChange={(e) => setCustomCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={insertCustomTable}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toolbar */}
      {showFloatingToolbar && (
        <FloatingToolbar
          onFormat={handleFloatingToolbarFormat}
          onClose={handleCloseFloatingToolbar}
          position={toolbarPosition}
          selectedText={selectedText}
        />
      )}
    </div>
  );
};

export default NoteEditor;