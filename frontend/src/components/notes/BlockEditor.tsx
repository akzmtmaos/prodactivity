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
}

interface SortableBlockProps {
  block: Block;
  index: number;
  blocks: Block[];
  onContentChange: (id: string, content: string) => void;
  onAddBlock: (index: number, content?: string) => string;
  onDeleteBlock: (index: number) => void;
  onFocusBlock: (index: number) => void;
  onBlockTypeChange: (id: string, type: Block['type']) => void;
  onBlockAlignmentChange: (id: string, alignment: Block['alignment']) => void;
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
  onBlockAlignmentChange
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
    onContentChange(block.id, content);
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
    const range = selection?.getRangeAt(0);
    
    // Handle Enter key for all block types
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Get the current content and split it at cursor position
      const content = target.textContent || '';
      const cursorPosition = range?.startOffset || 0;
      const beforeCursor = content.substring(0, cursorPosition);
      const afterCursor = content.substring(cursorPosition);
      
      // Update current block with content before cursor
      target.textContent = beforeCursor;
      onContentChange(block.id, beforeCursor);
      
      // Create new block with content after cursor
      const newBlockId = onAddBlock(index, afterCursor);
      
      // Focus the new block
      requestAnimationFrame(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlockId}"]`);
        const newBlockEditable = newBlockElement?.querySelector('[contenteditable]');
        if (newBlockEditable) {
          (newBlockEditable as HTMLElement).focus();
          
          // Set cursor at the start of the new block
          const newRange = document.createRange();
          newRange.setStart(newBlockEditable, 0);
          newRange.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      });
      return;
    }
    
    // Handle markdown-style heading shortcuts
    if (e.key === ' ' && !e.shiftKey) {
      const content = target.textContent || '';
      const trimmedContent = content.trim();
      
      if (trimmedContent === '#') {
        e.preventDefault();
        target.textContent = '';
        onBlockTypeChange(block.id, 'heading1');
        target.classList.add('text-3xl', 'font-bold', 'mb-4');
      } else if (trimmedContent === '##') {
        e.preventDefault();
        target.textContent = '';
        onBlockTypeChange(block.id, 'heading2');
        target.classList.add('text-2xl', 'font-bold', 'mb-3');
      } else if (trimmedContent === '###') {
        e.preventDefault();
        target.textContent = '';
        onBlockTypeChange(block.id, 'heading3');
        target.classList.add('text-xl', 'font-bold', 'mb-2');
      }
    }
    
    if (e.key === 'Backspace') {
      if (range?.startOffset === 0 && index > 0) {
        e.preventDefault();
        const prevBlockElement = document.querySelector(`[data-block-id="${blocks[index - 1].id}"]`);
        const prevBlockEditable = prevBlockElement?.querySelector('[contenteditable]');
        if (prevBlockEditable) {
          try {
            // Get the current block's HTML content
            const currentHTML = target.innerHTML;
            
            // Get the previous block's HTML content
            const prevHTML = prevBlockEditable.innerHTML;
            
            // Update the previous block with combined content
            prevBlockEditable.innerHTML = prevHTML + currentHTML;
            onContentChange(blocks[index - 1].id, prevBlockEditable.textContent || '');
            
            // Delete the current block
            onDeleteBlock(index);
            
            // Focus the previous block
            (prevBlockEditable as HTMLElement).focus();
            
            // Set cursor at the position where the lines were merged
            const newRange = document.createRange();
            const textNode = prevBlockEditable.firstChild || prevBlockEditable;
            const prevLength = prevHTML.length;
            newRange.setStart(textNode, prevLength);
            newRange.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          } catch (error) {
            console.error('Error handling backspace:', error);
          }
        }
      } else if (target.textContent === '' && blocks.length > 1) {
        e.preventDefault();
        onDeleteBlock(index);
      }
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        const prevBlockElement = document.querySelector(`[data-block-id="${blocks[index - 1].id}"]`);
        const prevBlockEditable = prevBlockElement?.querySelector('[contenteditable]');
        if (prevBlockEditable) {
          (prevBlockEditable as HTMLElement).focus();
          const newRange = document.createRange();
          newRange.selectNodeContents(prevBlockEditable);
          newRange.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (index < blocks.length - 1) {
        e.preventDefault();
        const nextBlockElement = document.querySelector(`[data-block-id="${blocks[index + 1].id}"]`);
        const nextBlockEditable = nextBlockElement?.querySelector('[contenteditable]');
        if (nextBlockEditable) {
          (nextBlockEditable as HTMLElement).focus();
          const newRange = document.createRange();
          newRange.selectNodeContents(nextBlockEditable);
          newRange.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      }
    }
  };

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.id]);

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
        <div className="flex-grow">
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            className={`outline-none min-h-[1.5em] text-gray-900 dark:text-white whitespace-pre-wrap ${
              block.type === 'heading1' ? 'text-3xl font-bold mb-4' :
              block.type === 'heading2' ? 'text-2xl font-bold mb-3' :
              block.type === 'heading3' ? 'text-xl font-bold mb-2' :
              block.type === 'image' ? 'block' :
              ''
            }`}
            style={block.type === 'image' ? {
              textAlign: block.alignment || 'left',
              cursor: 'pointer'
            } : undefined}
          />
        </div>
      </div>
    </div>
  );
};

const BlockEditor: React.FC<BlockEditorProps> = ({ initialContent = '', onChange }) => {
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

  const focusBlock = (index: number) => {
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
          range.collapse(false);
          
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }, 50);
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
        <div className="space-y-1">
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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default BlockEditor; 