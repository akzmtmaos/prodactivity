// frontend/src/components/notes/editor/EditorToolbar.tsx
import React from 'react';
import { ArrowLeft, Save, Table, Settings, Image, Code, Check } from 'lucide-react';
import TextFormatting from '../TextFormatting';
import HeaderTooltip from '../../common/HeaderTooltip';

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

/** Shared icon-button styling for both toolbar rows. */
export const TOOLBAR_BUTTON =
  'flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  hasChanges,
  activeFormatting,
  selectedColor,
  highlightColors,
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
  onShowSettings,
  isReadOnly = false,
}) => {
  return (
    <div className="sticky top-0 z-20 flex-shrink-0 border-b border-gray-200 bg-white dark:border-[#2f2f2f] dark:bg-[#191919]">
      {/* Row 1 — navigation, title, save state */}
      <div className="flex h-11 items-center gap-2 px-2 sm:px-3">
        <HeaderTooltip label="Back to notes" fixed>
          <button
            onClick={onBack}
            className={TOOLBAR_BUTTON}
            type="button"
            aria-label="Back to notes"
          >
            <ArrowLeft size={16} />
          </button>
        </HeaderTooltip>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Note"
          disabled={isReadOnly}
          className={`min-w-0 flex-1 truncate rounded-md bg-transparent px-1 py-1 text-[15px] font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-[#404040] ${
            isReadOnly ? 'cursor-not-allowed opacity-70' : ''
          }`}
        />

        {/* Save state — Notion-ish quiet status instead of a bare dot */}
        <span className="hidden flex-shrink-0 items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 sm:flex">
          {hasChanges ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </>
          ) : (
            <>
              <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
              Saved
            </>
          )}
        </span>

        <HeaderTooltip label={isReadOnly ? 'Archived notes cannot be saved' : 'Save note (Ctrl+S)'} fixed>
          <button
            onClick={onSave}
            disabled={isReadOnly}
            type="button"
            aria-label="Save note"
            className="flex h-7 items-center gap-1.5 rounded-md bg-gray-900 px-2.5 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            <Save size={13} />
            <span className="hidden sm:inline">Save</span>
          </button>
        </HeaderTooltip>

        <span className="mx-0.5 h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-[#333333]" />

        <HeaderTooltip label="Editor settings" fixed>
          <button
            onClick={onShowSettings}
            className={TOOLBAR_BUTTON}
            type="button"
            aria-label="Editor settings"
          >
            <Settings size={16} />
          </button>
        </HeaderTooltip>
      </div>

      {/* Row 2 — formatting + insert tools */}
      <div className="flex h-9 items-center gap-1 overflow-x-auto border-t border-gray-100 px-2 sm:px-3 dark:border-[#252525]">
        <TextFormatting
          activeFormatting={activeFormatting}
          onToggleFormatting={onToggleFormatting}
          onShowColorPicker={onShowColorPicker}
          onAlignmentChange={onAlignmentChange}
          selectedColor={selectedColor}
          onSelectHighlightColor={onSelectHighlightColor}
          highlightColors={highlightColors}
        />

        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5 pl-2">
          <HeaderTooltip label="Insert table" fixed>
            <button
              onClick={onShowTableSelector}
              className={TOOLBAR_BUTTON}
              type="button"
              aria-label="Insert table"
            >
              <Table size={15} />
            </button>
          </HeaderTooltip>
          <HeaderTooltip label="Insert code block" fixed>
            <button
              onClick={onInsertCodeBlock}
              className={TOOLBAR_BUTTON}
              type="button"
              aria-label="Insert code block"
            >
              <Code size={15} />
            </button>
          </HeaderTooltip>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="image-upload"
            />
            <HeaderTooltip label="Insert image" fixed>
              <button
                onClick={() => document.getElementById('image-upload')?.click()}
                className={TOOLBAR_BUTTON}
                type="button"
                aria-label="Insert image"
              >
                <Image size={15} />
              </button>
            </HeaderTooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
