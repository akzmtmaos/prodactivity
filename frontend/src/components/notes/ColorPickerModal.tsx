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

// Generate organized colors with better visual progression
const generateNotebookColors = () => {
  const colors = [];
  
  // Create a more organized color palette with better hue distribution (first 12 colors only)
  const hueSteps = [0, 15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270];
  const saturation = 70;
  const lightness = 85;
  
  for (let i = 0; i < 12; i++) {
    // Use a more organized hue distribution
    const hue = hueSteps[i];
    const hslValue = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    colors.push({
      name: `Color ${i + 1}`,
      value: hslValue,
      bg: '', // Will be set dynamically
      hover: '' // Will be set dynamically
    });
  }
  return colors;
};

const NOTEBOOK_COLORS = generateNotebookColors();

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
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-[#333333]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - dtrack compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Color Grid */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-6 gap-2">
            {NOTEBOOK_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                className={`
                  w-10 h-10 rounded-md border-2 transition-all duration-200
                  ${currentColor === color.value 
                    ? 'border-gray-900 dark:border-white ring-2 ring-indigo-500 ring-offset-1' 
                    : 'border-gray-200 dark:border-[#333333] hover:scale-105'
                  }
                `}
                style={{ backgroundColor: color.value }}
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

        {/* Footer - dtrack compact */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#252525] rounded-b-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Current:</span>
              <div 
                className="w-5 h-5 rounded border border-gray-200 dark:border-[#333333]"
                style={{ backgroundColor: currentColor }}
              />
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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
