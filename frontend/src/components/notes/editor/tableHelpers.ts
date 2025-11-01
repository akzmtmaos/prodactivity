// frontend/src/components/notes/editor/tableHelpers.ts

// Simple cell navigation for arrow keys
export const addSimpleCellNavigation = (cell: HTMLTableCellElement, table: HTMLTableElement) => {
  cell.addEventListener('keydown', (e) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;
    
    const currentRow = parseInt(cell.getAttribute('data-row') || '0');
    const currentCol = parseInt(cell.getAttribute('data-col') || '0');
    const totalRows = table.rows.length;
    const totalCols = table.rows[0]?.cells.length || 0;
    
    let targetCell: HTMLTableCellElement | null = null;
    let shouldPrevent = false;

    // Tab always navigates
    if (e.key === 'Tab') {
      shouldPrevent = true;
      if (e.shiftKey) {
        // Previous cell
        if (currentCol > 0) {
          targetCell = table.rows[currentRow]?.cells[currentCol - 1] as HTMLTableCellElement;
        } else if (currentRow > 0) {
          targetCell = table.rows[currentRow - 1]?.cells[totalCols - 1] as HTMLTableCellElement;
        }
      } else {
        // Next cell
        if (currentCol < totalCols - 1) {
          targetCell = table.rows[currentRow]?.cells[currentCol + 1] as HTMLTableCellElement;
        } else if (currentRow < totalRows - 1) {
          targetCell = table.rows[currentRow + 1]?.cells[0] as HTMLTableCellElement;
        }
      }
    }
    // Arrow keys - always navigate between cells (simpler, always works)
    else if (e.key === 'ArrowRight' && currentCol < totalCols - 1) {
      targetCell = table.rows[currentRow]?.cells[currentCol + 1] as HTMLTableCellElement;
      shouldPrevent = true;
    } else if (e.key === 'ArrowLeft' && currentCol > 0) {
      targetCell = table.rows[currentRow]?.cells[currentCol - 1] as HTMLTableCellElement;
      shouldPrevent = true;
    } else if (e.key === 'ArrowDown' && currentRow < totalRows - 1) {
      targetCell = table.rows[currentRow + 1]?.cells[currentCol] as HTMLTableCellElement;
      shouldPrevent = true;
    } else if (e.key === 'ArrowUp' && currentRow > 0) {
      targetCell = table.rows[currentRow - 1]?.cells[currentCol] as HTMLTableCellElement;
      shouldPrevent = true;
    }

    if (shouldPrevent && targetCell) {
      e.preventDefault();
      targetCell.focus();
      // Place cursor at the end of the cell content
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(targetCell);
      range.collapse(false); // false = end of content
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
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
      td.textContent = ''; // Empty, no nbsp
      td.style.cursor = 'text';
      td.setAttribute('data-row', i.toString());
      td.setAttribute('data-col', j.toString());
      // Adequate padding for comfortable text display
      td.style.padding = '12px 16px';
      td.style.border = '1px solid #d1d5db'; // gray-300
      td.style.minWidth = '100px';
      td.style.minHeight = '44px';
      td.style.height = '44px';
      td.style.whiteSpace = 'normal';
      td.style.fontSize = 'inherit';
      td.style.lineHeight = '1.6';
      td.style.verticalAlign = 'middle';
      td.style.boxSizing = 'border-box';
      
      addSimpleCellNavigation(td, table);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  
  return table;
};

// Insert code block
export const createCodeBlock = () => {
  // Create code block container (ChatGPT style)
  const codeContainer = document.createElement('div');
  codeContainer.className = 'code-block-container';
  codeContainer.style.cssText = `
    background-color: #1e1e1e;
    border-radius: 8px;
    margin: 16px 0;
    overflow: hidden;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  `;
  
  // Header bar
  const header = document.createElement('div');
  header.className = 'code-block-header';
  header.contentEditable = 'false';
  header.style.cssText = `
    background-color: #2d2d2d;
    padding: 8px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #3e3e3e;
  `;
  
  const languageLabel = document.createElement('span');
  languageLabel.textContent = 'code';
  languageLabel.style.cssText = `
    color: #9ca3af;
    font-size: 12px;
    font-weight: 500;
  `;
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.style.cssText = `
    background: transparent;
    border: 1px solid #4b5563;
    color: #9ca3af;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  copyButton.onmouseover = () => {
    copyButton.style.backgroundColor = '#374151';
    copyButton.style.color = '#fff';
  };
  copyButton.onmouseout = () => {
    copyButton.style.backgroundColor = 'transparent';
    copyButton.style.color = '#9ca3af';
  };
  
  header.appendChild(languageLabel);
  header.appendChild(copyButton);
  
  // Code content area
  const codeContent = document.createElement('div');
  codeContent.contentEditable = 'plaintext-only';
  codeContent.textContent = '// Enter your code here';
  codeContent.style.cssText = `
    background-color: #1e1e1e;
    color: #d4d4d4;
    padding: 16px;
    margin: 0;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre;
    word-wrap: normal;
    overflow-wrap: normal;
  `;
  
  // Setup copy button handler
  copyButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const codeText = codeContent.textContent || '';
    navigator.clipboard.writeText(codeText).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    });
  };
  
  codeContainer.appendChild(header);
  codeContainer.appendChild(codeContent);
  
  return { codeContainer, codeContent };
};

