// frontend/src/components/notes/NoteEditor.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../../utils/axiosConfig';
import { API_BASE_URL } from '../../config/api';
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
import { createSimpleTable, createCodeBlock, makeTableResizable, copyCodeBlock, normalizeCodeBlocks } from './editor/tableHelpers';
import { convertTextToHtml, linkifyContent, insertImage, getSelection, restoreSelection, convertMarkdownToHTML } from './editor/editorUtils';

// Use local worker file from public folder (most reliable)
// The worker file should be in public/pdf.worker.min.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  is_archived?: boolean;
  archived_at?: string | null;
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

// Match palette in TextFormatting: first color is default (cream), no bright yellow
/** Place the caret at the start/end of an element's contents. */
const placeCaretIn = (el: HTMLElement, atStart = false) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(atStart);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

/** True when everything before the caret inside `el` is whitespace. */
const isCaretAtStartOf = (el: HTMLElement): boolean => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;
  const probe = document.createRange();
  probe.selectNodeContents(el);
  probe.setEnd(range.startContainer, range.startOffset);
  return probe.toString().replace(/[\s\u200B]/g, '') === '';
};

/**
 * Notion-style Backspace inside a bullet/numbered item: an empty item is removed
 * (caret steps back to the previous item) and a non-empty item at its start is
 * lifted out into a paragraph instead of merging into the item above.
 */
const handleListBackspace = (e: React.KeyboardEvent<HTMLDivElement>): boolean => {
  if (e.key !== 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  let node: Node | null = selection.anchorNode;
  let item: HTMLElement | null = null;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
      item = node as HTMLElement;
      break;
    }
    node = node.parentNode;
  }
  if (!item || !isCaretAtStartOf(item)) return false;

  const list = item.parentElement;
  if (!list) return false;

  e.preventDefault();

  const isEmpty = (item.textContent || '').replace(/[\s\u200B]/g, '') === '';
  const detached = item;
  const previousItem = detached.previousElementSibling as HTMLElement | null;

  if (!isEmpty) {
    // Turn this bullet back into a plain paragraph in place (keeps the text, drops the marker).
    // Items after it stay a list, so the document order is preserved.
    const siblings = [...list.children];
    const laterItems = siblings.slice(siblings.indexOf(detached) + 1);
    const paragraph = document.createElement('p');
    paragraph.innerHTML = detached.innerHTML || '<br>';
    detached.remove();

    list.parentNode?.insertBefore(paragraph, list.nextSibling);
    if (laterItems.length) {
      const trailingList = list.cloneNode(false) as HTMLElement;
      laterItems.forEach((node) => trailingList.appendChild(node));
      paragraph.parentNode?.insertBefore(trailingList, paragraph.nextSibling);
    }
    if (!list.querySelector('li')) list.remove();
    placeCaretIn(paragraph, true);
    return true;
  }

  if (previousItem) {
    detached.remove();
    if (!list.querySelector('li')) list.remove();
    placeCaretIn(previousItem, false);
    return true;
  }

  // Empty first item: step out of the list entirely.
  const paragraph = document.createElement('p');
  paragraph.innerHTML = '<br>';
  list.parentNode?.insertBefore(paragraph, list);
  detached.remove();
  if (!list.querySelector('li')) list.remove();
  placeCaretIn(paragraph, true);
  return true;
};

/** Distinct line tops covered by a range - one entry per rendered line of content. */
const lineTops = (range: Range): number[] => {
  const tops = new Set<number>();
  Array.from(range.getClientRects()).forEach((rect) => {
    if (rect.height > 0) tops.add(Math.round(rect.top));
  });
  return Array.from(tops).sort((a, b) => a - b);
};

/**
 * Notion-style keyboard movement between table cells.
 *
 * Every <td> is its own contenteditable host, so once the caret sits inside one the
 * browser cannot reach the cell vertically below: ArrowDown lands on the next editing
 * host in DOM order (the cell to the right) instead. Step out of the cell ourselves -
 * but only once the caret has run out of lines *inside* it, so a wrapped cell still
 * moves by line first.
 */
const handleTableCellNavigation = (e: React.KeyboardEvent<HTMLDivElement>): boolean => {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const anchor = selection.anchorNode;
  if (!anchor) return false;
  const startEl = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement;
  const cell = startEl?.closest('td, th') as HTMLTableCellElement | null;
  const table = cell?.closest('table') as HTMLTableElement | null;
  const rowEl = cell?.parentElement as HTMLTableRowElement | null;
  if (!cell || !table || !rowEl) return false;

  const rows = Array.from(table.rows);
  const cells = Array.from(rowEl.cells) as HTMLTableCellElement[];
  const row = rows.indexOf(rowEl);
  const col = cells.indexOf(cell);
  if (row < 0 || col < 0) return false;

  const range = selection.getRangeAt(0);
  const isEmptyText = (text: string) => text.replace(/[\s\u200B]/g, '') === '';
  const caretAtCellStart = () => {
    const probe = range.cloneRange();
    probe.setStart(cell, 0);
    return isEmptyText(probe.toString());
  };
  const caretAtCellEnd = () => {
    const probe = range.cloneRange();
    probe.setEnd(cell, cell.childNodes.length);
    return isEmptyText(probe.toString());
  };
  // 0-based index of the line the caret sits on, and the cell's last line index.
  const caretLine = (() => {
    const before = document.createRange();
    before.selectNodeContents(cell);
    before.setEnd(range.startContainer, range.startOffset);
    const whole = document.createRange();
    whole.selectNodeContents(cell);
    return { index: Math.max(0, lineTops(before).length - 1), last: Math.max(0, lineTops(whole).length - 1) };
  })();

  let target: HTMLTableCellElement | null = null;
  let landAtEnd = false;
  let keepHorizontalPosition = false;

  if (e.key === 'ArrowDown') {
    if (caretLine.index < caretLine.last) return false; // more lines below, stay in this cell
    const nextRow = rows[row + 1];
    target = (nextRow?.cells[Math.min(col, nextRow.cells.length - 1)] as HTMLTableCellElement) ?? null;
    keepHorizontalPosition = true;
  } else if (e.key === 'ArrowUp') {
    if (caretLine.index > 0) return false; // more lines above, stay in this cell
    const prevRow = rows[row - 1];
    target = (prevRow?.cells[Math.min(col, prevRow.cells.length - 1)] as HTMLTableCellElement) ?? null;
    keepHorizontalPosition = true;
  } else if (e.key === 'ArrowRight') {
    if (!caretAtCellEnd()) return false;
    target = col < cells.length - 1
      ? cells[col + 1]
      : ((rows[row + 1]?.cells[0] as HTMLTableCellElement) ?? null);
  } else if (e.key === 'ArrowLeft') {
    if (!caretAtCellStart()) return false;
    const prevRow = rows[row - 1];
    target = col > 0
      ? cells[col - 1]
      : ((prevRow?.cells[prevRow.cells.length - 1] as HTMLTableCellElement) ?? null);
    landAtEnd = true;
  } else if (e.shiftKey) {
    const prevRow = rows[row - 1];
    target = col > 0
      ? cells[col - 1]
      : ((prevRow?.cells[prevRow.cells.length - 1] as HTMLTableCellElement) ?? null);
    landAtEnd = true;
  } else {
    target = col < cells.length - 1
      ? cells[col + 1]
      : ((rows[row + 1]?.cells[0] as HTMLTableCellElement) ?? null);
  }

  if (!target) return false;
  e.preventDefault();

  target.focus({ preventScroll: true });

  // Moving vertically should keep the caret's x position, as Notion does.
  const caretRects = Array.from(range.getClientRects()).filter((rect) => rect.height > 0);
  const caretX = keepHorizontalPosition && caretRects.length ? caretRects[caretRects.length - 1].right : null;
  const targetRect = target.getBoundingClientRect();
  const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
  const hit = caretX !== null && targetRect.width > 0
    ? (doc.caretRangeFromPoint?.(
        Math.min(Math.max(caretX, targetRect.left + 1), targetRect.right - 1),
        Math.min(Math.max(targetRect.top + targetRect.height / 2, targetRect.top + 1), targetRect.bottom - 1)
      ) ?? null)
    : null;

  const caret = document.createRange();
  if (hit && target.contains(hit.startContainer)) {
    caret.setStart(hit.startContainer, hit.startOffset);
  } else {
    caret.selectNodeContents(target);
  }
  caret.collapse(!landAtEnd);
  const next = window.getSelection();
  next?.removeAllRanges();
  next?.addRange(caret);
  return true;
};

/** The code block's editing area the caret currently sits in, if any. */
const codeAreaAtCaret = (): HTMLElement | null => {
  const anchor = window.getSelection()?.anchorNode;
  if (!anchor) return null;
  const host = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement;
  return (host?.closest('.code-block-content') as HTMLElement | null) ?? null;
};

/**
 * Notion-style keyboard behaviour inside a code block.
 *
 * Delegated from the editor's onKeyDown (rather than bound per block) so blocks restored
 * from saved HTML behave exactly like freshly inserted ones. The code area is a
 * plain-text editing host, so Enter already inserts a real line break; what it cannot do
 * is leave the block, and the document's markdown shortcut would otherwise rewrite code
 * lines such as "-" or "#". This covers Tab indentation, the block's edges, and
 * removing an empty block.
 */
const handleCodeBlockKeyDown = (
  e: React.KeyboardEvent<HTMLDivElement>,
  notifyChange: () => void
): boolean => {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const codeArea = codeAreaAtCaret();
  const container = codeArea?.closest('.code-block-container') as HTMLElement | null;
  if (!codeArea || !container) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);

  const isEmptyText = (text: string) => text.replace(/[\s\u200B]/g, '').length === 0;
  const before = document.createRange();
  before.selectNodeContents(codeArea);
  before.setEnd(range.startContainer, range.startOffset);
  const beforeText = before.toString();
  const whole = document.createRange();
  whole.selectNodeContents(codeArea);
  const text = codeArea.textContent || '';
  const caretLine = Math.max(0, lineTops(before).length - 1);
  const lastLine = Math.max(0, lineTops(whole).length - 1);
  const caretX = (() => {
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.height > 0);
    return rects.length ? rects[rects.length - 1].right : null;
  })();

  const previousBlock = () => container.previousElementSibling as HTMLElement | null;
  const nextBlock = () => container.nextElementSibling as HTMLElement | null;

  /** Where a caret landing from outside should actually go inside a following/preceding block. */
  const landingSpot = (el: HTMLElement): HTMLElement => {
    if (el.classList.contains('table-wrapper')) return (el.querySelector('td, th') as HTMLElement | null) ?? el;
    if (el.classList.contains('code-block-container')) {
      return (el.querySelector('.code-block-content') as HTMLElement | null) ?? el;
    }
    return el;
  };

  /** Put the caret in another block, staying on the line closest to the caret's x. */
  const caretInto = (target: HTMLElement, atEnd: boolean) => {
    const rect = target.getBoundingClientRect();
    const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const hit = caretX !== null && rect.width > 0
      ? doc.caretRangeFromPoint?.(
          Math.min(Math.max(caretX, rect.left + 1), rect.right - 1),
          Math.min(rect.top + 4, rect.bottom - 1)
        ) ?? null
      : null;
    const caret = document.createRange();
    if (hit && target.contains(hit.startContainer)) {
      caret.setStart(hit.startContainer, hit.startOffset);
    } else {
      caret.selectNodeContents(target);
      caret.collapse(!atEnd);
    }
    const next = window.getSelection();
    next?.removeAllRanges();
    next?.addRange(caret);
  };

  /** An empty paragraph directly after the block, for when there is nothing below it. */
  const paragraphBelow = () => {
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';
    container.parentNode?.insertBefore(paragraph, container.nextSibling);
    return paragraph;
  };

  /**
   * Rewrite the code text and put the caret back at a text offset. The area holds
   * plain text, so one text node is all it needs - and an offset is a far more
   * reliable caret target than a node the browser may not have kept.
   */
  const setCodeText = (next: string, caretOffset: number) => {
    codeArea.textContent = next;
    const node = codeArea.firstChild;
    const caret = document.createRange();
    if (node) caret.setStart(node, Math.min(Math.max(caretOffset, 0), next.length));
    else caret.selectNodeContents(codeArea);
    caret.collapse(true);
    const nextSelection = window.getSelection();
    nextSelection?.removeAllRanges();
    nextSelection?.addRange(caret);
  };

  // Backspace on an empty block removes it and steps back into the text above.
  if (e.key === 'Backspace' && isEmptyText(text)) {
    e.preventDefault();
    const previous = previousBlock();
    const owner = previous ?? paragraphBelow();
    container.remove();
    caretInto(owner, !!previous);
    notifyChange();
    return true;
  }

  // Tab indents with spaces instead of leaving the block; Shift+Tab shaves one indent.
  if (e.key === 'Tab') {
    e.preventDefault();
    const lineStart = beforeText.lastIndexOf('\n') + 1;

    if (e.shiftKey) {
      const indent = beforeText.slice(lineStart).match(/^ {1,2}/)?.[0] || '';
      if (indent) {
        setCodeText(
          text.slice(0, lineStart) + text.slice(lineStart + indent.length),
          beforeText.length - indent.length
        );
        notifyChange();
      }
      return true;
    }

    const spaces = document.createTextNode('  ');
    range.deleteContents();
    range.insertNode(spaces);
    const caret = document.createRange();
    // Inside the inserted spaces, so the caret keeps a text node to live in.
    caret.setStart(spaces, spaces.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    notifyChange();
    return true;
  }

  // Enter in an empty block leaves it behind (Enter otherwise breaks the line, as code should).
  if (e.key === 'Enter' && isEmptyText(text)) {
    e.preventDefault();
    const paragraph = paragraphBelow();
    container.remove();
    caretInto(paragraph, false);
    notifyChange();
    return true;
  }

  // Arrows walk out of the block at its edges, so the caret never gets stuck inside.
  if (e.key === 'ArrowDown' && caretLine >= lastLine) {
    e.preventDefault();
    const next = nextBlock();
    caretInto(next ? landingSpot(next) : paragraphBelow(), false);
    return true;
  }
  if (e.key === 'ArrowUp' && caretLine === 0) {
    const previous = previousBlock();
    if (!previous) return false; // nothing above: leave the caret where it is
    e.preventDefault();
    caretInto(landingSpot(previous), true);
    return true;
  }
  if (e.key === 'ArrowLeft' && isEmptyText(beforeText)) {
    const previous = previousBlock();
    if (!previous) return false;
    e.preventDefault();
    caretInto(landingSpot(previous), true);
    return true;
  }
  if (e.key === 'ArrowRight' && isEmptyText(text.slice(beforeText.length))) {
    const next = nextBlock();
    if (!next) return false;
    e.preventDefault();
    caretInto(landingSpot(next), false);
    return true;
  }

  return false;
};

const HIGHLIGHT_COLORS = [
  { name: 'Cream', value: '#fff3cd' },
  { name: 'Light Blue', value: '#d1ecf1' },
  { name: 'Light Green', value: '#d4edda' },
  { name: 'Light Orange', value: '#ffeaa7' },
  { name: 'Light Purple', value: '#e8d5ff' },
  { name: 'Light Red', value: '#ffd6d6' },
];

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isNewNote,
  onSave,
  onDelete,
  onBack,
  isSaving = false,
}) => {
  // Check if note is archived - if so, make it read-only
  const isReadOnly = note?.is_archived || false;
  
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
  const [selectedColor, setSelectedColor] = useState<string>('#fff3cd');
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
  const handleSave = useCallback(() => {
    // Don't allow saving if note is archived (read-only)
    if (isReadOnly) {
      return;
    }
    
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
  }, [isReadOnly, title, priority, onSave]);

  // Debounced save
  const debouncedSave = useCallback(() => {
    // Don't auto-save if note is archived (read-only)
    if (isReadOnly) {
      return;
    }
    
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      if (hasChanges) {
        handleSave();
      }
    }, AUTO_SAVE_DELAY);
  }, [title, priority, hasChanges, isReadOnly]);

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

  // Make existing tables resizable
  useEffect(() => {
    if (contentEditableRef.current) {
      const tables = contentEditableRef.current.querySelectorAll('table');
      tables.forEach((table) => {
        // Check if table is already made resizable by checking for resize handles
        const hasResizers = table.querySelector('td > div[style*="col-resize"]');
        if (!hasResizers) {
          makeTableResizable(table as HTMLTableElement);
        }
      });
    }
  }, [content, isInitialized]);

  // Bring code blocks saved with the older chrome onto the current markup
  useEffect(() => {
    if (contentEditableRef.current) {
      normalizeCodeBlocks(contentEditableRef.current);
    }
  }, [content, isInitialized]);

  // Focus editor on load
  useEffect(() => {
    if (contentEditableRef.current && !isInitialized) {
      contentEditableRef.current.focus();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Helper: detect if selection has highlight (queryCommandValue is unreliable, so check DOM)
  const selectionHasHighlight = (sel: Selection): boolean => {
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const editor = contentEditableRef.current;
    if (!editor) return false;
    const hasInlineBg = (node: Node): boolean => {
      if (!node || !editor.contains(node)) return false;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const bg = (node as HTMLElement).style?.backgroundColor;
        if (bg && bg !== 'transparent') return true;
      }
      return node.parentElement ? hasInlineBg(node.parentElement) : false;
    };
    if (hasInlineBg(range.startContainer) || hasInlineBg(range.endContainer)) return true;
    try {
      const contents = range.cloneContents();
      const walker = document.createTreeWalker(contents, NodeFilter.SHOW_ELEMENT, null);
      let el: Node | null = walker.nextNode();
      while (el) {
        if ((el as HTMLElement).style?.backgroundColor && (el as HTMLElement).style.backgroundColor !== 'transparent') return true;
        el = walker.nextNode();
      }
    } catch (_) {}
    const cmdVal = document.queryCommandValue('hiliteColor');
    return !!(cmdVal && cmdVal !== 'transparent' && cmdVal !== '');
  };

  // Global keyboard shortcuts: Ctrl+S save, Ctrl+Shift+H highlight toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+S / Cmd+S to save note
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's "Save As" dialog
        if (!isReadOnly && hasChanges) {
          handleSave();
        }
      }
      // Ctrl+Shift+H: toggle highlight on selection (apply or remove)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
        const editor = contentEditableRef.current;
        const sel = window.getSelection();
        if (editor && sel && sel.rangeCount > 0 && !sel.isCollapsed && editor.contains(sel.anchorNode)) {
          e.preventDefault();
          const hasHighlight = selectionHasHighlight(sel);
          if (hasHighlight) {
            document.execCommand('hiliteColor', false, 'transparent');
            setActiveFormatting(prev => ({ ...prev, highlight: false }));
          } else {
            document.execCommand('hiliteColor', false, selectedColor);
            setActiveFormatting(prev => ({ ...prev, highlight: true }));
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [isReadOnly, hasChanges, handleSave, selectedColor]);

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

  // Mark the note dirty after an edit that only touched the DOM (code block keys).
  // Deliberately mirrors typing: it must not rewrite the content from React state,
  // which would replace the edited nodes and drop the caret.
  const notifyEditorChange = () => {
    const editor = contentEditableRef.current;
    if (!editor) return;
    setHasChanges(true);
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  };

  // Formatting
  const toggleFormatting = (command: string, value: string = '') => {
    if (!contentEditableRef.current) return;
    contentEditableRef.current.focus();
    
    if (command === 'formatBlock' && value === 'pre') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        const container = range.commonAncestorContainer;
        const codeBlockContainer = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement?.closest('.code-block-container')
          : (container as Element).closest('.code-block-container');
        
        if (codeBlockContainer) {
          // Unwrapping the whole block, and only its code: the header labels are chrome.
          const codeText = codeBlockContainer.querySelector('.code-block-content')?.textContent || '';
          const textNode = document.createTextNode(codeText);
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

  // Alignment (never touch inline formatting – removeFormat used to wipe bold/italic/highlight)
  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
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
            
            // Get current content and append imported content
            const currentContent = contentEditableRef.current?.innerHTML || content || '';
            const separator = '<hr style="margin: 24px 0; border: none; border-top: 2px solid #e5e7eb; dark:border-gray-600;" class="dark:border-gray-600" />';
            const fileName = file.name.replace('.pdf', '');
            const importHeader = `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #6366f1; font-weight: 600;" class="text-indigo-600 dark:text-indigo-400">📄 Imported from: ${fileName}</h3>`;
            const newContent = currentContent 
              ? `${currentContent}${separator}${importHeader}${htmlContent}`
              : `${importHeader}${htmlContent}`;
            
            // Update both state and contentEditable
            setContent(newContent);
            if (contentEditableRef.current) {
              contentEditableRef.current.innerHTML = newContent;
              // Scroll to bottom to show imported content
              setTimeout(() => {
                if (contentEditableRef.current) {
                  contentEditableRef.current.scrollTop = contentEditableRef.current.scrollHeight;
                }
              }, 100);
            }
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
      
      const response = await axiosInstance.post('/notes/convert-doc/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      if (!response.data.text) {
        throw new Error('No text could be extracted from the document.');
      }
      
      // Get current content and append imported content
      const currentContent = contentEditableRef.current?.innerHTML || content || '';
      const separator = '<hr style="margin: 24px 0; border: none; border-top: 2px solid #e5e7eb; dark:border-gray-600;" class="dark:border-gray-600" />';
      const fileName = file.name.replace('.docx', '').replace('.doc', '');
      const importHeader = `<h3 style="margin-top: 24px; margin-bottom: 12px; color: #6366f1; font-weight: 600;" class="text-indigo-600 dark:text-indigo-400">📄 Imported from: ${fileName}</h3>`;
      // Convert text to HTML if it's plain text, otherwise use as-is if already HTML
      const importedContent = response.data.text.includes('<') ? response.data.text : convertTextToHtml(response.data.text);
      const newContent = currentContent 
        ? `${currentContent}${separator}${importHeader}${importedContent}`
        : `${importHeader}${importedContent}`;
      
      // Update both state and contentEditable
      setContent(newContent);
      if (contentEditableRef.current) {
        contentEditableRef.current.innerHTML = newContent;
        // Scroll to bottom to show imported content
        setTimeout(() => {
          if (contentEditableRef.current) {
            contentEditableRef.current.scrollTop = contentEditableRef.current.scrollHeight;
          }
        }, 100);
      }
      setHasChanges(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to process document. Please try again.');
    }
  };

  const handleExportNote = async (format: 'pdf' | 'doc') => {
    if (!note) return;
    
    try {
      const response = await axiosInstance.post(`/notes/export/`, {
        note_id: note.id,
        format: format
      }, {
        responseType: 'blob'
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
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[9999] flex flex-col overflow-x-hidden" style={{ position: 'fixed', top: '-100vh', left: 0, right: 0, bottom: 0, marginTop: '100vh' }}>
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
        isReadOnly={isReadOnly}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex min-w-0">
          {/* Editor */}
          <div className={`flex-1 overflow-y-auto p-4 min-w-0 flex justify-center ${pageView ? 'bg-gray-100 dark:bg-gray-900 note-editor-outer-bg' : ''}`}>
            <div className={`${pageView ? 'w-full flex justify-center' : 'w-full'}`}>
              <div
                className={`${pageView ? 'bg-white dark:bg-gray-800 note-editor-page-bg shadow transition-[width] duration-200' : ''}`}
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
                    /* Base document rhythm — calm, readable, Notion-like */
                    .note-editor { width: 100%; max-width: 100%; overflow-wrap: break-word; word-wrap: break-word; word-break: normal; white-space: normal; box-sizing: border-box; height: auto; font-size: 15px; line-height: 1.65; color: #1f2937; }
                    .dark .note-editor { color: #e5e7eb; }
                    .note-editor * { box-sizing: border-box; }
                    .note-editor > *:first-child { margin-top: 0; }
                    .note-editor p { margin: 0 0 0.7rem; line-height: 1.65; }
                    .note-editor p:last-child { margin-bottom: 0; }
                    .note-editor h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.25; margin: 1.4rem 0 0.4rem; color: #111827; }
                    .note-editor h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.3; margin: 1.2rem 0 0.35rem; color: #111827; }
                    .note-editor h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.35; margin: 1rem 0 0.3rem; color: #111827; }
                    .dark .note-editor h1, .dark .note-editor h2, .dark .note-editor h3 { color: #f9fafb; }
                    .note-editor ul, .note-editor ol { padding-left: 1.5rem; margin: 0.25rem 0 0.8rem; }
                    .note-editor ul { list-style-type: disc; }
                    .note-editor ol { list-style-type: decimal; }
                    .note-editor li { margin: 0.15rem 0; line-height: 1.65; }
                    .note-editor li::marker { color: #9ca3af; }
                    .note-editor li p { margin: 0; }
                    .note-editor a { color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; }
                    .dark .note-editor a { color: #a5b4fc; }
                    .note-editor blockquote { margin: 0.8rem 0; padding-left: 0.9rem; border-left: 3px solid #e5e7eb; color: #4b5563; }
                    .dark .note-editor blockquote { border-left-color: #3f3f46; color: #d4d4d8; }
                    .note-editor hr { border: none; border-top: 1px solid #e9e9e7; margin: 1.5rem 0; }
                    .dark .note-editor hr { border-top-color: #333333; }
                    .note-editor img, .note-editor iframe, .note-editor video { max-width: 100%; height: auto; border-radius: 6px; display: block; margin: 0.75rem 0; }
                    /* Highlights stay readable in both themes (dark text on the pastel fill) */
                    .note-editor [style*="background-color"] { color: #111827 !important; }
                    .note-editor [style*="background-color"] a { color: #3730a3 !important; }
                    /* Tables — every cell keeps a real line box so rows never collapse */
                    .note-editor .table-wrapper { margin: 0.75rem 0 1rem; }
                    .note-editor .notion-table { border-collapse: collapse !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; background: transparent !important; border: none !important; table-layout: fixed !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
                    .note-editor .notion-table td { border: 1px solid #e9e9e7 !important; padding: 6px 10px !important; background: transparent !important; cursor: text !important; height: 2.25rem !important; min-height: 2.25rem !important; max-width: 320px !important; line-height: 1.5 !important; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; color: inherit !important; vertical-align: top !important; }
                    .dark .note-editor .notion-table td { border: 1px solid #333333 !important; }
                    .note-editor .notion-table td:hover { background: rgba(0, 0, 0, 0.03) !important; }
                    .dark .note-editor .notion-table td:hover { background: rgba(255, 255, 255, 0.04) !important; }
                    /* Code blocks - monospace editing area inside the block's own surface */
                    .note-editor .code-block-content { margin: 0 !important; padding: 10px 12px !important; min-height: 2.5rem !important; overflow-x: auto !important; font-family: 'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace !important; font-size: 12.5px !important; line-height: 1.6 !important; white-space: pre !important; tab-size: 2 !important; color: #1f2937 !important; outline: none !important; }
                    .dark .note-editor .code-block-content { color: #d4d4d4 !important; }
                    .note-editor .code-block-content:empty::before { content: attr(data-placeholder); color: #9ca3af; }
                    .dark .note-editor .code-block-content:empty::before { color: #6b7280; }
                    .note-editor .code-block-copy { line-height: 1; }
                    /* Header labels are generated text: the block exports as code, never "Code Copy" */
                    .note-editor .code-block-label::after { content: 'Code'; }
                    .note-editor .code-block-copy::after { content: 'Copy'; }
                    .note-editor .code-block-copy[data-copied]::after { content: 'Copied'; }
                  `}</style>
                  
                  {isReadOnly && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Note is archived.</strong> Unarchive this note to edit it.
                      </p>
                    </div>
                  )}
                  <div
                    ref={contentEditableRef}
                    contentEditable={!isReadOnly}
                    className={`outline-none focus:outline-none note-editor w-full ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
                    onInput={() => {
                      if (isReadOnly) return;
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
                      // Code block copy buttons are delegated, so restored blocks work too.
                      const copyButton = target.closest('.code-block-copy') as HTMLElement | null;
                      if (copyButton) {
                        e.preventDefault();
                        copyCodeBlock(copyButton);
                        return;
                      }
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
                      // Backspace at the start of a list item: remove the bullet instead of
                      // merging the item into the line above.
                      if (!isReadOnly && handleListBackspace(e)) return;

                      // Inside a code block: Tab indents, arrows leave at the edges, and an
                      // empty block is removed instead of swallowing the caret.
                      if (!isReadOnly && handleCodeBlockKeyDown(e, notifyEditorChange)) return;

                      // Arrows / Tab inside a table cell: move to the cell that is actually
                      // next in that direction (the browser stops at the editing host).
                      if (!isReadOnly && handleTableCellNavigation(e)) return;

                      // Handle Ctrl+S / Cmd+S to save note
                      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault(); // Prevent browser's "Save As" dialog
                        if (!isReadOnly && hasChanges) {
                          handleSave();
                        }
                        return;
                      }
                      
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
                        // Markdown shortcuts are for prose; never rewrite code.
                        if (codeAreaAtCaret()) return;

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
