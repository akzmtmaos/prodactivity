// frontend/src/components/notes/NoteEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  FileUp
} from 'lucide-react';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import ImportModal from '../../components/common/ImportModal';
import Toast from '../../components/common/Toast';
import AIFeaturesPanel from './AIFeaturesPanel';
import TextFormatting from './TextFormatting';
import DeleteConfirmationModal from '../../components/common/DeleteConfirmationModal';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Note {
  id: number;
  title: string;
  content: string;
  notebook: number;
  notebook_name: string;
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
  { name: 'Light Blue', value: '#81d4fa' },
  { name: 'Light Green', value: '#c8e6c9' },
  { name: 'Light Yellow', value: '#fff9c4' }
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
  
  // Simple contentEditable ref
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
    setContent(newContent);
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
            
            // Remove extra blank lines between paragraphs
            const cleanedText = text.replace(/\n{2,}/g, '\n');
            setContent(cleanedText);
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
      
      // Remove extra blank lines between paragraphs
      const cleanedText = response.data.text.replace(/\n{2,}/g, '\n');
      setContent(cleanedText);
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
  };

  // Initialize contentEditable with content
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized) {
      contentEditableRef.current.innerHTML = content;
      setIsInitialized(true);
    }
  }, [content, isInitialized]);

  // Update contentEditable when content changes externally (like from import)
  useEffect(() => {
    if (contentEditableRef.current && isInitialized) {
      const currentContent = contentEditableRef.current.innerHTML;
      if (currentContent !== content) {
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [content, isInitialized]);

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
              onClick={handleSave}
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
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={pageView} onChange={(e) => setPageView(e.target.checked)} />
                Page view
              </label>
            </div>
            <button
              onClick={handleImportPDF}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center flex-shrink-0"
              title="Import Document"
              type="button"
            >
              <FileUp size={16} className="mr-2" />
              Import
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
                  // If AI panel is open, slightly reduce page width to make room visually
                  const adjustedW = baseW; // keep page width fixed; centering will shift left naturally
                  return {
                    width: `${adjustedW}px`,
                    minHeight: `${baseH}px`,
                    margin: '16px',
                    padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                  } as React.CSSProperties;
                })() : {}}
              >
                <div className="max-w-full break-words">
                  <style>
                    {`
                      .note-editor h1 {
                        font-size: 2rem !important;
                        font-weight: 700 !important;
                        line-height: 1.2 !important;
                        margin-bottom: 1rem !important;
                        margin-top: 1.5rem !important;
                        display: block !important;
                      }
                      .note-editor h2 {
                        font-size: 1.5rem !important;
                        font-weight: 600 !important;
                        line-height: 1.3 !important;
                        margin-bottom: 0.75rem !important;
                        margin-top: 1.25rem !important;
                        display: block !important;
                      }
                      .note-editor h3 {
                        font-size: 1.25rem !important;
                        font-weight: 600 !important;
                        line-height: 1.4 !important;
                        margin-bottom: 0.5rem !important;
                        margin-top: 1rem !important;
                        display: block !important;
                      }
                    `}
                  </style>
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    className="min-h-[500px] outline-none focus:outline-none note-editor"
                    onInput={(e) => {
                      const newContent = e.currentTarget.innerHTML;
                      setContent(newContent);
                      setHasChanges(true);
                      handleFormattingChange();
                    }}
                    onBlur={handleFormattingChange}
                    onKeyUp={handleFormattingChange}
                    suppressContentEditableWarning={true}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: '1.6',
                      color: 'inherit'
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
    </div>
  );
};

export default NoteEditor;