import React from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

interface Reviewer {
  id: number;
  title: string;
  content: string;
  source_note?: number | null;
  source_note_title?: string;
  source_note_notebook_id?: number | null;
  source_notebook?: number | null;
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
  const navigate = useNavigate();

  // Determine if this is a quiz (by tag or title)
  const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));

  const handleSourceClick = () => {
    if (reviewer.source_note && reviewer.source_note_notebook_id) {
      navigate(`/notes/notebooks/${reviewer.source_note_notebook_id}/notes/${reviewer.source_note}`);
      onClose();
    } else if (reviewer.source_note) {
      // Fallback: go to notes page if notebook ID not available
      navigate('/notes');
      onClose();
    } else if (reviewer.source_notebook) {
      navigate(`/notes?notebook=${reviewer.source_notebook}`);
      onClose();
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Clean Header */}
        <div className="relative bg-white dark:bg-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl transition-colors focus:outline-none"
            onClick={onClose}
          >
            ×
          </button>
          
          <div className="pr-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{reviewer.title}</h2>
            {(reviewer.source_note || reviewer.source_notebook) && (
              <button
                onClick={handleSourceClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors text-sm font-medium border border-indigo-200 dark:border-indigo-800"
              >
                <ExternalLink size={16} />
                <span>
                  Source: {reviewer.source_note_title || reviewer.source_notebook_name || 
                    (reviewer.source_note ? `Note #${reviewer.source_note}` : `Notebook #${reviewer.source_notebook}`)}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto flex-1 px-8 py-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="prose prose-lg dark:prose-invert max-w-none 
            prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-semibold prose-headings:mb-3
            prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-3
            prose-li:text-gray-700 dark:prose-li:text-gray-300
            prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
            prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm
            prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-lg
            prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
            prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
            {isQuiz ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {preprocessQuizContent(reviewer.content)}
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessContentWithBullets(reviewer.content)}</ReactMarkdown>
            )}
          </div>
        </div>

        {/* Simple Footer */}
        <div className="px-8 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Created: {new Date(reviewer.created_at).toLocaleDateString()} at {new Date(reviewer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Last updated: {new Date(reviewer.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
};

export default ReviewerDocument; 