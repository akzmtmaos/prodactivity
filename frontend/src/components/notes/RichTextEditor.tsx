// frontend/src/components/RichTextEditor.tsx
import React, { useRef, useEffect } from 'react';
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
  const editorRef = useRef<HTMLDivElement>(null);

  // Helper function to get current selection
  const getSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
  };

  // Helper function to restore selection
  const restoreSelection = (range: Range) => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Create list functionality
  const createList = (isOrdered: boolean = false) => {
    const range = getSelection();
    if (!range || !editorRef.current) return;

    const listType = isOrdered ? 'ol' : 'ul';
    const listItem = document.createElement('li');
    listItem.textContent = '\u200B'; // Zero-width space to maintain cursor

    const list = document.createElement(listType);
    list.appendChild(listItem);

    // Insert the list
    range.deleteContents();
    range.insertNode(list);

    // Move cursor inside the list item
    const newRange = document.createRange();
    newRange.setStart(listItem, 0);
    newRange.collapse(true);
    restoreSelection(newRange);

    // Update content
    onChange(editorRef.current.innerHTML);
  };

  // Convert text to list
  const convertToBulletList = () => {
    const range = getSelection();
    if (!range || !editorRef.current) return;

    const container = range.commonAncestorContainer;
    const textNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      if (text.trim().startsWith('- ')) {
        // Remove the "- " and create bullet list
        const newText = text.replace(/^- /, '');
        const listItem = document.createElement('li');
        listItem.textContent = newText;

        const list = document.createElement('ul');
        list.appendChild(listItem);

        // Replace the text node with the list
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(list, textNode);
          
          // Move cursor to end of list item
          const newRange = document.createRange();
          newRange.setStart(listItem, 1);
          newRange.collapse(true);
          restoreSelection(newRange);
        }

        onChange(editorRef.current.innerHTML);
      }
    }
  };

  // Editor toolbar actions
  const applyFormatting = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Handle list commands
    if (command === 'insertUnorderedList') {
      createList(false);
      return;
    } else if (command === 'insertOrderedList') {
      createList(true);
      return;
    }
    
    // Handle other formatting
    document.execCommand(command, false, value);
    
    // Update content after formatting
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    onChange(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key for lists
    if (e.key === 'Enter') {
      const range = getSelection();
      if (!range) return;

      const listItem = range.startContainer.parentElement;
      
      // Check if we're in a list item
      if (listItem && (listItem.tagName === 'LI' || listItem.closest('li'))) {
        const actualListItem = listItem.tagName === 'LI' ? listItem : listItem.closest('li');
        if (actualListItem) {
          const list = actualListItem.closest('ul, ol');
          if (list) {
            // If list item is empty, exit the list
            if (actualListItem.textContent?.trim() === '' || actualListItem.textContent?.trim() === '\u200B') {
              e.preventDefault();
              
              // Create a new paragraph after the list
              const paragraph = document.createElement('p');
              paragraph.innerHTML = '<br>';
              
              if (list.parentNode) {
                list.parentNode.insertBefore(paragraph, list.nextSibling);
                
                // Move cursor to the new paragraph
                const newRange = document.createRange();
                newRange.setStart(paragraph, 0);
                newRange.collapse(true);
                restoreSelection(newRange);
                
                // Remove the empty list item
                actualListItem.remove();
                
                // If list is empty, remove it too
                if (list.children.length === 0) {
                  list.remove();
                }
              }
              
              if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
              }
            } else {
              // Create new list item
              e.preventDefault();
              const newListItem = document.createElement('li');
              newListItem.textContent = '\u200B';
              list.appendChild(newListItem);
              
              // Move cursor to new list item
              const newRange = document.createRange();
              newRange.setStart(newListItem, 0);
              newRange.collapse(true);
              restoreSelection(newRange);
              
              if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
              }
            }
          }
        }
      }
    }
    
    // Handle space key for auto-conversion
    if (e.key === ' ') {
      const range = getSelection();
      if (!range) return;

      const container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || '';
        if (text.trim().endsWith('-')) {
          // Convert to bullet list
          setTimeout(() => {
            convertToBulletList();
          }, 10);
        }
      }
    }
  };

  // Add CSS for bullet points
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      #richTextEditor ul {
        list-style-type: disc;
        padding-left: 2rem;
        margin: 0.5rem 0;
      }
      #richTextEditor ul li {
        margin: 0.25rem 0;
        line-height: 1.5;
        position: relative;
      }
      #richTextEditor ul li::marker {
        color: #6b7280;
        font-size: 0.875rem;
      }
      #richTextEditor ol {
        list-style-type: decimal;
        padding-left: 2rem;
        margin: 0.5rem 0;
      }
      #richTextEditor ol li {
        margin: 0.25rem 0;
        line-height: 1.5;
      }
      #richTextEditor ol li::marker {
        color: #6b7280;
        font-size: 0.875rem;
      }
      #richTextEditor h1 {
        font-size: 1.875rem;
        font-weight: 700;
        margin: 1rem 0 0.5rem 0;
        line-height: 1.2;
      }
      #richTextEditor h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0.75rem 0 0.5rem 0;
        line-height: 1.3;
      }
      #richTextEditor p {
        margin: 0.5rem 0;
        line-height: 1.6;
      }
      #richTextEditor:empty:before {
        content: attr(data-placeholder);
        color: #9ca3af;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <button
          type="button"
          onClick={() => applyFormatting('bold')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Bold"
        >
          <Bold size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('italic')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Italic"
        >
          <Italic size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('underline')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Underline"
        >
          <Underline size={16} className="text-gray-700 dark:text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('justifyLeft')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Align Left"
        >
          <AlignLeft size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('justifyCenter')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Align Center"
        >
          <AlignCenter size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('justifyRight')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Align Right"
        >
          <AlignRight size={16} className="text-gray-700 dark:text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Bullet List"
        >
          <List size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('insertOrderedList')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Numbered List"
        >
          <ListOrdered size={16} className="text-gray-700 dark:text-white" />
        </button>
        <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => applyFormatting('formatBlock', 'h1')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Heading 1"
        >
          <Heading1 size={16} className="text-gray-700 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => applyFormatting('formatBlock', 'h2')}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Heading 2"
        >
          <Heading2 size={16} className="text-gray-700 dark:text-white" />
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        id="richTextEditor"
        contentEditable
        dir="ltr"
        className="p-3 focus:outline-none dark:text-white"
        style={{ 
          backgroundColor: 'transparent',
          minHeight: minHeight
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;