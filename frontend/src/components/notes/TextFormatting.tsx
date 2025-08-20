import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Strikethrough,
  Quote,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';

interface TextFormattingProps {
  activeFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    blockquote: boolean;
    highlight: boolean;
  };
  onToggleFormatting: (command: string, value?: string) => void;
  onShowColorPicker: () => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  selectedColor: string;
  onSelectHighlightColor: (color: string) => void;
  highlightColors: Array<{ name: string; value: string }>;
}

const TextFormatting: React.FC<TextFormattingProps> = ({
  activeFormatting,
  onToggleFormatting,
  onShowColorPicker,
  onAlignmentChange,
  selectedColor,
  onSelectHighlightColor,
  highlightColors
}) => {
  // Debug: Log the highlightColors prop
  console.log('TextFormatting highlightColors:', highlightColors);
  console.log('TextFormatting component rendering');
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableMenuPosition, setTableMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const getActiveEditable = (): HTMLElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node: Node | null = selection.anchorNode;
    while (node) {
      if ((node as HTMLElement).getAttribute && (node as HTMLElement).getAttribute('contenteditable') !== null) {
        return node as HTMLElement;
      }
      node = node.parentNode;
    }
    return document.querySelector('[contenteditable]') as HTMLElement | null;
  };

  const syncActiveEditable = () => {
    const el = getActiveEditable();
    if (el) {
      // Trigger React onInput listener in BlockEditor
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

     const handleFormattingClick = (command: string, value?: string) => {
     console.log('handleFormattingClick called:', { command, value });
     
     // Ensure we have a selection in a contentEditable element
     const selection = window.getSelection();
     if (!selection || selection.rangeCount === 0) {
       console.log('No selection found, trying to focus contentEditable');
       // If no selection, try to focus the first contentEditable element
       const contentEditable = document.querySelector('[contenteditable]') as HTMLElement;
       if (contentEditable) {
         contentEditable.focus();
         const range = document.createRange();
         range.selectNodeContents(contentEditable);
         range.collapse(false);
         selection?.removeAllRanges();
         selection?.addRange(range);
         console.log('Focused contentEditable element');
       } else {
         console.log('No contentEditable element found');
       }
     }
     
     console.log('Calling onToggleFormatting with:', { command, value });
     onToggleFormatting(command, value);
     // Ensure BlockEditor state updates after execCommand
     syncActiveEditable();
   };

   const toggleColorMenu = (e: React.MouseEvent) => {
     e.preventDefault();
     setShowColorMenu(prev => !prev);
   };  

  // Utilities for table manipulation
  const findParentTag = (node: Node | null, tagName: string): HTMLElement | null => {
    let current: Node | null = node;
    const upper = tagName.toUpperCase();
    while (current) {
      if ((current as HTMLElement).tagName === upper) return current as HTMLElement;
      current = current.parentNode;
    }
    return null;
  };

  const getCellIndexInRow = (cell: HTMLTableCellElement): number => {
    if (!cell.parentElement) return -1;
    const row = cell.parentElement as HTMLTableRowElement;
    return Array.from(row.children).indexOf(cell);
  };

  const buildTableHTML = (rows: number, cols: number): string => {
    const td = '<td contenteditable="true" class="border border-gray-300 dark:border-gray-600 p-2 align-top"></td>';
    const tr = `<tr>${Array.from({ length: cols }).map(() => td).join('')}</tr>`;
    const thead = '';
    const tbody = `<tbody>${Array.from({ length: rows }).map(() => tr).join('')}</tbody>`;
    return `<table class="table-fixed border-collapse w-full my-2">${thead}${tbody}</table>`;
  };

  const insertTableAtSelection = (rows: number, cols: number) => {
    if (rows < 1 || cols < 1) return;
    const html = buildTableHTML(rows, cols);
    document.execCommand('insertHTML', false, html);
    syncActiveEditable();
  };

  const handleInsertTable = () => {
    const rowsStr = prompt('Number of rows:', '3');
    if (!rowsStr) return;
    const colsStr = prompt('Number of columns:', '3');
    if (!colsStr) return;
    const rows = Math.max(1, parseInt(rowsStr, 10) || 0);
    const cols = Math.max(1, parseInt(colsStr, 10) || 0);
    insertTableAtSelection(rows, cols);
    setShowTableMenu(false);
  };

  const addRow = (position: 'above' | 'below') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const cell = findParentTag(selection.anchorNode, 'td') as HTMLTableCellElement | null;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = findParentTag(row, 'table') as HTMLTableElement;
    if (!table) return;
    const numCols = (row.children?.length || 1);
    const newRow = document.createElement('tr');
    for (let i = 0; i < numCols; i++) {
      const newCell = document.createElement('td');
      newCell.setAttribute('contenteditable', 'true');
      newCell.className = 'border border-gray-300 dark:border-gray-600 p-2 align-top';
      newRow.appendChild(newCell);
    }
    if (position === 'above') {
      row.parentElement?.insertBefore(newRow, row);
    } else {
      row.parentElement?.insertBefore(newRow, row.nextSibling);
    }
    syncActiveEditable();
  };

  const addColumn = (position: 'left' | 'right') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const cell = findParentTag(selection.anchorNode, 'td') as HTMLTableCellElement | null;
    if (!cell) return;
    const idx = getCellIndexInRow(cell);
    if (idx < 0) return;
    const table = findParentTag(cell, 'table') as HTMLTableElement;
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
    rows.forEach(r => {
      const newCell = document.createElement('td');
      newCell.setAttribute('contenteditable', 'true');
      newCell.className = 'border border-gray-300 dark:border-gray-600 p-2 align-top';
      const insertIndex = position === 'left' ? idx : idx + 1;
      if (insertIndex >= r.children.length) {
        r.appendChild(newCell);
      } else {
        r.insertBefore(newCell, r.children[insertIndex]);
      }
    });
    syncActiveEditable();
  };

  const deleteRow = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const cell = findParentTag(selection.anchorNode, 'td') as HTMLTableCellElement | null;
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = findParentTag(row, 'table') as HTMLTableElement;
    row.remove();
    // Remove table if no rows left
    if (table && table.querySelectorAll('tr').length === 0) table.remove();
    syncActiveEditable();
  };

  const deleteColumn = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const cell = findParentTag(selection.anchorNode, 'td') as HTMLTableCellElement | null;
    if (!cell) return;
    const idx = getCellIndexInRow(cell);
    const table = findParentTag(cell, 'table') as HTMLTableElement;
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
    rows.forEach(r => {
      if (idx >= 0 && idx < r.children.length) {
        r.children[idx].remove();
      }
    });
    // If all rows have 0 cells, remove table
    const anyCellsLeft = Array.from(table.querySelectorAll('tr')).some(r => (r as HTMLTableRowElement).children.length > 0);
    if (!anyCellsLeft) table.remove();
    syncActiveEditable();
  };

  const deleteTable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const table = findParentTag(selection.anchorNode, 'table') as HTMLTableElement | null;
    if (table) table.remove();
    syncActiveEditable();
  };

  const toggleTableMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTableMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    setShowTableMenu(prev => !prev);
  };

  // Close menu on outside click
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.table-menu') && !target.closest('.table-button')) {
        setShowTableMenu(false);
      }
      if (!target.closest('.color-menu') && !target.closest('.color-button')) {
        setShowColorMenu(false);
      }
    };
    if (showTableMenu) document.addEventListener('mousedown', handleClick);
    if (showColorMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTableMenu, showColorMenu]);

  return (
    <div className="flex items-center space-x-1 p-2">
      <button
        onClick={() => handleFormattingClick('bold')}
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
        onClick={() => handleFormattingClick('italic')}
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
        onClick={() => handleFormattingClick('underline')}
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
        onClick={() => handleFormattingClick('strikeThrough')}
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
        onClick={() => handleFormattingClick('formatBlock', 'blockquote')}
        className={`p-2 rounded-lg ${
          activeFormatting.blockquote
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
      <div className="relative inline-block">
        <button
          onClick={toggleColorMenu}
          className={`p-2 rounded-lg flex items-center space-x-1 highlight-button color-button ${
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

                          {showColorMenu && (
           <div
             className="absolute color-menu z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md p-3 flex gap-2"
             style={{ left: 0, top: '100%' }}
           >
             {/* Light highlight colors */}
             <button
               onClick={() => { onSelectHighlightColor('#fff3cd'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#fff3cd' }}
               title="Light Yellow"
             />
             <button
               onClick={() => { onSelectHighlightColor('#d1ecf1'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#d1ecf1' }}
               title="Light Blue"
             />
             <button
               onClick={() => { onSelectHighlightColor('#d4edda'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#d4edda' }}
               title="Light Green"
             />
                           <button
                onClick={() => { onSelectHighlightColor('#ffeaa7'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#ffeaa7' }}
                title="Light Orange"
              />
              <button
                onClick={() => { onSelectHighlightColor('#e8d5ff'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#e8d5ff' }}
                title="Light Purple"
              />
              <button
                onClick={() => { onSelectHighlightColor('#ffd6d6'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#ffd6d6' }}
                title="Light Red"
              />
             
             {/* Remove highlight option */}
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
             <button
               onClick={() => { onSelectHighlightColor('transparent'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform bg-white dark:bg-gray-700 flex items-center justify-center"
               title="Remove Highlight"
             >
               <div className="w-3 h-0.5 bg-gray-500 dark:bg-gray-400 rotate-45" />
             </button>
           </div>
         )}
      </div>
      
      {/* Separate Heading buttons */}
      <button
        onClick={() => {
          console.log('H1 button clicked!');
          handleFormattingClick('formatBlock', 'h1');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => {
          console.log('H2 button clicked!');
          handleFormattingClick('formatBlock', 'h2');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => {
          console.log('H3 button clicked!');
          handleFormattingClick('formatBlock', 'h3');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 3"
      >
        H3
      </button>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      <button
        onClick={() => onAlignmentChange('left')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => onAlignmentChange('center')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Center"
      >
        <AlignCenter size={16} />
      </button>
             <button
         onClick={() => onAlignmentChange('right')}
         className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
         title="Align Right"
       >
         <AlignRight size={16} />
       </button>
       <button
         onClick={() => onAlignmentChange('justify')}
         className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
         title="Justify"
       >
         <AlignJustify size={16} />
       </button>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      {/* Table tools */}
      <div className="relative">
        <button
          onClick={toggleTableMenu}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center space-x-1 table-button"
          title="Table tools"
          type="button"
        >
          <LayoutGrid size={16} />
          <ChevronDown size={14} />
        </button>
        {showTableMenu && (
          <div
            className="absolute table-menu z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md min-w-[220px]"
            style={{ left: 0 }}
          >
            <button onClick={handleInsertTable} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Insert table…</button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button onClick={() => addRow('above')} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Insert row above</button>
            <button onClick={() => addRow('below')} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Insert row below</button>
            <button onClick={() => addColumn('left')} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Insert column left</button>
            <button onClick={() => addColumn('right')} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Insert column right</button>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <button onClick={deleteRow} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Delete row</button>
            <button onClick={deleteColumn} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Delete column</button>
            <button onClick={deleteTable} className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">Delete table</button>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

      <button
        onClick={() => handleFormattingClick('insertUnorderedList')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => handleFormattingClick('insertOrderedList')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      <select
        onChange={(e) => handleFormattingClick('formatBlock', e.target.value)}
        className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
        defaultValue=""
      >
        <option value="">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="p">Paragraph</option>
      </select>
      

    </div>
  );
};

export default TextFormatting; 