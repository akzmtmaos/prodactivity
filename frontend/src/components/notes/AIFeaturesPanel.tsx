import React, { useState } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  AcademicCapIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AIFeaturesPanelProps {
  noteContent: string;
  noteTitle: string;
}

const AIFeaturesPanel: React.FC<AIFeaturesPanelProps> = ({ noteContent, noteTitle }) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const features = [
    {
      id: 'summarize',
      name: 'Smart Summarization',
      icon: DocumentTextIcon,
      description: 'Get AI-powered summaries of your notes in different formats'
    },
    {
      id: 'review',
      name: 'AI Reviewer',
      icon: AcademicCapIcon,
      description: 'Get automated review questions and explanations'
    },
    {
      id: 'chat',
      name: 'AI Chat',
      icon: ChatBubbleLeftRightIcon,
      description: 'Chat with AI about your notes content'
    }
  ];

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(featureId);
    setIsLoading(true);
    // TODO: Implement feature-specific logic
    setTimeout(() => setIsLoading(false), 1000); // Temporary loading simulation
  };

  const handleCloseFeature = () => {
    setActiveFeature(null);
  };

  return (
    <>
      {/* Main AI Features Sidebar */}
      <div className="w-16 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-screen flex flex-col items-center py-4 space-y-4">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => handleFeatureClick(feature.id)}
            className={`p-2 rounded-lg transition-colors group relative
              ${activeFeature === feature.id 
                ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}
            title={feature.name}
          >
            <feature.icon className="h-6 w-6" />
            {/* Tooltip */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:block">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                {feature.name}
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
          </button>
        ))}
      </div>

      {/* Feature Results Sidebar */}
      {activeFeature && (
        <div className="absolute right-16 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg h-[calc(100vh-100px)]" style={{ top: '50px' }}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {features.find(f => f.id === activeFeature)?.name}
              </h2>
              <button
                onClick={handleCloseFeature}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {features.find(f => f.id === activeFeature)?.description}
                  </p>
                  {/* Feature-specific content will be rendered here */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Feature content will be displayed here...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIFeaturesPanel; 