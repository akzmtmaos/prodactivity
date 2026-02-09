import React, { useState } from 'react';
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

const TextFormatting: React.FC<TextFormattingProps> = ({
  activeFormatting,
  onToggleFormatting,
  onShowColorPicker,
  onAlignmentChange,
  selectedColor,
  onSelectHighlightColor,
  highlightColors
}) => {
  // Debug: Log the highlightColors prop
  console.log('TextFormatting highlightColors:', highlightColors);
  console.log('TextFormatting component rendering');
  const [showColorMenu, setShowColorMenu] = useState(false);

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
     setShowColorMenu(prev => !prev);
   };  

  // Table functionality removed - now handled by main toolbar

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
    <div className="flex items-center space-x-1 p-2">
      <button
        onClick={() => handleFormattingClick('bold')}
        className={`p-2 rounded-lg ${
          activeFormatting.bold
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => handleFormattingClick('italic')}
        className={`p-2 rounded-lg ${
          activeFormatting.italic
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => handleFormattingClick('underline')}
        className={`p-2 rounded-lg ${
          activeFormatting.underline
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Underline"
      >
        <Underline size={16} />
      </button>
      <button
        onClick={() => handleFormattingClick('strikeThrough')}
        className={`p-2 rounded-lg ${
          activeFormatting.strikethrough
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
      <div className="relative inline-block">
        <button
          onClick={toggleColorMenu}
          className={`p-2 rounded-lg flex items-center space-x-1 highlight-button color-button ${
            activeFormatting.highlight
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="Highlight"
        >
          <div 
            className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600" 
            style={{ backgroundColor: selectedColor }}
          />
          <ChevronDown size={14} />
        </button>

                          {showColorMenu && (
           <div
             className="absolute color-menu z-50 mt-1 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333333] rounded-lg shadow p-2 flex gap-1.5"
             style={{ left: 0, top: '100%' }}
           >
             {/* Light highlight colors */}
             <button
               onClick={() => { onSelectHighlightColor('#fff3cd'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#fff3cd' }}
               title="Light Yellow"
             />
             <button
               onClick={() => { onSelectHighlightColor('#d1ecf1'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#d1ecf1' }}
               title="Light Blue"
             />
             <button
               onClick={() => { onSelectHighlightColor('#d4edda'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
               style={{ backgroundColor: '#d4edda' }}
               title="Light Green"
             />
                           <button
                onClick={() => { onSelectHighlightColor('#ffeaa7'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#ffeaa7' }}
                title="Light Orange"
              />
              <button
                onClick={() => { onSelectHighlightColor('#e8d5ff'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#e8d5ff' }}
                title="Light Purple"
              />
              <button
                onClick={() => { onSelectHighlightColor('#ffd6d6'); setShowColorMenu(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: '#ffd6d6' }}
                title="Light Red"
              />
             
             {/* Remove highlight option */}
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
             <button
               onClick={() => { onSelectHighlightColor('transparent'); setShowColorMenu(false); }}
               className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform bg-white dark:bg-gray-700 flex items-center justify-center"
               title="Remove Highlight"
             >
               <div className="w-3 h-0.5 bg-gray-500 dark:bg-gray-400 rotate-45" />
             </button>
           </div>
         )}
      </div>
      
      {/* Separate Heading buttons */}
      <button
        onClick={() => {
          console.log('H1 button clicked!');
          handleFormattingClick('formatBlock', 'h1');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => {
          console.log('H2 button clicked!');
          handleFormattingClick('formatBlock', 'h2');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => {
          console.log('H3 button clicked!');
          handleFormattingClick('formatBlock', 'h3');
        }}
        className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Heading 3"
      >
        H3
      </button>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      <button
        onClick={() => onAlignmentChange('left')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => onAlignmentChange('center')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Center"
      >
        <AlignCenter size={16} />
      </button>
             <button
         onClick={() => onAlignmentChange('right')}
         className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
         title="Align Right"
       >
         <AlignRight size={16} />
       </button>
       <button
         onClick={() => onAlignmentChange('justify')}
         className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
         title="Justify"
       >
         <AlignJustify size={16} />
       </button>
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      {/* Table tools removed - now handled by main toolbar */}

      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

      <button
        onClick={() => handleFormattingClick('insertUnorderedList')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => handleFormattingClick('insertOrderedList')}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      
      

    </div>
  );
};

export default TextFormatting; 