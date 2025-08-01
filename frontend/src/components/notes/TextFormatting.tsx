import React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Strikethrough,
  Quote,
  Link,
  Image,
  ChevronDown
} from 'lucide-react';

interface TextFormattingProps {
  activeFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    blockquote: boolean;
    highlight: boolean;
  };
  onToggleFormatting: (command: string, value?: string) => void;
  onShowColorPicker: () => void;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right') => void;
  selectedColor: string;
}

const TextFormatting: React.FC<TextFormattingProps> = ({
  activeFormatting,
  onToggleFormatting,
  onShowColorPicker,
  onAlignmentChange,
  selectedColor
}) => {
  const handleFormattingClick = (command: string, value?: string) => {
    // Ensure we have a selection in a contentEditable element
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, try to focus the first contentEditable element
      const contentEditable = document.querySelector('[contenteditable]') as HTMLElement;
      if (contentEditable) {
        contentEditable.focus();
        const range = document.createRange();
        range.selectNodeContents(contentEditable);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
    
    onToggleFormatting(command, value);
  };

  const handleLinkClick = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      handleFormattingClick('createLink', url);
    }
  };

  const handleImageClick = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      document.execCommand('insertHTML', false, img.outerHTML);
    }
  };

  return (
    <div className="flex items-center space-x-1 p-2 overflow-x-auto border-t border-gray-200 dark:border-gray-700">
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
      <button
        onClick={() => handleFormattingClick('formatBlock', 'blockquote')}
        className={`p-2 rounded-lg ${
          activeFormatting.blockquote
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
      <button
        onClick={onShowColorPicker}
        className={`p-2 rounded-lg flex items-center space-x-1 highlight-button ${
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
      <button
        onClick={handleLinkClick}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Insert Link"
      >
        <Link size={16} />
      </button>
      <button
        onClick={handleImageClick}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Insert Image"
      >
        <Image size={16} />
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
      
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
      
      <select
        onChange={(e) => handleFormattingClick('formatBlock', e.target.value)}
        className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300"
        defaultValue=""
      >
        <option value="">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="p">Paragraph</option>
      </select>
    </div>
  );
};

export default TextFormatting; 