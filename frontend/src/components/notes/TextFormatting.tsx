import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown
} from 'lucide-react';
import HeaderTooltip from '../common/HeaderTooltip';

interface TextFormattingProps {
  activeFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    highlight: boolean;
  };
  onToggleFormatting: (command: string, value?: string) => void;
  onShowColorPicker: () => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  selectedColor: string;
  onSelectHighlightColor: (color: string) => void;
  highlightColors: Array<{ name: string; value: string }>;
}

/** Compact icon button used across the formatting toolbar. */
const TOOL_BUTTON =
  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white';

/** Active (pressed) state: quiet tint instead of a heavy filled block. */
const ACTIVE_BUTTON =
  'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300';

const DIVIDER = <div className="mx-1 h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-[#333333]" />;

const TextFormatting: React.FC<TextFormattingProps> = ({
  activeFormatting,
  onToggleFormatting,
  onAlignmentChange,
  selectedColor,
  onSelectHighlightColor
}) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [colorMenuPos, setColorMenuPos] = useState<{ top: number; left: number } | null>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);

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
    if (showColorMenu) {
      setShowColorMenu(false);
      return;
    }
    const button = colorButtonRef.current;
    if (!button) {
      setShowColorMenu(true);
      return;
    }
    // Fixed coordinates so the menu escapes the toolbar's scroll container.
    const rect = button.getBoundingClientRect();
    const MENU_WIDTH = 238;
    setColorMenuPos({
      top: rect.bottom + 6,
      left: Math.min(Math.max(8, rect.left), window.innerWidth - MENU_WIDTH - 8),
    });
    setShowColorMenu(true);
  };

  // Close on escape, scroll or resize so the fixed menu never drifts away.
  useEffect(() => {
    if (!showColorMenu) return;
    const close = () => setShowColorMenu(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [showColorMenu]);  

  // Close menu on outside click
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.color-menu') && !target.closest('.color-button')) {
        setShowColorMenu(false);
      }
    };
    if (showColorMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColorMenu]);

  return (
    <div className="flex flex-shrink-0 items-center gap-0.5">
      <HeaderTooltip label="Bold" fixed>
        <button
          onClick={() => handleFormattingClick('bold')}
          className={`${TOOL_BUTTON} ${activeFormatting.bold ? ACTIVE_BUTTON : ''}`}
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Italic" fixed>
        <button
          onClick={() => handleFormattingClick('italic')}
          className={`${TOOL_BUTTON} ${activeFormatting.italic ? ACTIVE_BUTTON : ''}`}
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Underline" fixed>
        <button
          onClick={() => handleFormattingClick('underline')}
          className={`${TOOL_BUTTON} ${activeFormatting.underline ? ACTIVE_BUTTON : ''}`}
          aria-label="Underline"
        >
          <Underline size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Strikethrough" fixed>
        <button
          onClick={() => handleFormattingClick('strikeThrough')}
          className={`${TOOL_BUTTON} ${activeFormatting.strikethrough ? ACTIVE_BUTTON : ''}`}
          aria-label="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
      </HeaderTooltip>

      <span className="relative inline-flex">
        <HeaderTooltip label="Highlight color" fixed>
          <button
            ref={colorButtonRef}
            onClick={toggleColorMenu}
            className={`${TOOL_BUTTON} color-button w-auto gap-0.5 px-1 ${activeFormatting.highlight ? ACTIVE_BUTTON : ''}`}
            aria-label="Highlight color"
            aria-expanded={showColorMenu}
          >
            <span
              className="h-3.5 w-3.5 rounded-[3px] border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: selectedColor }}
            />
            <ChevronDown size={11} />
          </button>
        </HeaderTooltip>

        {showColorMenu && colorMenuPos && createPortal(
          <div
            className="color-menu fixed z-[10000] flex gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-[#333333] dark:bg-[#252525]"
            style={{ top: colorMenuPos.top, left: colorMenuPos.left }}
          >
            {[
              { value: '#fff3cd', label: 'Cream' },
              { value: '#d1ecf1', label: 'Light blue' },
              { value: '#d4edda', label: 'Light green' },
              { value: '#ffeaa7', label: 'Light orange' },
              { value: '#e8d5ff', label: 'Light purple' },
              { value: '#ffd6d6', label: 'Light red' },
            ].map((color) => (
              <button
                key={color.value}
                onClick={() => { onSelectHighlightColor(color.value); setShowColorMenu(false); }}
                className="h-6 w-6 rounded-full border border-gray-300 transition-transform hover:scale-110 dark:border-gray-600"
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={color.label}
              />
            ))}
            <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-[#333333]" />
            <button
              onClick={() => { onSelectHighlightColor('transparent'); setShowColorMenu(false); }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white hover:scale-110 dark:border-gray-600 dark:bg-[#2f2f2f]"
              title="Remove highlight"
              aria-label="Remove highlight"
            >
              <div className="h-0.5 w-3 rotate-45 bg-gray-500 dark:bg-gray-400" />
            </button>
          </div>,
          document.body
        )}
      </span>

      {DIVIDER}

      <HeaderTooltip label="Heading 1" fixed>
        <button
          onClick={() => handleFormattingClick('formatBlock', 'h1')}
          className={`${TOOL_BUTTON} text-[11px] font-semibold`}
          aria-label="Heading 1"
        >
          H1
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Heading 2" fixed>
        <button
          onClick={() => handleFormattingClick('formatBlock', 'h2')}
          className={`${TOOL_BUTTON} text-[11px] font-semibold`}
          aria-label="Heading 2"
        >
          H2
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Heading 3" fixed>
        <button
          onClick={() => handleFormattingClick('formatBlock', 'h3')}
          className={`${TOOL_BUTTON} text-[11px] font-semibold`}
          aria-label="Heading 3"
        >
          H3
        </button>
      </HeaderTooltip>

      {DIVIDER}

      <HeaderTooltip label="Align left" fixed>
        <button onClick={() => onAlignmentChange('left')} className={TOOL_BUTTON} aria-label="Align left">
          <AlignLeft size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Align center" fixed>
        <button onClick={() => onAlignmentChange('center')} className={TOOL_BUTTON} aria-label="Align center">
          <AlignCenter size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Align right" fixed>
        <button onClick={() => onAlignmentChange('right')} className={TOOL_BUTTON} aria-label="Align right">
          <AlignRight size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Justify" fixed>
        <button onClick={() => onAlignmentChange('justify')} className={TOOL_BUTTON} aria-label="Justify">
          <AlignJustify size={15} />
        </button>
      </HeaderTooltip>

      {DIVIDER}

      <HeaderTooltip label="Bullet list" fixed>
        <button onClick={() => handleFormattingClick('insertUnorderedList')} className={TOOL_BUTTON} aria-label="Bullet list">
          <List size={15} />
        </button>
      </HeaderTooltip>
      <HeaderTooltip label="Numbered list" fixed>
        <button onClick={() => handleFormattingClick('insertOrderedList')} className={TOOL_BUTTON} aria-label="Numbered list">
          <ListOrdered size={15} />
        </button>
      </HeaderTooltip>
    </div>
  );
};

export default TextFormatting;
