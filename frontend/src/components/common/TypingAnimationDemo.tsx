// frontend/src/components/common/TypingAnimationDemo.tsx
import React, { useState } from 'react';
import TypingAnimation from './TypingAnimation';

const TypingAnimationDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [demoText, setDemoText] = useState('Hello! I am an AI assistant. I can help you with various tasks like summarizing notes, answering questions, and providing insights. This is how I would respond in a chat conversation, with a smooth typing animation just like ChatGPT!');

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Typing Animation Demo</h2>
      
      <div className="mb-4">
        <button
          onClick={() => setShowDemo(!showDemo)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {showDemo ? 'Hide Demo' : 'Show Demo'}
        </button>
      </div>

      {showDemo && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 max-w-md">
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-600 rounded-lg p-3 max-w-[80%]">
                {showDemo ? (
                  <TypingAnimation 
                    text={demoText} 
                    speed={30}
                    className="text-sm"
                    onComplete={() => console.log('Typing animation completed!')}
                  />
                ) : (
                  <span className="text-sm">{demoText}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>This demo shows how the AI responses will appear in your chat with a smooth typing animation.</p>
        <p className="mt-2">Features:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Character-by-character typing effect</li>
          <li>Blinking cursor during typing</li>
          <li>Configurable typing speed</li>
          <li>Completion callback</li>
          <li>Responsive design</li>
        </ul>
      </div>
    </div>
  );
};

export default TypingAnimationDemo;
