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
  X,
  ChevronDown
} from 'lucide-react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import BlockEditor from './BlockEditor';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import ImportModal from '../../components/common/ImportModal';
import ErrorToast from '../../components/common/ErrorToast';
import AIFeaturesPanel from './AIFeaturesPanel';
import TextFormatting from './TextFormatting';
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
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Array<{ id: string; type: string; content: string }>>([]);

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
      setTitle(note.title || '');
      setContent(note.content || '');
      setHasChanges(false);
      
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
    const newTitle = e.target.value;
    setTitle(newTitle);
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
  }, [title, content, hasChanges]);

  // Auto-save when content or title changes
  useEffect(() => {
    if (hasChanges) {
      debouncedSave();
    }
  }, [content, title, hasChanges, debouncedSave]);

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

  const handleApplySummary = (summary: string) => {
    setContent(summary);
    setHasChanges(true);
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
    document.execCommand('removeFormat', false);
    document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
  };

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
        <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
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
            />
          </div>
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

          {/* AI Features Panel */}
          <AIFeaturesPanel
            content={content}
            onApplySummary={handleApplySummary}
          />
        </div>
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