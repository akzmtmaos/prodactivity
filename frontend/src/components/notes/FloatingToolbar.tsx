import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Type, List, Link, Quote, Code } from 'lucide-react';

interface FloatingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  selectedText: string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onFormat,
  onClose,
  position,
  selectedText
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (selectedText.trim()) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [selectedText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !selectedText.trim()) {
    return null;
  }

  const formatButtons = [
    {
      icon: Bold,
      command: 'bold',
      label: 'Bold',
      shortcut: 'Ctrl+B'
    },
    {
      icon: Italic,
      command: 'italic',
      label: 'Italic',
      shortcut: 'Ctrl+I'
    },
    {
      icon: Underline,
      command: 'underline',
      label: 'Underline',
      shortcut: 'Ctrl+U'
    },
    {
      icon: Type,
      command: 'formatBlock',
      value: 'h1',
      label: 'Heading 1',
      shortcut: 'Ctrl+1'
    },
    {
      icon: Type,
      command: 'formatBlock',
      value: 'h2',
      label: 'Heading 2',
      shortcut: 'Ctrl+2'
    },
    {
      icon: Type,
      command: 'formatBlock',
      value: 'h3',
      label: 'Heading 3',
      shortcut: 'Ctrl+3'
    },
    {
      icon: List,
      command: 'insertUnorderedList',
      label: 'Bullet List',
      shortcut: 'Ctrl+Shift+8'
    },
    {
      icon: Quote,
      command: 'formatBlock',
      value: 'blockquote',
      label: 'Quote',
      shortcut: 'Ctrl+Shift+>'
    },
    {
      icon: Code,
      command: 'formatBlock',
      value: 'pre',
      label: 'Code Block',
      shortcut: 'Ctrl+Shift+`'
    }
  ];

  const handleFormat = (command: string, value?: string) => {
    onFormat(command, value);
    // Don't close the toolbar - let it stay visible while text is selected
  };

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-1"
      style={{
        left: position.x,
        top: position.y - 50, // Position above the selection
        transform: 'translateX(-50%)'
      }}
    >
      {formatButtons.map((button, index) => {
        const Icon = button.icon;
        return (
          <button
            key={index}
            onClick={() => handleFormat(button.command, button.value)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group relative"
            title={`${button.label} (${button.shortcut})`}
          >
            <Icon size={16} className="text-gray-600 dark:text-gray-300" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {button.label}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          </button>
        );
      })}
      
      {/* Divider */}
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>
      
      {/* Quick actions */}
      <button
        onClick={() => handleFormat('createLink', prompt('Enter URL:') || undefined)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group relative"
        title="Create Link (Ctrl+K)"
      >
        <Link size={16} className="text-gray-600 dark:text-gray-300" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Create Link
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
        </div>
      </button>
    </div>
  );
};

export default FloatingToolbar;
