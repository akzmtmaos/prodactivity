// frontend/src/components/RichTextEditor.tsx
import React from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Heading1, Heading2 
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  minHeight?: string;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  minHeight = '200px',
  placeholder = 'Start writing...'
}) => {
  // Editor toolbar actions
  const applyFormatting = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    
    // Focus back on the editor after applying formatting
    const editor = document.getElementById('richTextEditor');
    if (editor) {
      editor.focus();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <button
          type="button"
          onClick={() => applyFormatting('bold')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Bold"
        >
          <Bold size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('italic')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Italic"
        >
          <Italic size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('underline')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Underline"
        >
          <Underline size={16} className="text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('justifyLeft')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Align Left"
        >
          <AlignLeft size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('justifyCenter')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Align Center"
        >
          <AlignCenter size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('justifyRight')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Align Right"
        >
          <AlignRight size={16} className="text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Bullet List"
        >
          <List size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('insertOrderedList')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Numbered List"
        >
          <ListOrdered size={16} className="text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('formatBlock', 'h1')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Heading 1"
        >
          <Heading1 size={16} className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('formatBlock', 'h2')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Heading 2"
        >
          <Heading2 size={16} className="text-white" />
        </button>
      </div>
      
      {/* Editor */}
      <div
        id="richTextEditor"
        contentEditable
        dir="ltr"
        className="p-3 focus:outline-none dark:text-white"
        style={{ 
          backgroundColor: 'transparent',
          minHeight: minHeight
        }}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;