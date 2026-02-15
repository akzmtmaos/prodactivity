// frontend/src/components/notes/editor/EditorToolbar.tsx
import React from 'react';
import { ArrowLeft, Save, Table, Settings, Image, Code } from 'lucide-react';
import TextFormatting from '../TextFormatting';

interface EditorToolbarProps {
  title: string;
  hasChanges: boolean;
  activeFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    highlight: boolean;
  };
  selectedColor: string;
  highlightColors: Array<{ name: string; value: string }>;
  pageView: boolean;
  onBack: () => void;
  onTitleChange: (value: string) => void;
  onSave: () => void;
  onToggleFormatting: (command: string, value?: string) => void;
  onShowColorPicker: () => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onSelectHighlightColor: (color: string) => void;
  onShowTableSelector: (event: React.MouseEvent) => void;
  onInsertCodeBlock: () => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePageView: (checked: boolean) => void;
  onShowSettings: () => void;
  isReadOnly?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  hasChanges,
  activeFormatting,
  selectedColor,
  highlightColors,
  pageView,
  onBack,
  onTitleChange,
  onSave,
  onToggleFormatting,
  onShowColorPicker,
  onAlignmentChange,
  onSelectHighlightColor,
  onShowTableSelector,
  onInsertCodeBlock,
  onImageUpload,
  onTogglePageView,
  onShowSettings,
  isReadOnly = false,
}) => {
  return (
    <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="h-full flex items-center justify-between gap-3 px-3 md:px-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            type="button"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Note"
              disabled={isReadOnly}
              className={`text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-gray-900 dark:text-white ${isReadOnly ? 'cursor-not-allowed opacity-75' : ''}`}
            />
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
            onClick={onSave}
            disabled={isReadOnly}
            className={`p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}
            title={isReadOnly ? 'Note is archived - cannot save' : 'Save'}
            type="button"
          >
            <Save size={16} />
          </button>
          <TextFormatting
            activeFormatting={activeFormatting}
            onToggleFormatting={onToggleFormatting}
            onShowColorPicker={onShowColorPicker}
            onAlignmentChange={onAlignmentChange}
            selectedColor={selectedColor}
            onSelectHighlightColor={onSelectHighlightColor}
            highlightColors={highlightColors}
          />
          <button
            onClick={onShowTableSelector}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
            title="Insert Table"
            type="button"
          >
            <Table size={16} />
          </button>
          <button
            onClick={onInsertCodeBlock}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
            title="Insert Code Block"
            type="button"
          >
            <Code size={16} />
          </button>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="image-upload"
            />
            <button
              onClick={() => document.getElementById('image-upload')?.click()}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
              title="Insert Image"
              type="button"
            >
              <Image size={16} />
            </button>
          </div>
          <button
            onClick={onShowSettings}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
            title="Settings"
            type="button"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;

