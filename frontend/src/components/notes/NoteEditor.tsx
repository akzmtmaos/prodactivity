// frontend/src/components/notes/NoteEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import ImportModal from '../../components/common/ImportModal';
import Toast from '../../components/common/Toast';
import AIFeaturesPanel from './AIFeaturesPanel';
import FloatingToolbar from './FloatingToolbar';
import EditorToolbar from './editor/EditorToolbar';
import TableInsertModal from './editor/TableInsertModal';
import UnsavedChangesModal from './editor/UnsavedChangesModal';
import EditorSettingsModal from './editor/EditorSettingsModal';
import ExportModal from './editor/ExportModal';
import { createSimpleTable, createCodeBlock } from './editor/tableHelpers';
import { convertTextToHtml, linkifyContent, insertImage, getSelection, restoreSelection, convertMarkdownToHTML } from './editor/editorUtils';

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

interface NoteEditorProps {
  note: Note | null;
  isNewNote: boolean;
  onSave: (title: string, content: string, priority: 'low' | 'medium' | 'high' | 'urgent', closeAfterSave?: boolean) => void;
  onDelete: (noteId: number) => void;
  onBack: () => void;
  isSaving?: boolean;
}

const AUTO_SAVE_DELAY = 2000;

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
  // State
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(note?.priority || 'medium');
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const isAutoSaving = useRef<boolean>(false);
  const contentRef = useRef<string>('');
  const lastAutoSaveTime = useRef<number>(0);
  const isUpdatingFromAutosave = useRef<boolean>(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const linkifyTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastRangeRef = useRef<Range | null>(null);
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  
  // Editor states
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#ffeb3b');
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [pageView, setPageView] = useState<boolean>(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [margins, setMargins] = useState({ top: 24, right: 24, bottom: 24, left: 24 });
  
  // Floating toolbar
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  
  // Table grid
  const [tableGridPosition, setTableGridPosition] = useState({ x: 0, y: 0 });
  
  // Active formatting
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    highlight: false
  });
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.68.162:8000/api';
  
  // Keep last selection range updated
  useEffect(() => {
    const handler = () => {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && contentEditableRef.current && contentEditableRef.current.contains(sel.anchorNode)) {
          lastRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch {}
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  // Auth headers
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

  // Save functionality
  const handleSave = () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }
    
    isAutoSaving.current = true;
    
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const cursorPosition = range ? {
      startContainer: range.startContainer,
      startOffset: range.startOffset,
      endContainer: range.endContainer,
      endOffset: range.endOffset
    } : null;
    
    const currentContent = contentEditableRef.current?.innerHTML || contentRef.current;
    contentRef.current = currentContent;
    isUpdatingFromAutosave.current = true;
    
    onSave(title.trim() || 'Untitled Note', currentContent, priority);
    setHasChanges(false);
    setLastSaved(new Date());
    lastAutoSaveTime.current = Date.now();
    
    if (cursorPosition && selection) {
      requestAnimationFrame(() => {
        try {
          const newRange = document.createRange();
          newRange.setStart(cursorPosition.startContainer, cursorPosition.startOffset);
          newRange.setEnd(cursorPosition.endContainer, cursorPosition.endOffset);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (error) {
          if (contentEditableRef.current) {
            const newRange = document.createRange();
            newRange.selectNodeContents(contentEditableRef.current);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        
        isAutoSaving.current = false;
        setTimeout(() => {
          isUpdatingFromAutosave.current = false;
        }, 100);
      });
    } else {
      isAutoSaving.current = false;
      setTimeout(() => {
        isUpdatingFromAutosave.current = false;
      }, 100);
    }
    
    window.dispatchEvent(new Event('noteUpdated'));
  };

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
    }, AUTO_SAVE_DELAY);
  }, [title, priority, hasChanges]);

  // Auto-save effect
  useEffect(() => {
    const autosaveEnabled = localStorage.getItem('autosaveNotes') !== 'false';
    if (hasChanges && autosaveEnabled) {
      debouncedSave();
    }
  }, [title, priority, hasChanges, debouncedSave]);

  // Initialize contentEditable
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized) {
      if (content && content.trim() && !contentEditableRef.current.innerHTML.trim()) {
        contentEditableRef.current.innerHTML = content;
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Handle content updates from imports
  useEffect(() => {
    if (contentEditableRef.current && isInitialized && content && content.trim()) {
      const currentDOMContent = contentEditableRef.current.innerHTML;
      if (currentDOMContent !== content) {
        contentEditableRef.current.innerHTML = content;
      }
    }
  }, [content, isInitialized]);

  // Focus editor on load
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized) {
      contentEditableRef.current.focus();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);

  // Table insertion
  const insertTable = (rows: number = 3, cols: number = 3) => {
    if (!contentEditableRef.current) return;
    let selection = window.getSelection();
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0 && contentEditableRef.current.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else if (lastRangeRef.current) {
      range = lastRangeRef.current;
      selection = window.getSelection();
      if (selection && range) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      const fallbackRange = document.createRange();
      fallbackRange.selectNodeContents(contentEditableRef.current);
      fallbackRange.collapse(false);
      range = fallbackRange;
      selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    if (!range) return;
    const table = createSimpleTable(rows, cols);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.style.cssText = `
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      margin: 8px 0;
      background: transparent;
    `;
    wrapper.appendChild(table);
    
    try {
      range.deleteContents();
      range.insertNode(wrapper);
    } catch (e) {
      try {
        contentEditableRef.current.appendChild(wrapper);
      } catch {}
    }
    
    const firstCell = table.querySelector('td') as HTMLElement;
    if (firstCell) {
      const newRange = document.createRange();
      newRange.setStart(firstCell, 0);
      newRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(newRange);
      firstCell.focus();
    }

    try { wrapper.scrollIntoView({ block: 'nearest' }); } catch {}

    try {
      if (contentEditableRef.current) {
        const newContent = contentEditableRef.current.innerHTML;
        setContent(newContent);
        setHasChanges(true);
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        contentEditableRef.current.dispatchEvent(inputEvent);
      }
    } catch {}
  };

  // Code block insertion
  const insertCodeBlock = () => {
    if (!contentEditableRef.current) return;
    
    const selection = window.getSelection();
    let range: Range | null = null;
    
    if (selection && selection.rangeCount > 0 && contentEditableRef.current.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0);
    } else {
      const fallbackRange = document.createRange();
      fallbackRange.selectNodeContents(contentEditableRef.current);
      fallbackRange.collapse(false);
      range = fallbackRange;
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    if (!range) return;
    
    // Check if cursor is already inside a code block
    let currentNode: Node | null = range.commonAncestorContainer;
    while (currentNode && currentNode !== contentEditableRef.current) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as Element;
        // Check for code block container or code content
        if (element.classList?.contains('code-block-container') || 
            element.classList?.contains('code-block-content') ||
            element.tagName === 'PRE' ||
            (element.tagName === 'CODE' && element.parentElement?.tagName === 'PRE')) {
          // Already inside a code block, don't insert
          return;
        }
      }
      currentNode = currentNode.parentNode;
    }
    
    const { codeContainer, codeContent } = createCodeBlock();
    
    try {
      range.deleteContents();
      range.insertNode(codeContainer);
      
      const spacer = document.createElement('div');
      spacer.innerHTML = '<br>';
      codeContainer.parentNode?.insertBefore(spacer, codeContainer.nextSibling);
    } catch (e) {
      contentEditableRef.current.appendChild(codeContainer);
    }
    
    codeContent.focus();
    const newRange = document.createRange();
    newRange.selectNodeContents(codeContent);
    selection?.removeAllRanges();
    selection?.addRange(newRange);
    
    if (contentEditableRef.current) {
      const newContent = contentEditableRef.current.innerHTML;
      setContent(newContent);
      setHasChanges(true);
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      contentEditableRef.current.dispatchEvent(inputEvent);
    }
  };

  // Image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        if (contentEditableRef.current) {
          const wrapper = insertImage(imageUrl, contentEditableRef);
          if (wrapper) {
            setContent(contentEditableRef.current.innerHTML);
            setHasChanges(true);
          }
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  // Show table selector
  const showTableSizeSelector = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && contentEditableRef.current && contentEditableRef.current.contains(sel.anchorNode)) {
        lastRangeRef.current = sel.getRangeAt(0).cloneRange();
      } else if (contentEditableRef.current) {
        const fallback = document.createRange();
        fallback.selectNodeContents(contentEditableRef.current);
        fallback.collapse(false);
        lastRangeRef.current = fallback;
      }
    } catch {}
    
    const panelWidth = 190;
    const panelHeight = 260;
    const preferredX = rect.left - (panelWidth - rect.width);
    const preferredY = rect.bottom + 8;
    const x = Math.max(10, Math.min(preferredX, window.innerWidth - panelWidth - 10));
    const y = Math.max(10, Math.min(preferredY, window.innerHeight - panelHeight - 10));
    
    setTableGridPosition({ x, y });
    setShowTableGrid(true);
  };

  // Formatting
  const toggleFormatting = (command: string, value: string = '') => {
    if (!contentEditableRef.current) return;
    contentEditableRef.current.focus();
    
    if (command === 'formatBlock' && value === 'pre') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        
        const container = range.commonAncestorContainer;
        const codeBlockContainer = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement?.closest('.code-block-container')
          : (container as Element).closest('.code-block-container');
        
        if (codeBlockContainer) {
          const textNode = document.createTextNode(selectedText || codeBlockContainer.textContent || '');
          codeBlockContainer.parentNode?.replaceChild(textNode, codeBlockContainer);
        } else {
          insertCodeBlock();
        }
      }
    } else {
      document.execCommand(command, false, value);
    }
    
    setHasChanges(true);
    
    // Update formatting state after applying format
    setTimeout(() => updateFormattingState(), 10);
  };

  // Color picker
  const showColorPickerAtSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setColorPickerPosition({
      x: rect.left + (rect.width / 2),
      y: rect.top - 10
    });
    
    setShowColorPicker(true);
  };

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

  // Alignment
  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    document.execCommand('removeFormat', false);
    if (alignment === 'justify') {
      document.execCommand('justifyFull', false);
    } else {
      document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`);
    }
  };

  // Update formatting state based on current selection
  const updateFormattingState = () => {
    try {
      const formatting = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        highlight: document.queryCommandValue('hiliteColor') !== 'transparent' && document.queryCommandValue('hiliteColor') !== ''
      };
      setActiveFormatting(formatting);
    } catch (error) {
      // Ignore errors from queryCommandState
    }
  };

  // Text selection for floating toolbar
  const handleTextSelection = (e: React.MouseEvent | React.KeyboardEvent) => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowFloatingToolbar(false);
        updateFormattingState();
        return;
      }

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      
      // Update formatting state
      updateFormattingState();
      
      if (selectedText.length > 0) {
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
    contentEditableRef.current.focus();
    
    if (command === 'formatBlock' && value === 'pre') {
      insertCodeBlock();
    } else {
      document.execCommand(command, false, value);
    }
    
    setHasChanges(true);
  };

  // Import/Export
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
      throw error;
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
      
      setContent(response.data.text);
      setHasChanges(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to process document. Please try again.');
    }
  };

  const handleExportNote = async (format: 'pdf' | 'doc') => {
    if (!note) return;
    
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
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const titleSlug = note.title.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${titleSlug}_${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export note. Please try again.');
    }
  };

  // Back/Close handlers
  const handleBack = () => {
    if (hasChanges) {
      setShowUnsavedModal(true);
      setPendingClose(true);
    } else {
      onBack();
    }
  };

  const handleConfirmSave = () => {
    setShowUnsavedModal(false);
    setPendingClose(false);
    
    const currentContent = contentEditableRef.current?.innerHTML || contentRef.current;
    onSave(title.trim() || 'Untitled Note', currentContent, priority, true);
    onBack();
  };

  const handleStay = () => {
    setShowUnsavedModal(false);
    setPendingClose(false);
  };

  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    setPendingClose(false);
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col" style={{ position: 'fixed', top: '-100vh', left: 0, right: 0, bottom: 0, marginTop: '100vh' }}>
      {/* Toolbar */}
      <EditorToolbar
        title={title}
        hasChanges={hasChanges}
        activeFormatting={activeFormatting}
        selectedColor={selectedColor}
        highlightColors={HIGHLIGHT_COLORS}
        pageView={pageView}
        onBack={handleBack}
        onTitleChange={setTitle}
        onSave={handleSave}
        onToggleFormatting={toggleFormatting}
        onShowColorPicker={showColorPickerAtSelection}
        onAlignmentChange={handleAlignment}
        onSelectHighlightColor={handleHighlightColor}
        onShowTableSelector={showTableSizeSelector}
        onInsertCodeBlock={insertCodeBlock}
        onImageUpload={handleImageUpload}
        onTogglePageView={setPageView}
        onShowSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex min-w-0">
          {/* Editor */}
          <div className={`flex-1 overflow-y-auto p-4 min-w-0 flex justify-center ${pageView ? 'bg-gray-100 dark:bg-gray-900' : ''}`}>
            <div className={`${pageView ? 'w-full flex justify-center' : 'w-full'}`}>
              <div
                className={`${pageView ? 'bg-white dark:bg-gray-800 shadow transition-[width] duration-200' : ''}`}
                style={pageView ? (() => {
                  const sizes = { A4: { width: 794, height: 1123 }, Letter: { width: 816, height: 1056 } } as const;
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
                  {/* Editor Styles - Using existing styles from original file */}
                  <style>{`
                    .note-editor { width: 100% !important; max-width: 100% !important; overflow-wrap: break-word !important; word-wrap: break-word !important; word-break: normal !important; white-space: normal !important; box-sizing: border-box !important; height: auto !important; }
                    .note-editor * { max-width: 100% !important; overflow-wrap: break-word !important; word-wrap: break-word !important; word-break: normal !important; box-sizing: border-box !important; }
                    .note-editor h1 { font-size: 2rem !important; font-weight: 700 !important; line-height: 1.2 !important; margin-bottom: 1rem !important; margin-top: 1.5rem !important; display: block !important; max-width: 100% !important; width: 100% !important; color: #000000 !important; }
                    .dark .note-editor h1 { color: #ffffff !important; }
                    .note-editor h2 { font-size: 1.5rem !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.75rem !important; margin-top: 1.25rem !important; display: block !important; max-width: 100% !important; width: 100% !important; color: #000000 !important; }
                    .dark .note-editor h2 { color: #ffffff !important; }
                    .note-editor h3 { font-size: 1.25rem !important; font-weight: 700 !important; line-height: 1.4 !important; margin-bottom: 0.5rem !important; margin-top: 1rem !important; display: block !important; max-width: 100% !important; width: 100% !important; color: #000000 !important; }
                    .dark .note-editor h3 { color: #ffffff !important; }
                    .note-editor ul { list-style-type: disc !important; padding-left: 2rem !important; margin: 0.5rem 0 !important; }
                    .note-editor ul li { margin: 0.25rem 0 !important; line-height: 1.5 !important; position: relative !important; }
                    .note-editor ol { list-style-type: decimal !important; padding-left: 2rem !important; margin: 0.5rem 0 !important; }
                    .note-editor ol li { margin: 0.25rem 0 !important; line-height: 1.5 !important; }
                    .note-editor .notion-table { border-collapse: collapse !important; width: 100% !important; max-width: 100% !important; margin: 16px 0 !important; background: white !important; border: 1px solid #e1e5e9 !important; border-radius: 6px !important; table-layout: fixed !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
                    .note-editor .notion-table td { border: 1px solid #e1e5e9 !important; padding: 8px 12px !important; background: white !important; cursor: text !important; min-height: 32px !important; max-width: 200px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; }
                    .note-editor .notion-table td:hover { background: #f8f9fa !important; }
                    .note-editor .code-block-container { background-color: #1e1e1e; border-radius: 8px; margin: 16px 0; overflow: hidden; font-family: 'Consolas', 'Monaco', 'Courier New', monospace; }
                  `}</style>
                  
                  <div
                    ref={contentEditableRef}
                    contentEditable
                    className="outline-none focus:outline-none note-editor w-full"
                    onInput={() => {
                      setHasChanges(true);
                      
                      // Ensure editor always has content
                      if (contentEditableRef.current) {
                        const text = contentEditableRef.current.textContent || '';
                        const html = contentEditableRef.current.innerHTML || '';
                        
                        // If editor is completely empty, add a paragraph
                        if (text.trim() === '' && html.trim() === '') {
                          contentEditableRef.current.innerHTML = '<p><br></p>';
                          
                          // Place cursor at the start
                          const newRange = document.createRange();
                          const newSelection = window.getSelection();
                          const firstChild = contentEditableRef.current.firstChild;
                          
                          if (firstChild) {
                            newRange.setStart(firstChild, 0);
                            newRange.collapse(true);
                            newSelection?.removeAllRanges();
                            newSelection?.addRange(newRange);
                          }
                        }
                      }
                      
                      if (linkifyTimeout.current) clearTimeout(linkifyTimeout.current);
                      linkifyTimeout.current = setTimeout(() => {
                        linkifyContent(contentEditableRef);
                      }, 1000);
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A' && target instanceof HTMLAnchorElement) {
                        e.preventDefault();
                        window.open(target.href, '_blank', 'noopener,noreferrer');
                      }
                      // Update formatting state on click
                      setTimeout(() => updateFormattingState(), 10);
                    }}
                    onMouseUp={(e) => {
                      handleTextSelection(e);
                      // Update formatting state on mouse up
                      setTimeout(() => updateFormattingState(), 10);
                    }}
                    onKeyUp={(e) => {
                      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                        handleTextSelection(e);
                      }
                      // Update formatting state on any key up
                      setTimeout(() => updateFormattingState(), 10);
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key in headings to exit to normal paragraph
                      if (e.key === 'Enter') {
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0) return;
                        
                        const range = selection.getRangeAt(0);
                        const container = range.commonAncestorContainer;
                        
                        // Find the heading element (could be nested)
                        let headingElement: Element | null = null;
                        let currentNode: Node | null = container.nodeType === Node.TEXT_NODE 
                          ? container.parentElement 
                          : container as Element;
                        
                        // Traverse up to find heading
                        while (currentNode && currentNode !== contentEditableRef.current) {
                          if (currentNode.nodeType === Node.ELEMENT_NODE) {
                            const element = currentNode as Element;
                            if (element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
                              headingElement = element;
                              break;
                            }
                          }
                          currentNode = currentNode.parentNode as Element;
                        }
                        
                        if (headingElement) {
                          // If we're inside a heading, create a new paragraph after it
                          e.preventDefault();
                          
                          const newParagraph = document.createElement('p');
                          newParagraph.innerHTML = '<br>';
                          
                          // Insert the new paragraph after the heading at the correct level
                          if (headingElement.parentNode) {
                            headingElement.parentNode.insertBefore(newParagraph, headingElement.nextSibling);
                            
                            // Move cursor to the new paragraph
                            const newRange = document.createRange();
                            const newSelection = window.getSelection();
                            
                            if (newParagraph.firstChild) {
                              newRange.setStart(newParagraph.firstChild, 0);
                            } else {
                              newRange.setStart(newParagraph, 0);
                            }
                            newRange.collapse(true);
                            newSelection?.removeAllRanges();
                            newSelection?.addRange(newRange);
                            
                            setHasChanges(true);
                          }
                          return;
                        }
                      }
                      
                      // Handle Space key for markdown conversion
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
                              
                              // Remove the markdown from the last line
                              lines[lines.length - 1] = '';
                              textNode.textContent = lines.join('\n');
                              
                              // Create a new paragraph/line for the heading
                              const newParagraph = document.createElement('p');
                              newParagraph.innerHTML = '<br>';
                              
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
                                  // For bullet list
                                  const list = document.createElement('ul');
                                  const listItem = document.createElement('li');
                                  listItem.className = 'ml-4 mb-1 list-disc';
                                  listItem.innerHTML = '<br>';
                                  list.appendChild(listItem);
                                  
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
                                  // For ordered list
                                  const list = document.createElement('ol');
                                  const listItem = document.createElement('li');
                                  listItem.className = 'ml-4 mb-1';
                                  listItem.innerHTML = '<br>';
                                  list.appendChild(listItem);
                                  
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
                                } else if (currentLine.trim().match(/^-{3,}$/)) {
                                  // For horizontal rule
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
                      }}
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
            onApplySummary={(summary) => {
              // Convert markdown to HTML before applying
              const htmlContent = convertMarkdownToHTML(summary);
              setContent(htmlContent);
              setHasChanges(true);
              
              // Update the contentEditable div as well
              if (contentEditableRef.current) {
                contentEditableRef.current.innerHTML = htmlContent;
              }
            }}
            onActiveChange={() => {}}
            sourceNoteId={note?.id}
            sourceNotebookId={note?.notebook}
            sourceTitle={note?.title || ''}
          />
        </div>
      </div>

      {/* Modals */}
      <TableInsertModal
        isOpen={showTableGrid}
        position={tableGridPosition}
        onClose={() => setShowTableGrid(false)}
        onInsertTable={insertTable}
      />

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onStay={handleStay}
        onDiscard={handleDiscardChanges}
        onSave={handleConfirmSave}
      />

      <EditorSettingsModal
        isOpen={showSettingsModal}
        pageView={pageView}
        onClose={() => setShowSettingsModal(false)}
        onTogglePageView={setPageView}
        onImportDocument={() => setShowImportModal(true)}
        onExportDocument={() => setShowExportModal(true)}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportNote}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleFileImport}
        acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
        title="Import Document"
      />

      {error && <Toast message={error} onClose={() => setError(null)} />}

      {showFloatingToolbar && (
        <FloatingToolbar
          onFormat={handleFloatingToolbarFormat}
          onClose={() => setShowFloatingToolbar(false)}
          position={toolbarPosition}
          selectedText={selectedText}
        />
      )}
    </div>
  );
};

export default NoteEditor;
