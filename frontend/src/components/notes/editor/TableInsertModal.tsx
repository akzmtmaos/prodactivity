// frontend/src/components/notes/editor/TableInsertModal.tsx
import React, { useState, useRef } from 'react';

interface TableInsertModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertTable: (rows: number, cols: number) => void;
}

const TableInsertModal: React.FC<TableInsertModalProps> = ({
  isOpen,
  position,
  onClose,
  onInsertTable,
}) => {
  const [hoveredTableSize, setHoveredTableSize] = useState<{ rows: number; cols: number } | null>(null);
  const [customRows, setCustomRows] = useState<number | string>(3);
  const [customCols, setCustomCols] = useState<number | string>(3);

  if (!isOpen) return null;

  const handleInsertCustomTable = () => {
    const rows = typeof customRows === 'string' ? parseInt(customRows) || 3 : customRows;
    const cols = typeof customCols === 'string' ? parseInt(customCols) || 3 : customCols;
    onInsertTable(rows, cols);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div 
        className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
        style={{
          left: position.x,
          top: position.y,
          zIndex: 10000,
          width: 'auto',
          display: 'inline-block',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="text-lg font-bold text-gray-800">
            Insert Table
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        {/* Table Grid */}
        <div className="inline-grid [grid-template-columns:repeat(8,min-content)] gap-x-1 gap-y-1">
          {Array.from({ length: 64 }, (_, index) => {
            const row = Math.floor(index / 8) + 1;
            const col = (index % 8) + 1;
            return (
              <div
                key={index}
                className="box-border border border-gray-300 hover:bg-blue-200 cursor-pointer transition-colors bg-gray-100 rounded-sm"
                style={{ width: 18, height: 18 }}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  onInsertTable(row, col);
                  onClose();
                }}
                onMouseEnter={(e) => {
                  setHoveredTableSize({ rows: row, cols: col });
                  
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
                  setHoveredTableSize(null);
                  
                  const cells = e.currentTarget.parentElement?.children;
                  if (cells) {
                    Array.from(cells).forEach((cell) => {
                      (cell as HTMLElement).style.backgroundColor = '';
                      (cell as HTMLElement).style.borderColor = '';
                    });
                  }
                }}
              />
            );
          })}
        </div>
        
        {/* Custom Table Input */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-600">Row</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={customRows}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCustomRows('');
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        setCustomRows(Math.max(1, Math.min(20, num)));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                      setCustomRows(3);
                    }
                  }}
                  className="w-14 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-600">Col</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={customCols}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCustomCols('');
                    } else {
                      const num = parseInt(val);
                      if (!isNaN(num)) {
                        setCustomCols(Math.max(1, Math.min(20, num)));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '' || parseInt(e.target.value) < 1) {
                      setCustomCols(3);
                    }
                  }}
                  className="w-14 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleInsertCustomTable}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableInsertModal;

