import React from 'react';

interface ColorPickerProps {
  position: { x: number; y: number };
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Blue', value: '#90caf9' },
  { name: 'Pink', value: '#f48fb1' },
  { name: 'Orange', value: '#ffb74d' },
  { name: 'Purple', value: '#ce93d8' },
  { name: 'Red', value: '#ef9a9a' },
  { name: 'Remove', value: 'transparent' }
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  position,
  selectedColor,
  onColorSelect
}) => {
  return (
    <div 
      className="fixed color-picker bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-[10000]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="grid grid-cols-4 gap-2">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onColorSelect(color.value)}
            className={`p-2 rounded-lg flex flex-col items-center space-y-1 ${
              color.value === selectedColor
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
            title={color.name}
          >
            <div 
              className="w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600" 
              style={{ backgroundColor: color.value }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {color.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ColorPicker; 