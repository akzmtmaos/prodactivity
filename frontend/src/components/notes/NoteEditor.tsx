// frontend/src/components/notes/NoteEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Type,
  Palette,
  Strikethrough,
  Code,
  Quote,
  Link,
  Image,
  FileText,
  FileUp,
  Sparkles,
  X,
  ChevronDown
} from 'lucide-react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import BlockEditor from './BlockEditor';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import ImportModal from '../../components/common/ImportModal';
import ErrorToast from '../../components/common/ErrorToast';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Note {
  id: number;
  title: string;
  content: string;
  category: number;
  category_name: string;
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
  onSave: (title: string, content: string, closeAfterSave?: boolean) => void;
  onDelete: (noteId: number) => void;
  onBack: () => void;
  isSaving?: boolean;
}

const AUTO_SAVE_DELAY = 2000; // 2 seconds delay for auto-save

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Blue', value: '#90caf9' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Orange', value: '#ffb74d' },
  { name: 'Purple', value: '#ce93d8' },
  { name: 'Red', value: '#ef9a9a' },
  { name: 'Remove', value: 'transparent' }
];

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
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/notes';
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string>('');
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Array<{ id: string; type: string; content: string }>>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const onBlockTypeChange = (blockId: string, type: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, type } : block
      )
    );
  };

  const onAddBlock = (index: number) => {
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      content: ''
    };
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    return newBlock.id;
  };

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      if (hasChanges) {
        onSave(title.trim() || 'Untitled Note', content);
        setHasChanges(false);
        setLastSaved(new Date());
      }
    }, AUTO_SAVE_DELAY);
  }, [title, content, hasChanges, onSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  // Auto-save when content or title changes
  useEffect(() => {
    if (hasChanges) {
      debouncedSave();
    }
  }, [content, title, hasChanges, debouncedSave]);

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

  useEffect(() => {
    if (note) {
      console.log('Note loaded:', note);
      setTitle(note.title);
      setContent(note.content);
      
      // Update last_visited timestamp when note is loaded
      const updateLastVisited = async () => {
        try {
          console.log('Updating last_visited for note:', note.id);
          const response = await axios.patch(`${API_URL}/notes/${note.id}/`, {
            last_visited: new Date().toISOString()
          }, {
            headers: getAuthHeaders()
          });
          console.log('Visit update response:', response.data);
          
          // Dispatch event to notify that a note has been updated
          window.dispatchEvent(new Event('noteUpdated'));
        } catch (error) {
          console.error('Failed to update note visit timestamp:', error);
          if (axios.isAxiosError(error)) {
            console.error('Error details:', {
              status: error.response?.status,
              data: error.response?.data,
              headers: error.response?.headers
            });
          }
        }
      };
      
      updateLastVisited();
    }
  }, [note]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleContentChange = (newContent: string) => {
    // Check for markdown-style heading shortcuts
    const lines = newContent.split('\n');
    const updatedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine === '#') {
        return '<h1></h1>';
      } else if (trimmedLine === '##') {
        return '<h2></h2>';
      } else if (trimmedLine === '###') {
        return '<h3></h3>';
      }
      return line;
    });
    
    setContent(updatedLines.join('\n'));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    onSave(title.trim() || 'Untitled Note', content);
    setHasChanges(false);
    setLastSaved(new Date());
    
    // Dispatch event to notify that a note has been updated
    window.dispatchEvent(new Event('noteUpdated'));
  };

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
            
            setContent(text);
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
      
      const response = await axios.post(`${API_URL}/convert-doc/`, formData, {
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
      
      setContent(response.data.text);
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error processing document:', error);
      throw new Error(error.response?.data?.error || 'Failed to process document. Please try again.');
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
      setContent(summaryResult);
      setHasChanges(true);
      setSummaryResult('');
    }
  };

  const handleFeatureClick = async (featureId: string) => {
    setActiveFeature(featureId);
    setIsLoading(true);
    
    if (featureId === 'summarize') {
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
        
        setContent(newSummary);
        setHasChanges(true);
      } catch (error: any) {
        console.error('Failed to summarize note:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to summarize note. Please try again.';
        alert(errorMessage);
      }
    }
    
    setIsLoading(false);
  };

  // Function to toggle formatting
  const toggleFormatting = (command: string, value: string = '') => {
    const selection = window.getSelection();
    if (!selection) return;

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

    // Toggle the formatting
    if (isActive) {
      if (command === 'formatBlock') {
        document.execCommand('formatBlock', false, 'div');
      } else if (command === 'hiliteColor') {
        document.execCommand('hiliteColor', false, 'transparent');
      } else {
        document.execCommand(command, false);
      }
    } else {
      document.execCommand(command, false, value);
    }

    // Update active formatting state
    setActiveFormatting(prev => ({
      ...prev,
      [command === 'hiliteColor' ? 'highlight' : command]: !isActive
    }));
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

  const onBlockAlignmentChange = (blockId: string, alignment: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, alignment } : block
      )
    );
  };

  const handleAlignment = (alignment: 'left' | 'center' | 'right') => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const blockElement = range.startContainer.parentElement?.closest('[data-block-id]');
      
      if (blockElement) {
        const blockId = blockElement.getAttribute('data-block-id');
        if (blockId) {
          const block = blocks.find(b => b.id === blockId);
          if (block?.type === 'image') {
            // For image blocks, update the alignment in the blocks state
            onBlockAlignmentChange(blockId, alignment);
            
            // Also update the image element's style
            const img = blockElement.querySelector('img');
            if (img) {
              img.style.display = 'block';
              img.style.marginLeft = alignment === 'left' ? '0' : 'auto';
              img.style.marginRight = alignment === 'right' ? '0' : 'auto';
            }
          } else {
            // For text blocks, use execCommand
            document.execCommand('removeFormat', false);
            document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
          }
        }
      }
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
        messages: [...chatMessages, userMessage]
      }, {
        headers
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.response
      };

      // Add the message directly without typing animation
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

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col" style={{ position: 'fixed', top: '-100vh', left: 0, right: 0, bottom: 0, marginTop: '100vh' }}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled Note"
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-gray-900 dark:text-white"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {note && (
                  <>
                    Created: {new Date(note.created_at).toLocaleDateString()} | 
                    Updated: {new Date(note.updated_at).toLocaleDateString()}
                  </>
                )}
                {hasChanges && (
                  <span className="ml-2 text-yellow-500">
                    • Unsaved changes
                  </span>
                )}
                {lastSaved && (
                  <span className="ml-2 text-green-500">
                    • Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-1 p-2 overflow-x-auto border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`p-2 rounded-lg ${
              isSaving
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Save"
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            onClick={() => toggleFormatting('bold')}
            className={`p-2 rounded-lg ${
              activeFormatting.bold
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => toggleFormatting('italic')}
            className={`p-2 rounded-lg ${
              activeFormatting.italic
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => toggleFormatting('underline')}
            className={`p-2 rounded-lg ${
              activeFormatting.underline
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Underline"
          >
            <Underline size={16} />
          </button>
          <button
            onClick={() => toggleFormatting('strikeThrough')}
            className={`p-2 rounded-lg ${
              activeFormatting.strikethrough
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </button>
          <button
            onClick={() => toggleFormatting('formatBlock', 'blockquote')}
            className={`p-2 rounded-lg ${
              activeFormatting.blockquote
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>
          <button
            onClick={showColorPickerAtSelection}
            className={`p-2 rounded-lg flex items-center space-x-1 highlight-button ${
              activeFormatting.highlight
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Highlight"
          >
            <div 
              className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600" 
              style={{ backgroundColor: selectedColor }}
            />
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) document.execCommand('createLink', false, url);
            }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Insert Link"
          >
            <Link size={16} />
          </button>
          <button
            onClick={() => {
              const url = prompt('Enter image URL:');
              if (url) {
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                
                // Get the current selection
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const blockElement = range.startContainer.parentElement?.closest('[data-block-id]');
                  
                  if (blockElement) {
                    const blockId = blockElement.getAttribute('data-block-id');
                    if (blockId) {
                      const blockIndex = blocks.findIndex(b => b.id === blockId);
                      
                      if (blockIndex !== -1) {
                        // Clear the current block content and add the image
                        blockElement.innerHTML = '';
                        blockElement.appendChild(img);
                        
                        // Update the block type to image and set default alignment
                        onBlockTypeChange(blockId, 'image');
                        onBlockAlignmentChange(blockId, 'center');
                        
                        // Set initial alignment styles
                        img.style.marginLeft = 'auto';
                        img.style.marginRight = 'auto';
                        
                        // Select the image block
                        const newRange = document.createRange();
                        newRange.selectNode(blockElement);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                      }
                    }
                  }
                }
              }
            }}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Insert Image"
          >
            <Image size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          
          <button
            onClick={() => handleAlignment('left')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => handleAlignment('center')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => handleAlignment('right')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          
          <button
            onClick={() => document.execCommand('insertUnorderedList')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => document.execCommand('insertOrderedList')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          
          <select
            onChange={(e) => document.execCommand('formatBlock', false, e.target.value)}
            className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
            defaultValue=""
          >
            <option value="">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="p">Paragraph</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={handleImportPDF}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 ml-2 flex items-center"
            title="Import Document"
            type="button"
          >
            <FileUp size={16} className="mr-2" />
            Import Doc/PDF
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-4">
            <BlockEditor
              initialContent={content}
              onChange={handleContentChange}
            />
          </div>

          {/* AI Features Panel - Integrated into note content */}
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
                {isLoading ? (
                  <div className="animate-pulse space-y-4 p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    {activeFeature === 'summarize' && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 p-4">
                          Get AI-powered summaries of your notes in different formats
                        </p>
                        <div className="space-y-4 p-4">
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
                        </div>
                      </>
                    )}
                    {activeFeature === 'review' && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get automated review questions and explanations
                        </p>
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
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Color Picker */}
      {showColorPicker && (
        <div 
          className="fixed color-picker bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-[10000]"
          style={{
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="grid grid-cols-4 gap-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleHighlightColor(color.value)}
                className={`p-2 rounded-lg flex flex-col items-center space-y-1 ${
                  color.value === selectedColor
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                title={color.name}
              >
                <div 
                  className="w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600" 
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {color.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
        <ErrorToast
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
};

export default NoteEditor;