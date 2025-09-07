// frontend/src/components/notes/ColorPickerModal.tsx
import React from 'react';
import { X, Palette } from 'lucide-react';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  currentColor?: string;
  title?: string;
}

const NOTEBOOK_COLORS = [
  { name: 'Red', value: '#ef4444', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  { name: 'Yellow', value: '#eab308', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  { name: 'Lime', value: '#84cc16', bg: 'bg-lime-500', hover: 'hover:bg-lime-600' },
  { name: 'Green', value: '#22c55e', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500', hover: 'hover:bg-teal-600' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500', hover: 'hover:bg-cyan-600' },
  { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-500', hover: 'hover:bg-sky-600' },
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
  { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500', hover: 'hover:bg-violet-600' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
  { name: 'Fuchsia', value: '#d946ef', bg: 'bg-fuchsia-500', hover: 'hover:bg-fuchsia-600' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500', hover: 'hover:bg-pink-600' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500', hover: 'hover:bg-rose-600' },
  { name: 'Slate', value: '#64748b', bg: 'bg-slate-500', hover: 'hover:bg-slate-600' },
  { name: 'Gray', value: '#6b7280', bg: 'bg-gray-500', hover: 'hover:bg-gray-600' },
  { name: 'Zinc', value: '#71717a', bg: 'bg-zinc-500', hover: 'hover:bg-zinc-600' },
  { name: 'Neutral', value: '#737373', bg: 'bg-neutral-500', hover: 'hover:bg-neutral-600' },
  { name: 'Stone', value: '#78716c', bg: 'bg-stone-500', hover: 'hover:bg-stone-600' },
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  isOpen,
  onClose,
  onColorSelect,
  currentColor = '#3b82f6',
  title = 'Choose a Color'
}) => {
  if (!isOpen) return null;

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Palette className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Color Grid */}
        <div className="p-6">
          <div className="grid grid-cols-6 gap-3">
            {NOTEBOOK_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                className={`
                  w-12 h-12 rounded-lg border-2 transition-all duration-200
                  ${color.bg} ${color.hover}
                  ${currentColor === color.value 
                    ? 'border-gray-900 dark:border-white ring-2 ring-indigo-500 ring-offset-2' 
                    : 'border-gray-200 dark:border-gray-600 hover:scale-110'
                  }
                `}
                title={color.name}
              >
                {currentColor === color.value && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Current:</span>
              <div 
                className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: currentColor }}
              ></div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPickerModal;
