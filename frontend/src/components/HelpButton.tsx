import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpButtonProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
}

const HelpButton: React.FC<HelpButtonProps> = ({ content, title = "Help", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`
          inline-flex items-center justify-center w-5 h-5 rounded-full
          bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
          text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200
          transition-colors duration-200 ml-2
          ${className}
        `}
        aria-label="Help"
        title={title}
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl top-full mt-2 left-1/2 -translate-x-1/2"
        >
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {content}
          </div>
          <button
            onClick={closeDropdown}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close help"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpButton;
