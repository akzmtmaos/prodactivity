import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, PlayCircle, ChevronLeft } from 'lucide-react';
import InteractiveQuiz from './InteractiveQuiz';

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

const preprocessReviewerContent = (content: string) => {
  // Section titles we want to format as headers
  const sectionTitles = [
    'Summary:',
    'Key Terms:',
    'Terminology:',
    'Key Points:',
    'Main Idea:',
    'Main Ideas:',
    'Conclusion:',
    'Content Analysis:',
    'Main Point:'
  ];
  
  const lines = content.split(/\r?\n/);
  let processed: string[] = [];
  let currentSection: string | null = null;
  let lineNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      processed.push('');
      currentSection = null;
      lineNumber = 0;
      continue;
    }
    
    // Check if line is a section title
    const matchedSection = sectionTitles.find(title => line === title || line === title.replace(':', ''));
    
    if (matchedSection) {
      currentSection = matchedSection;
      lineNumber = 0;
      // Add spacing before section (except first one)
      if (processed.length > 0 && processed[processed.length - 1] !== '') {
        processed.push('');
      }
      // Convert to markdown heading
      processed.push(`### ${line.replace(':', '')}`);
      processed.push('');
      continue;
    }
    
    // If line already has bullet points, keep it
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      processed.push(line);
      lineNumber++;
      continue;
    }
    
    // If line starts with a number followed by period (like "1.", "2."), it's a numbered list item
    if (/^\d+\./.test(line)) {
      processed.push(line);
      lineNumber++;
      continue;
    }
    
    // If line looks like a term definition (Term: Definition), format it specially
    if (line.includes(':') && !line.endsWith(':')) {
      const colonIndex = line.indexOf(':');
      const beforeColon = line.substring(0, colonIndex).trim();
      const afterColon = line.substring(colonIndex + 1).trim();
      
      // Check if it's a simple term (not a sentence)
      if (beforeColon.length < 60 && !beforeColon.includes('.') && afterColon.length > 0) {
        processed.push(`- **${beforeColon}:** ${afterColon}`);
        lineNumber++;
        continue;
      }
    }
    
    // For lines in Key Terms, Key Points, or Main Idea sections, add bullets if not already present
    if (currentSection && (
      currentSection.includes('Key Terms') || 
      currentSection.includes('Terminology') || 
      currentSection.includes('Key Points') || 
      currentSection.includes('Main Idea')
    )) {
      // Only add bullet if line is not too long (likely a paragraph)
      if (line.length < 200) {
        processed.push(`- ${line}`);
      } else {
        // Long text, keep as paragraph
        processed.push(line);
      }
      lineNumber++;
      continue;
    }
    
    // Summary section - keep as paragraphs
    if (currentSection && currentSection.includes('Summary')) {
      processed.push(line);
      lineNumber++;
      continue;
    }
    
    // Default: add line as-is
    processed.push(line);
    lineNumber++;
  }
  
  return processed.join('\n');
};

const ReviewerDocument: React.FC<ReviewerDocumentProps> = ({ reviewer, onClose }) => {
  const navigate = useNavigate();
  const [showInteractiveQuiz, setShowInteractiveQuiz] = useState(false);
  const [viewMode, setViewMode] = useState<'read' | 'interactive'>('read');

  // Determine if this is a quiz (by tag or title)
  const isQuiz = (reviewer.tags && reviewer.tags.includes('quiz')) || (reviewer.title && reviewer.title.toLowerCase().startsWith('quiz:'));

  const handleSourceClick = () => {
    if (reviewer.source_note && reviewer.source_note_notebook_id) {
      navigate(`/notebooks/${reviewer.source_note_notebook_id}/note/${reviewer.source_note}`);
      onClose();
    } else if (reviewer.source_note) {
      // Fallback: go to notes page if notebook ID not available
      navigate('/notebooks');
      onClose();
    } else if (reviewer.source_notebook) {
      navigate(`/notebooks?notebook=${reviewer.source_notebook}`);
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

  /* Document-style layout (like Note document): full-height panel with header, scrollable body, footer */
  return (
    <>
      <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Document header – back + title + actions */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
            aria-label="Back to list"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {reviewer.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(reviewer.source_note || reviewer.source_notebook) && (
              <button
                onClick={handleSourceClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md transition-colors text-xs font-medium border border-indigo-200 dark:border-indigo-800"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Source</span>
              </button>
            )}
            {isQuiz && (
              <button
                onClick={() => setShowInteractiveQuiz(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-xs font-semibold"
              >
                <PlayCircle size={14} />
                <span className="hidden sm:inline">Start Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable document body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/40">
          <style>{`
            .dark .reviewer-doc-prose,
            .dark .reviewer-doc-prose * { color: inherit; }
            .dark .reviewer-doc-prose code { color: #818cf8 !important; }
            .dark .reviewer-doc-prose a { color: #818cf8 !important; }
          `}</style>
          <div className="reviewer-doc-prose prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-white
            prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-indigo-900 dark:prose-h3:text-indigo-300 prose-h3:border-b prose-h3:border-gray-200 dark:prose-h3:border-gray-700 prose-h3:pb-2
            prose-p:text-gray-700 dark:prose-p:text-white prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
            prose-ul:my-4 prose-ul:space-y-2
            prose-li:text-gray-700 dark:prose-li:text-white prose-li:leading-relaxed
            prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
            prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm
            prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-lg
            prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 dark:prose-blockquote:border-indigo-600 prose-blockquote:pl-4 prose-blockquote:italic
            prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline">
            {isQuiz ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 dark:text-white">
                  {preprocessQuizContent(reviewer.content)}
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessReviewerContent(reviewer.content)}</ReactMarkdown>
            )}
          </div>
        </div>

        {/* Document footer */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Created: {new Date(reviewer.created_at).toLocaleDateString()} · {new Date(reviewer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Updated: {new Date(reviewer.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {showInteractiveQuiz && isQuiz && (
        <InteractiveQuiz
          quiz={reviewer}
          onClose={() => setShowInteractiveQuiz(false)}
        />
      )}
    </>
  );
};

export default ReviewerDocument; 