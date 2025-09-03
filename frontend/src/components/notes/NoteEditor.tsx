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
  Table
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
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(note?.priority || 'medium');
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.56.1:8000/api/notes';
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
  
  // Simple contentEditable ref
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
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

  useEffect(() => {
    if (note) {
      console.log('Note loaded:', note);
      setTitle(note.title || '');
      setContent(note.content || '');
      setPriority(note.priority || 'medium');
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
            onSave(title.trim() || 'Untitled Note', content, priority);
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
  }, [title, content, priority, hasChanges]);

  // Auto-save when content or title changes
  useEffect(() => {
    if (hasChanges) {
      debouncedSave();
    }
  }, [content, title, priority, hasChanges, debouncedSave]);

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

  // Table functionality
  const createTable = (rows: number = 3, cols: number = 3) => {
    const table = document.createElement('table');
    table.className = 'note-table';
    table.setAttribute('data-rows', rows.toString());
    table.setAttribute('data-cols', cols.toString());
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const th = document.createElement('th');
      th.contentEditable = 'true';
      th.textContent = `Header ${i + 1}`;
      th.className = 'table-header';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    for (let i = 0; i < rows - 1; i++) {
      const tr = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = '';
        td.className = 'table-cell';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    
    return table;
  };

  const insertTable = () => {
    const selection = window.getSelection();
    if (!selection || !contentEditableRef.current) return;
    
    const range = selection.getRangeAt(0);
    const table = createTable(3, 3);
    
    // Insert table at cursor position
    range.deleteContents();
    range.insertNode(table);
    
    // Add table controls
    addTableControls(table);
    
    // Update content
    setContent(contentEditableRef.current.innerHTML);
    setHasChanges(true);
    
          // Focus on first cell
      const firstCell = table.querySelector('td, th') as HTMLElement;
      if (firstCell) {
        const newRange = document.createRange();
        newRange.setStart(firstCell, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        firstCell.focus();
      }
  };

  const addTableControls = (table: HTMLTableElement) => {
    // Create table wrapper for hover effects
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.style.position = 'relative';
    
    // Insert wrapper before table and move table into it
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    
    // Add delete button (top-right corner)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'table-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete Table';
    deleteBtn.onclick = () => deleteTable(table);
    wrapper.appendChild(deleteBtn);
    
    // Add column add button (right edge)
    const addColBtn = document.createElement('div');
    addColBtn.className = 'table-add-col-btn';
    addColBtn.innerHTML = '+';
    addColBtn.title = 'Add Column';
    addColBtn.onclick = () => addTableColumn(table);
    wrapper.appendChild(addColBtn);
    
    // Add row add button (bottom edge)
    const addRowBtn = document.createElement('div');
    addRowBtn.className = 'table-add-row-btn';
    addRowBtn.innerHTML = '+';
    addRowBtn.title = 'Add Row';
    addRowBtn.onclick = () => addTableRow(table);
    wrapper.appendChild(addRowBtn);
    
    // Make columns resizable
    makeTableResizable(table);
    
    // Show/hide add buttons on hover
    wrapper.addEventListener('mouseenter', () => {
      addColBtn.style.opacity = '1';
      addRowBtn.style.opacity = '1';
    });
    
    wrapper.addEventListener('mouseleave', () => {
      addColBtn.style.opacity = '0';
      addRowBtn.style.opacity = '0';
    });
  };

  const addTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const cols = parseInt(table.getAttribute('data-cols') || '3');
    const newRow = document.createElement('tr');
    
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.textContent = '';
      td.className = 'table-cell';
      newRow.appendChild(td);
    }
    
    tbody.appendChild(newRow);
    table.setAttribute('data-rows', String(tbody.children.length + 1));
    
    // Update content
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
      setHasChanges(true);
    }
  };

  const addTableColumn = (table: HTMLTableElement) => {
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    
    if (!headerRow) return;
    
    // Add header cell
          const th = document.createElement('th');
      th.contentEditable = 'true';
      th.textContent = `Header ${headerRow.children.length + 1}`;
      th.className = 'table-header';
      headerRow.appendChild(th);
    
    // Add body cells
    bodyRows.forEach(row => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.textContent = '';
      td.className = 'table-cell';
      row.appendChild(td);
    });
    
    table.setAttribute('data-cols', String(headerRow.children.length));
    
    // Update content
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
      setHasChanges(true);
    }
  };

  const deleteTable = (table: HTMLTableElement) => {
    const wrapper = table.parentElement;
    if (wrapper && wrapper.classList.contains('table-wrapper')) {
      wrapper.remove();
    } else {
      table.remove();
    }
    
    // Update content
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
      setHasChanges(true);
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
              {/* Priority selector */}
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent');
                  setHasChanges(true);
                }}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
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
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center flex-shrink-0"
              title="Import Document"
              type="button"
            >
              <FileUp size={16} />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center flex-shrink-0"
              title="Export Document"
              type="button"
            >
              <Download size={16} />
            </button>
            <button
              onClick={insertTable}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center flex-shrink-0"
              title="Insert Table"
              type="button"
            >
              <Table size={16} />
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
                       }
                       .note-editor h2 {
                         font-size: 1.5rem !important;
                         font-weight: 600 !important;
                         line-height: 1.3 !important;
                         margin-bottom: 0.75rem !important;
                         margin-top: 1.25rem !important;
                         display: block !important;
                         max-width: 100% !important;
                         width: 100% !important;
                       }
                       .note-editor h3 {
                         font-size: 1.25rem !important;
                         font-weight: 600 !important;
                         line-height: 1.4 !important;
                         margin-bottom: 0.5rem !important;
                         margin-top: 1rem !important;
                         display: block !important;
                         max-width: 100% !important;
                         width: 100% !important;
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
                       
                       /* Table Styles */
                       .note-editor .table-wrapper {
                         position: relative !important;
                         margin: 1rem 0 !important;
                         display: inline-block !important;
                       }
                       
                       .note-editor .note-table {
                         border-collapse: collapse !important;
                         border: 1px solid #d1d5db !important;
                         border-radius: 0.375rem !important;
                         overflow: hidden !important;
                         background: white !important;
                         box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                       }
                       
                       .note-editor .note-table th,
                       .note-editor .note-table td {
                         border: 1px solid #e5e7eb !important;
                         padding: 0.75rem !important;
                         text-align: left !important;
                         vertical-align: top !important;
                         min-width: 120px !important;
                         position: relative !important;
                       }
                       
                       .note-editor .note-table th {
                         background-color: #f8fafc !important;
                         font-weight: 600 !important;
                         color: #1e293b !important;
                         border-bottom: 2px solid #e2e8f0 !important;
                       }
                       
                       .note-editor .note-table td {
                         background-color: #ffffff !important;
                       }
                       
                       .note-editor .note-table td:hover {
                         background-color: #f8fafc !important;
                       }
                       
                       /* Notion-style add buttons */
                       .note-editor .table-add-col-btn,
                       .note-editor .table-add-row-btn {
                         position: absolute !important;
                         width: 24px !important;
                         height: 24px !important;
                         background: #3b82f6 !important;
                         color: white !important;
                         border-radius: 50% !important;
                         display: flex !important;
                         align-items: center !important;
                         justify-content: center !important;
                         cursor: pointer !important;
                         font-size: 16px !important;
                         font-weight: bold !important;
                         opacity: 0 !important;
                         transition: all 0.2s ease !important;
                         z-index: 10 !important;
                         box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3) !important;
                       }
                       
                       .note-editor .table-add-col-btn {
                         top: 50% !important;
                         right: -12px !important;
                         transform: translateY(-50%) !important;
                       }
                       
                       .note-editor .table-add-row-btn {
                         bottom: -12px !important;
                         left: 50% !important;
                         transform: translateX(-50%) !important;
                       }
                       
                       .note-editor .table-add-col-btn:hover,
                       .note-editor .table-add-row-btn:hover {
                         background: #2563eb !important;
                         transform: scale(1.1) !important;
                         box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
                       }
                       
                       /* Delete button */
                       .note-editor .table-delete-btn {
                         position: absolute !important;
                         top: -8px !important;
                         right: -8px !important;
                         width: 20px !important;
                         height: 20px !important;
                         background: #ef4444 !important;
                         color: white !important;
                         border: none !important;
                         border-radius: 50% !important;
                         cursor: pointer !important;
                         font-size: 14px !important;
                         font-weight: bold !important;
                         opacity: 0 !important;
                         transition: all 0.2s ease !important;
                         z-index: 10 !important;
                         box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
                       }
                       
                       .note-editor .table-delete-btn:hover {
                         background: #dc2626 !important;
                         transform: scale(1.1) !important;
                         box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4) !important;
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
                    key={`note-${note?.id || 'new'}-${isInitialized}`}
                    className="outline-none focus:outline-none note-editor w-full"
                    onInput={(e) => {
                      // Save cursor position before updating content
                      const savedRange = saveCursorPosition();
                      
                      const newContent = e.currentTarget.innerHTML;
                      setContent(newContent);
                      setHasChanges(true);
                      handleFormattingChange();
                      
                      // Restore cursor position after a short delay to allow React to re-render
                      setTimeout(() => {
                        restoreCursorPosition(savedRange);
                      }, 0);
                    }}
                    onBlur={handleFormattingChange}
                    onKeyUp={handleFormattingChange}
                    onKeyDown={(e) => {
                      // Handle Backspace key for lists
                      if (e.key === 'Backspace') {
                        handleListBackspace(e);
                      }

                      // Handle Enter key for lists
                      if (e.key === 'Enter') {
                        const range = getSelection();
                        if (!range) return;

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
                      
                      // Handle space key for auto-conversion
                      if (e.key === ' ') {
                        const range = getSelection();
                        if (!range) return;

                        const container = range.commonAncestorContainer;
                        if (container.nodeType === Node.TEXT_NODE) {
                          const text = container.textContent || '';
                          if (text.trim().endsWith('-')) {
                            // Convert to bullet list
                            setTimeout(() => {
                              convertToBulletList();
                            }, 10);
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
    </div>
  );
};

export default NoteEditor;