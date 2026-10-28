// frontend/src/components/notes/editor/tableHelpers.ts

// Make table columns resizable
export const makeTableResizable = (table: HTMLTableElement) => {
  const rows = table.querySelectorAll('tr');
  
  // Make cell position relative for absolute positioning
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td, th');
    cells.forEach((cell) => {
      const c = cell as HTMLTableCellElement;
      if (!c.style.position || c.style.position === 'static') {
        c.style.position = 'relative';
      }
    });
  });
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('td, th');
    
    cells.forEach((col, colIndex) => {
      const cell = col as HTMLTableCellElement;
      
      // Skip if already has a resizer
      if (cell.hasAttribute('data-has-resizer')) return;
      cell.setAttribute('data-has-resizer', 'true');
      
      let startX: number;
      let startWidths: number[] = [];
      let isResizing = false;
      
      // Check if mouse is near the right edge of the cell
      const isNearRightEdge = (e: MouseEvent, element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const cellWidth = rect.width;
        return offsetX > cellWidth - 8; // Within 8px of right edge
      };
      
      const onMouseMove = (e: MouseEvent) => {
        if (isResizing) {
          const diff = e.pageX - startX;
          
          // Apply width to all cells in this column
          rows.forEach((r, rIndex) => {
            const c = r.querySelectorAll('td, th')[colIndex] as HTMLTableCellElement;
            if (c && startWidths[rIndex] !== undefined) {
              const newWidth = startWidths[rIndex] + diff;
              
              if (newWidth >= 50) { // Minimum width
                c.style.width = newWidth + 'px';
                c.style.minWidth = newWidth + 'px';
              }
            }
          });
        } else {
          // Change cursor and add visual indicator when hovering near right edge
          if (isNearRightEdge(e, cell)) {
        cell.style.cursor = 'col-resize';
        cell.style.boxShadow = 'inset -2px 0 0 0 #6366f1';
      } else {
        cell.style.cursor = 'text';
        cell.style.boxShadow = '';
          }
        }
      };
      
      const onMouseDown = (e: MouseEvent) => {
        // Only activate if clicking near the right edge
        if (!isNearRightEdge(e, cell)) return;
        
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.pageX;
        cell.style.cursor = 'col-resize';
        
        // Add visual feedback to entire column while resizing
        rows.forEach((r) => {
          const c = r.querySelectorAll('td, th')[colIndex] as HTMLTableCellElement;
          if (c) {
            c.style.boxShadow = 'inset -2px 0 0 0 #6366f1';
          }
        });
        
        // Store width of all cells in this column
        startWidths = [];
        rows.forEach((r) => {
          const c = r.querySelectorAll('td, th')[colIndex] as HTMLTableCellElement;
          if (c) {
            startWidths.push(c.offsetWidth);
          }
        });
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };
      
      const onMouseUp = () => {
        if (!isResizing) return;
        
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        cell.style.cursor = 'text';
        
        // Remove visual feedback from entire column
        rows.forEach((r) => {
          const c = r.querySelectorAll('td, th')[colIndex] as HTMLTableCellElement;
          if (c) {
            c.style.boxShadow = '';
          }
        });
      };
      
      cell.addEventListener('mousedown', onMouseDown);
      cell.addEventListener('mousemove', onMouseMove);
    });
  });
};

// Create simple table (matching import feature style)
export const createSimpleTable = (rows: number = 3, cols: number = 3) => {
  const table = document.createElement('table');
  table.className = 'notion-table';
  
  // Minimal, text-sized grid
  table.style.borderCollapse = 'collapse';
  table.style.borderSpacing = '0';
  table.style.width = 'auto';
  table.style.maxWidth = '100%';
  table.style.fontSize = 'inherit';
  table.style.lineHeight = '1.6';

  for (let i = 0; i < rows; i++) {
    const tr = document.createElement('tr');
    for (let j = 0; j < cols; j++) {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      // A real line box keeps empty cells the same height as typed ones
      td.innerHTML = '<br>';
      td.style.cursor = 'text';
      // Compact Notion-style cell: light dividers, roomy-enough padding
      td.style.padding = '6px 10px';
      td.style.border = '1px solid #e9e9e7';
      td.style.minWidth = '120px';
      td.style.height = '2.25rem';
      td.style.minHeight = '2.25rem';
      td.style.whiteSpace = 'normal';
      td.style.fontSize = 'inherit';
      td.style.lineHeight = '1.5';
      td.style.verticalAlign = 'top';
      td.style.boxSizing = 'border-box';
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  
  // Make table columns resizable
  makeTableResizable(table);
  
  return table;
};

/** Lucide paths, inlined because this file builds raw DOM (no React). */
const COPY_ICON =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const COPIED_ICON =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

/** Hidden-textarea fallback for contexts where the Clipboard API is unavailable. */
const fallbackCopy = (text: string) => {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
  } catch {
    // Nothing else to try - the user can still select the text manually.
  }
  document.body.removeChild(area);
};

const copyText = (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  fallbackCopy(text);
  return Promise.resolve();
};

/**
 * The block's header bar: language label on the left, copy button on the right.
 *
 * Both labels are CSS-generated (see the code-block rules in NoteEditor's style
 * block) instead of text nodes, so the chrome never becomes note text - a block
 * still exports, and reads out to the AI features, as code alone.
 */
const buildCodeBlockHeader = () => {
  const header = document.createElement('div');
  header.className =
    'code-block-header flex items-center justify-between border-b border-gray-200 bg-gray-100 px-2.5 py-1 dark:border-[#2f2f2f] dark:bg-[#202020]';
  header.contentEditable = 'false';

  const languageLabel = document.createElement('span');
  languageLabel.className =
    'code-block-label font-mono text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.contentEditable = 'false';
  copyButton.setAttribute('aria-label', 'Copy code');
  copyButton.className =
    'code-block-copy flex h-6 items-center gap-1 rounded px-1.5 text-[10px] font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#2b2b2b] dark:hover:text-gray-200';
  copyButton.innerHTML = COPY_ICON;

  header.appendChild(languageLabel);
  header.appendChild(copyButton);

  // Clicking the label must not pull the caret out of the code area.
  header.addEventListener('mousedown', (event) => {
    const target = event.target as Node | null;
    if (target && (target === copyButton || copyButton.contains(target))) return;
    event.preventDefault();
  });

  return header;
};

/**
 * Copy a block's code and flip its button into the Copied state.
 *
 * Click handling is delegated from the editor, so the button of a block restored
 * from saved HTML works exactly like one on a freshly inserted block.
 */
export const copyCodeBlock = (button: HTMLElement) => {
  const code = button.closest('.code-block-container')?.querySelector('.code-block-content');
  const text = (code?.textContent || '').replace(/\n$/, '');
  if (!text) return;

  copyText(text).then(() => {
    button.innerHTML = COPIED_ICON;
    button.dataset.copied = 'true';
    window.setTimeout(() => {
      button.innerHTML = COPY_ICON;
      delete button.dataset.copied;
    }, 1800);
  });
};

/**
 * Bring every code block in `root` onto the current header markup.
 *
 * Blocks saved earlier carry their labels as text (which leaked into exported
 * documents); swapping in a fresh header drops them and re-labels from CSS.
 */
export const normalizeCodeBlocks = (root: HTMLElement) => {
  root.querySelectorAll('.code-block-container').forEach((container) => {
    const header = container.querySelector('.code-block-header');
    const isCurrent = !!header?.querySelector('.code-block-label') && !header.textContent?.trim();
    if (isCurrent) return;

    const fresh = buildCodeBlockHeader();
    if (header) header.replaceWith(fresh);
    else container.prepend(fresh);
  });
};

/**
 * Notion-style code block: a quiet surface with a header and a copy button
 * wrapped around a plain-text editing area.
 *
 * The chrome comes from classes (plus the rules in NoteEditor's style block) so
 * the saved HTML stays theme-aware instead of freezing one set of colours.
 */
export const createCodeBlock = () => {
  const codeContainer = document.createElement('div');
  codeContainer.className =
    'code-block-container my-3 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-[#2f2f2f] dark:bg-[#191919]';

  // Editing area. "plaintext-only" keeps pasted markup out of the block.
  const codeContent = document.createElement('div');
  codeContent.className = 'code-block-content';
  try {
    codeContent.contentEditable = 'plaintext-only';
  } catch {
    codeContent.contentEditable = 'true';
  }
  codeContent.setAttribute('spellcheck', 'false');
  codeContent.setAttribute('data-placeholder', 'Type or paste code');

  codeContainer.appendChild(buildCodeBlockHeader());
  codeContainer.appendChild(codeContent);

  return { codeContainer, codeContent };
};
