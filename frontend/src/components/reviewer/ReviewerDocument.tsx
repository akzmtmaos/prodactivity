import React from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  source_note_title?: string;
  source_notebook_name?: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  tags: string[];
}

interface ReviewerDocumentProps {
  reviewer: Reviewer;
  onClose: () => void;
}

const preprocessContentWithBullets = (content: string) => {
  const sectionTitles = [
    'Summary:',
    'Terminology:',
    'Key Points:',
    'Main Idea:'
  ];
  const lines = content.split(/\r?\n/);
  let processed: string[] = [];
  let inSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (sectionTitles.includes(line)) {
      processed.push(line);
      // Always insert a blank line after section title
      processed.push('');
      inSection = true;
      continue;
    }
    // If next line is a section title, stop section
    if (sectionTitles.includes(line) || line === '') {
      processed.push(line);
      inSection = false;
      continue;
    }
    // If in a section and line is not a bullet or section title, add bullet
    if (inSection && !line.startsWith('- ') && !line.startsWith('* ') && !sectionTitles.includes(line)) {
      processed.push('- ' + line);
    } else {
      processed.push(line);
    }
  }
  return processed.join('\n');
};

const ReviewerDocument: React.FC<ReviewerDocumentProps> = ({ reviewer, onClose }) => {
  // Determine if this is a quiz (by tag or title)
  const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));

  // For quizzes, robustly preprocess to ensure each question/answer is on its own line
  const preprocessQuizContent = (content: string) => {
    // For each line, split at every A., B., C., D., Answer:, or **Answer:**
    return content.split(/\r?\n/).map(line => {
      // Split at A., B., C., D., Answer:, or **Answer:**, keeping the delimiter
      const parts = line.split(/(?=A\.)|(?=B\.)|(?=C\.)|(?=D\.)|(?=Answer:)|(?=\*\*Answer:\*\*)/g);
      return parts.map(part => part.trim()).join('\n');
    }).join('\n');
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl p-6 relative flex flex-col max-h-[80vh]">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{reviewer.title}</h2>
        <div className="overflow-y-auto flex-1 p-2 text-base text-gray-900 dark:text-white">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {isQuiz ? (
              <div className="whitespace-pre-wrap">{preprocessQuizContent(reviewer.content)}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessContentWithBullets(reviewer.content)}</ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
};

export default ReviewerDocument; 