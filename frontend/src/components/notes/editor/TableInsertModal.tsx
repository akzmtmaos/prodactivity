// frontend/src/components/notes/editor/TableInsertModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TableInsertModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onInsertTable: (rows: number, cols: number) => void;
}

const GRID_ROWS = 8;
const GRID_COLS = 8;

const TableInsertModal: React.FC<TableInsertModalProps> = ({
  isOpen,
  position,
  onClose,
  onInsertTable,
}) => {
  const [hovered, setHovered] = useState<{ rows: number; cols: number } | null>(null);
  const [customRows, setCustomRows] = useState<number | string>(3);
  const [customCols, setCustomCols] = useState<number | string>(3);

  if (!isOpen) return null;

  const clamp = (value: number) => Math.max(1, Math.min(20, value));

  const insertCustomTable = () => {
    const rows = typeof customRows === 'string' ? parseInt(customRows) || 3 : customRows;
    const cols = typeof customCols === 'string' ? parseInt(customCols) || 3 : customCols;
    onInsertTable(clamp(rows), clamp(cols));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      <div
        className="absolute w-[196px] rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-[#333333] dark:bg-[#252525]"
        style={{ left: position.x, top: position.y, zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Insert table
          </span>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close table picker"
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#2f2f2f] dark:hover:text-gray-200"
          >
            <X size={14} />
          </button>
        </div>

        {/* Size picker */}
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHovered(null)}
        >
          {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => {
            const row = Math.floor(index / GRID_COLS) + 1;
            const col = (index % GRID_COLS) + 1;
            const filled = hovered ? row <= hovered.rows && col <= hovered.cols : false;

            return (
              <button
                key={index}
                type="button"
                aria-label={`Insert ${row} by ${col} table`}
                onMouseEnter={() => setHovered({ rows: row, cols: col })}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onInsertTable(row, col);
                  onClose();
                }}
                className={`h-[18px] w-full rounded-[3px] border transition-colors ${
                  filled
                    ? 'border-indigo-500 bg-indigo-500/90 dark:border-indigo-400 dark:bg-indigo-500/80'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-[#3a3a3a] dark:bg-[#2f2f2f] dark:hover:bg-[#3a3a3a]'
                }`}
              />
            );
          })}
        </div>

        {/* Live size readout */}
        <p className="mt-2 h-4 text-[11px] font-medium text-gray-600 dark:text-gray-300">
          {hovered ? `${hovered.rows} × ${hovered.cols} table` : 'Drag to choose a size'}
        </p>

        {/* Custom size */}
        <div className="mt-2 border-t border-gray-200 pt-2 dark:border-[#333333]">
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Rows
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={customRows}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') return setCustomRows('');
                  const num = parseInt(val);
                  if (!isNaN(num)) setCustomRows(clamp(num));
                }}
                onBlur={() => {
                  if (customRows === '' || Number(customRows) < 1) setCustomRows(3);
                }}
                className="h-7 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-[#333333] dark:bg-[#1e1e1e] dark:text-white dark:focus:ring-[#404040]"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Columns
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={customCols}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') return setCustomCols('');
                  const num = parseInt(val);
                  if (!isNaN(num)) setCustomCols(clamp(num));
                }}
                onBlur={() => {
                  if (customCols === '' || Number(customCols) < 1) setCustomCols(3);
                }}
                className="h-7 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:border-[#333333] dark:bg-[#1e1e1e] dark:text-white dark:focus:ring-[#404040]"
              />
            </label>
          </div>
          <button
            onClick={insertCustomTable}
            type="button"
            className="mt-2 flex h-7 w-full items-center justify-center rounded-md bg-indigo-600 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Insert table
          </button>
        </div>
      </div>
    </div>
  );
};

export default TableInsertModal;
