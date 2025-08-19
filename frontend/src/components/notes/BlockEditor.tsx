import React, { useState, useRef, useEffect } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Block {
  id: string;
  type: 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'number' | 'quote' | 'code' | 'image';
  content: string;
  alignment?: 'left' | 'center' | 'right';
}

interface BlockEditorProps {
  initialContent?: string;
  onChange: (content: string) => void;
  onFormattingChange?: (formatting: any) => void;
}

interface SortableBlockProps {
  block: Block;
  index: number;
  blocks: Block[];
  onContentChange: (id: string, content: string) => void;
  onAddBlock: (index: number, content?: string) => string;
  onDeleteBlock: (index: number) => void;
  onFocusBlock: (index: number, position?: 'start' | 'end') => void;
  onBlockTypeChange: (id: string, type: Block['type']) => void;
  onBlockAlignmentChange: (id: string, alignment: Block['alignment']) => void;
  onFormattingChange?: (formatting: any) => void;
  splitBlock: (index: number, before: string, after: string, currentContent?: string) => string;
}

// Utility to find the last text node in a node
function getLastTextNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node;
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const textNode = getLastTextNode(node.childNodes[i]);
    if (textNode) return textNode;
  }
  return null;
}

// Helper to get the total text length of a node
function getTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length || 0;
  let len = 0;
  node.childNodes.forEach(child => { len += getTextLength(child); });
  return len;
}

// Helper to find the text node and offset for caret placement
function findTextNodeAtOffset(node: Node, offset: number): { node: Node, offset: number } | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const len = node.textContent?.length || 0;
    if (offset <= len) return { node, offset };
    return null;
  }
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    const len = getTextLength(child);
    if (offset <= len) {
      return findTextNodeAtOffset(child, offset);
    } else {
      offset -= len;
    }
  }
  return null;
}

// Helper to find if current selection is inside a specific tag
function isSelectionInsideTag(tagName: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  let node: Node | null = selection.anchorNode;
  const upper = tagName.toUpperCase();
  while (node) {
    if ((node as HTMLElement).tagName === upper) return true;
    node = node.parentNode;
  }
  return false;
}

function getSafeSelectionRange(): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  try {
    return selection.getRangeAt(0);
  } catch {
    return null;
  }
}

function getHTMLFragmentsAroundCaret(container: HTMLElement): { beforeHTML: string; afterHTML: string } | null {
  const range = getSafeSelectionRange();
  if (!range) return null;
  
  // Get the text content of the container
  const fullText = container.textContent || '';
  
  // Create a range to measure the position
  const measureRange = document.createRange();
  measureRange.selectNodeContents(container);
  measureRange.setEnd(range.startContainer, range.startOffset);
  
  // Calculate the caret position in the text
  const caretPosition = measureRange.toString().length;
  
  // Split the text at the caret position
  const beforeText = fullText.substring(0, caretPosition);
  const afterText = fullText.substring(caretPosition);
  
  console.log('getHTMLFragmentsAroundCaret:', {
    fullText: fullText,
    caretPosition,
    beforeText: beforeText,
    afterText: afterText
  });
  
  return { beforeHTML: beforeText, afterHTML: afterText };
}

function isCaretAtStart(container: HTMLElement): boolean {
  const range = getSafeSelectionRange();
  if (!range) return true;
  const testRange = document.createRange();
  testRange.selectNodeContents(container);
  try {
    testRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    return true;
  }
  return testRange.toString().length === 0;
}

function isCaretAtEnd(container: HTMLElement): boolean {
  const range = getSafeSelectionRange();
  if (!range) return true;
  const testRange = document.createRange();
  testRange.selectNodeContents(container);
  try {
    testRange.setStart(range.endContainer, range.endOffset);
  } catch {
    return true;
  }
  return testRange.toString().length === 0;
}

const SortableBlock: React.FC<SortableBlockProps> = ({ 
  block, 
  index,
  blocks,
  onContentChange, 
  onAddBlock, 
  onDeleteBlock,
  onFocusBlock,
  onBlockTypeChange,
  onBlockAlignmentChange,
  onFormattingChange,
  splitBlock
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleInput = (e: React.FormEvent) => {
    const target = e.currentTarget;
    const content = target.textContent || '';
    console.log('handleInput:', {
      blockId: block.id,
      content: content,
      innerHTML: target.innerHTML
    });

    // Process hashtags for headings
    const processedContent = processHashtags(content);
    
    // If content was processed (hashtags found), update the block type
    if (processedContent !== content) {
      const headingType = getHeadingTypeFromContent(content);
      if (headingType && block.type !== headingType) {
        onBlockTypeChange(block.id, headingType);
      }
      onContentChange(block.id, processedContent);
    } else {
      // If no hashtags found and this is a heading block, convert back to text
      if ((block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3') && 
          !getHeadingTypeFromContent(content)) {
        onBlockTypeChange(block.id, 'text');
      }
      onContentChange(block.id, content);
    }
    
    // Update formatting state
    if (onFormattingChange) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const formatting = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikethrough: document.queryCommandState('strikeThrough'),
          blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
          highlight: document.queryCommandValue('hiliteColor') !== 'transparent' && document.queryCommandValue('hiliteColor') !== ''
        };
        onFormattingChange(formatting);
      }
    }
  };

  // Helper function to process hashtags and convert to headings
  const processHashtags = (content: string): string => {
    // Check if the line starts with hashtags
    const trimmedContent = content.trim();
    
    // Match patterns like # Heading, ## Heading, ### Heading
    const headingMatch = trimmedContent.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const hashtags = headingMatch[1];
      const headingText = headingMatch[2];
      
      // Return just the heading text (hashtags will be removed)
      return headingText;
    }
    
    // Also handle cases where hashtags are at the very beginning without space
    const noSpaceMatch = trimmedContent.match(/^(#{1,3})(.+)$/);
    if (noSpaceMatch) {
      const hashtags = noSpaceMatch[1];
      const headingText = noSpaceMatch[2];
      
      // Return just the heading text (hashtags will be removed)
      return headingText;
    }
    
    return content;
  };

  // Helper function to determine heading type from content
  const getHeadingTypeFromContent = (content: string): Block['type'] | null => {
    const trimmedContent = content.trim();
    
    // Match patterns like # Heading, ## Heading, ### Heading
    const headingMatch = trimmedContent.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const hashtagCount = headingMatch[1].length;
      switch (hashtagCount) {
        case 1:
          return 'heading1';
        case 2:
          return 'heading2';
        case 3:
          return 'heading3';
        default:
          return null;
      }
    }
    
    // Also handle cases where hashtags are at the very beginning without space
    const noSpaceMatch = trimmedContent.match(/^(#{1,3})(.+)$/);
    if (noSpaceMatch) {
      const hashtagCount = noSpaceMatch[1].length;
      switch (hashtagCount) {
        case 1:
          return 'heading1';
        case 2:
          return 'heading2';
        case 3:
          return 'heading3';
        default:
          return null;
      }
    }
    
    return null;
  };

  const handleFocus = () => {
    // Update formatting state when block is focused
    if (onFormattingChange) {
      setTimeout(() => {
        const formatting = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikethrough: document.queryCommandState('strikeThrough'),
          blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
          highlight: document.queryCommandValue('hiliteColor') !== 'transparent' && document.queryCommandValue('hiliteColor') !== ''
        };
        onFormattingChange(formatting);
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target?.result as string;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            
            // Clear the current block content
            if (contentRef.current) {
              contentRef.current.innerHTML = '';
              contentRef.current.appendChild(img);
              onContentChange(block.id, contentRef.current.innerHTML);
              onBlockTypeChange(block.id, 'image');
              onBlockAlignmentChange(block.id, 'left'); // Default to left alignment
              
              // Select the image block
              const selection = window.getSelection();
              if (selection) {
                const range = document.createRange();
                range.selectNode(contentRef.current);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (block.type === 'image') {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && contentRef.current) {
        const range = document.createRange();
        range.selectNode(contentRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.currentTarget;
    const selection = window.getSelection();
    // Do NOT call getRangeAt here; selection may have 0 ranges
    // Ranges are retrieved later only after checking rangeCount
    
    // Handle arrow key navigation between blocks
    if (e.key === 'ArrowUp' && index > 0) {
      const container = target as HTMLElement;
      const isAtStart = isCaretAtStart(container);
      
      // If at the start of the block, move to previous block
      if (isAtStart) {
        e.preventDefault();
        onFocusBlock(index - 1, 'end');
        return;
      }
    }
    
    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      const container = target as HTMLElement;
      const isAtEnd = isCaretAtEnd(container);
      
      // If at the end of the block, move to next block
      if (isAtEnd) {
        e.preventDefault();
        onFocusBlock(index + 1, 'start');
        return;
      }
    }
    
    // Ctrl+A (or Cmd+A) should select all blocks, not just within the current block
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      // Select all content across all blocks
      const blockElements = Array.from(document.querySelectorAll('[data-block-id]'));
      if (blockElements.length > 0) {
        const firstBlock = blockElements[0].querySelector('[contenteditable]');
        const lastBlock = blockElements[blockElements.length - 1].querySelector('[contenteditable]');
        if (firstBlock && lastBlock) {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.setStart(firstBlock, 0);
            range.setEnd(lastBlock, lastBlock.childNodes.length);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
      return;
    }
    
    // Handle Enter key for all block types except when inside a table
    if (e.key === 'Enter' && !e.shiftKey) {
      // If caret is inside a table/cell, let the browser handle row/cell behavior
      if (isSelectionInsideTag('TABLE') || isSelectionInsideTag('TD') || isSelectionInsideTag('TH')) {
        return; // allow default
      }
      e.preventDefault();
      const container = target as HTMLElement;
      const fragments = getHTMLFragmentsAroundCaret(container);
      if (!fragments) return;
      const { beforeHTML, afterHTML } = fragments;
      
      // Get the current content from the DOM to ensure we have the latest
      const currentContent = container.textContent || '';
      console.log('Enter key - current content from DOM:', currentContent);
      
      // Check if the current block contains hashtags and convert to heading
      const headingType = getHeadingTypeFromContent(currentContent);
      if (headingType && block.type === 'text') {
        const processedContent = processHashtags(currentContent);
        onContentChange(block.id, processedContent);
        onBlockTypeChange(block.id, headingType);
      }
      
      const newBlockId = splitBlock(index, beforeHTML, afterHTML, currentContent);
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"]`);
        const newBlockEditable = newBlockElement?.querySelector('[contenteditable]');
        if (newBlockEditable) {
          (newBlockEditable as HTMLElement).focus();
          const newRange = document.createRange();
          newRange.setStart(newBlockEditable, 0);
          newRange.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        }
      }, 0);
      return;
    }
    
    // Handle Backspace at the beginning of a block
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const container = target as HTMLElement;
      const isAtStart = isCaretAtStart(container);
      const isCollapsed = selection.isCollapsed;
      
      // Handle empty blocks and merging with previous block
      if (isAtStart && isCollapsed && index > 0) {
        e.preventDefault();
        
        // If current block is empty, just delete it and focus the previous block
        if (target.textContent === '') {
          onDeleteBlock(index);
          setTimeout(() => {
            const prevBlock = blocks[index - 1];
            if (prevBlock) {
              const prevBlockElement = document.querySelector(`[data-block-id="${prevBlock.id}"]`);
              const prevBlockEditable = prevBlockElement?.querySelector('[contenteditable]') as HTMLElement;
              if (prevBlockEditable) {
                prevBlockEditable.focus();
                const newRange = document.createRange();
                newRange.selectNodeContents(prevBlockEditable);
                newRange.collapse(false); // Place caret at the end
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
          }, 0);
          return;
        }
        
        // If current block is not empty, merge with previous block
        e.preventDefault();
        
        // Get the previous block element
        const prevBlockElement = document.querySelector(`[data-block-id="${blocks[index - 1].id}"]`);
        const prevBlockEditable = prevBlockElement?.querySelector('[contenteditable]') as HTMLElement;
        
        if (prevBlockEditable) {
          // Get current and previous content as text to avoid HTML concatenation issues
          const currentText = target.textContent || '';
          const prevText = prevBlockEditable.textContent || '';
          
          console.log('Backspace merge:', {
            currentText: currentText,
            prevText: prevText,
            mergedText: prevText + currentText
          });
          
          // Before merging, get the length of the previous block's text content
          let prevBlockTextLength = prevText.length;

          // Merge content into previous block using text content
          const mergedText = prevText + currentText;
          prevBlockEditable.textContent = mergedText;
          console.log('About to call onContentChange with:', {
            blockId: blocks[index - 1].id,
            content: prevBlockEditable.textContent || ''
          });
          onContentChange(blocks[index - 1].id, prevBlockEditable.textContent || '');
          
          // Delete current block
          onDeleteBlock(index);
          
          // Focus the previous block and place cursor at the merge point
          setTimeout(() => {
            prevBlockEditable.focus();
            const newRange = document.createRange();
            const result = findTextNodeAtOffset(prevBlockEditable, prevBlockTextLength);
            if (result) {
              newRange.setStart(result.node, result.offset);
              newRange.collapse(true);
            } else {
              // Fallback: place at the end
              newRange.selectNodeContents(prevBlockEditable);
              newRange.collapse(false);
            }
            selection.removeAllRanges();
            selection.addRange(newRange);
          }, 0);
        }
        return;
      }
    }
    
    // Handle Delete key at the end of a block
    if (e.key === 'Delete') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const container = target as HTMLElement;
      const isAtEnd = isCaretAtEnd(container);
      const isCollapsed = selection.isCollapsed;
      
      // If cursor is at the end of a block, merge with next block
      if (isAtEnd && isCollapsed && index < blocks.length - 1) {
        e.preventDefault();
        
        // Get the next block element
        const nextBlockElement = document.querySelector(`[data-block-id="${blocks[index + 1].id}"]`);
        const nextBlockEditable = nextBlockElement?.querySelector('[contenteditable]') as HTMLElement;
        
        if (nextBlockEditable) {
          // Get current and next content as text to avoid HTML concatenation issues
          const currentText = target.textContent || '';
          const nextText = nextBlockEditable.textContent || '';
          
          // Merge content into current block using text content
          const mergedText = currentText + nextText;
          target.textContent = mergedText;
          onContentChange(block.id, target.textContent || '');
          
          // Delete next block
          onDeleteBlock(index + 1);
          
          // Keep focus on current block
          setTimeout(() => {
            (target as HTMLElement).focus();
            const newRange = document.createRange();
            newRange.selectNodeContents(target);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }, 0);
        }
        return;
      }
    }
    

  };

  // Update content when block changes
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content, block.id]);

  // Function to render content with hashtag highlighting
  const renderContentWithHashtags = (content: string) => {
    // If this is a heading block, don't show hashtags
    if (block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3') {
      return content;
    }
    
    // Check if content starts with hashtags
    const hashtagMatch = content.match(/^(#{1,3})\s+(.+)$/);
    if (hashtagMatch) {
      const hashtags = hashtagMatch[1];
      const text = hashtagMatch[2];
      return (
        <span>
          <span className="text-blue-500 font-mono">{hashtags}</span>
          <span> {text}</span>
        </span>
      );
    }
    
    // Also check for hashtags without space
    const noSpaceMatch = content.match(/^(#{1,3})(.+)$/);
    if (noSpaceMatch) {
      const hashtags = noSpaceMatch[1];
      const text = noSpaceMatch[2];
      return (
        <span>
          <span className="text-blue-500 font-mono">{hashtags}</span>
          <span>{text}</span>
        </span>
      );
    }
    
    return content;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative mb-2"
      {...attributes}
      data-block-id={block.id}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 w-8 opacity-0 group-hover:opacity-100 transition-opacity" {...listeners}>
          <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            ⋮⋮
          </div>
        </div>
        <div className="flex-grow min-w-0">
          {/* Hashtag indicator */}
          {block.type === 'text' && (block.content.trim().match(/^(#{1,3})\s+(.+)$/) || block.content.trim().match(/^(#{1,3})(.+)$/)) && (
            <div className="text-xs text-blue-500 mb-1 font-mono flex items-center gap-2">
              <span>
                {block.content.trim().match(/^(#{1,3})/)?.[1]} - {block.content.trim().match(/^(#{1,3})/)?.[1]?.length === 1 ? 'Heading 1' : 
                 block.content.trim().match(/^(#{1,3})/)?.[1]?.length === 2 ? 'Heading 2' : 'Heading 3'}
              </span>
              <span className="text-gray-400">(Press Enter to convert)</span>
            </div>
          )}
          

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            className={`outline-none min-h-[1.5em] text-gray-900 dark:text-white whitespace-pre-wrap break-words overflow-wrap-anywhere w-full ${
              block.type === 'heading1' ? 'text-3xl font-bold mb-4' :
              block.type === 'heading2' ? 'text-2xl font-bold mb-3' :
              block.type === 'heading3' ? 'text-xl font-bold mb-2' :
              block.type === 'image' ? 'block' :
              ''
            }`}
            style={block.type === 'image' ? {
              textAlign: block.alignment || 'left',
              cursor: 'pointer'
            } : {
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              maxWidth: '100%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

const BlockEditor: React.FC<BlockEditorProps> = ({ initialContent = '', onChange, onFormattingChange }) => {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (!initialContent) {
      return [{ id: '1', type: 'text', content: '' }];
    }
    return initialContent.split('\n').map((line, index) => ({
      id: String(index + 1),
      type: 'text',
      content: line
    }));
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newBlocks = arrayMove(items, oldIndex, newIndex);
        onChange(blocksToContent(newBlocks));
        return newBlocks;
      });
    }
  };

  const addBlock = (index: number, content: string = ''): string => {
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      content
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
    return newBlock.id;
  };

  const updateBlock = (id: string, content: string) => {
    console.log('updateBlock called:', { id, content });
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, content } : block
    );
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
  };

  const updateBlockType = (id: string, type: Block['type']) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, type } : block
    );
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
  };

  const updateBlockAlignment = (id: string, alignment: Block['alignment']) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, alignment } : block
    );
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
    setTimeout(() => {
      const prevBlockIndex = Math.max(0, index - 1);
      const prevBlock = newBlocks[prevBlockIndex];
      if (prevBlock) {
        const prevBlockElement = document.querySelector(`[data-block-id="${prevBlock.id}"]`);
        if (prevBlockElement) {
          const contentEditable = prevBlockElement.querySelector('[contenteditable]');
          if (contentEditable) {
            (contentEditable as HTMLElement).focus();
          }
        }
      }
    }, 0);
  };

  const focusBlock = (index: number, position: 'start' | 'end' = 'end') => {
    if (index < 0 || index >= blocks.length) return;
    setTimeout(() => {
      const blockElement = document.querySelector(`[data-block-id="${blocks[index].id}"]`);
      if (blockElement) {
        const contentEditable = blockElement.querySelector('[contenteditable]');
        if (contentEditable) {
          (contentEditable as HTMLElement).focus();
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(contentEditable);
          range.collapse(position === 'start');
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }, 50);
  };

  const splitBlock = (index: number, before: string, after: string, currentContent?: string): string => {
    console.log('splitBlock:', {
      index,
      before: before,
      after: after,
      currentBlockContent: blocks[index].content,
      currentContentFromDOM: currentContent,
      allBlocks: blocks.map(b => ({ id: b.id, content: b.content }))
    });
    
    const newBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'text',
      content: after
    };
    const newBlocks = [...blocks];
    
    // Use the before content from the function parameter, not from state
    newBlocks[index] = { ...newBlocks[index], content: before };
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    onChange(blocksToContent(newBlocks));
    return newBlock.id;
  };

  const blocksToContent = (blocks: Block[]) => {
    return blocks.map(block => block.content).join('\n');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map(block => block.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 min-w-0">
          {blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              index={index}
              blocks={blocks}
              onContentChange={updateBlock}
              onAddBlock={addBlock}
              onDeleteBlock={deleteBlock}
              onFocusBlock={focusBlock}
              onBlockTypeChange={updateBlockType}
              onBlockAlignmentChange={updateBlockAlignment}
              onFormattingChange={onFormattingChange}
              splitBlock={splitBlock}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default BlockEditor; 