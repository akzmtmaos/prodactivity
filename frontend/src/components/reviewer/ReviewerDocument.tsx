import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, PlayCircle, BookOpen } from 'lucide-react';
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

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4">
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
            <div className="flex items-center gap-3 flex-wrap">
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
              {isQuiz && (
                <button
                  onClick={() => setShowInteractiveQuiz(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                >
                  <PlayCircle size={18} />
                  <span>Start Interactive Quiz</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="overflow-y-auto flex-1 px-8 py-6 bg-gray-50 dark:bg-gray-800/50">
          <style>{`
            .dark .prose,
            .dark .prose * {
              color: white !important;
            }
            .dark .prose h1,
            .dark .prose h2,
            .dark .prose h3,
            .dark .prose h4,
            .dark .prose h5,
            .dark .prose h6 {
              color: white !important;
            }
            .dark .prose p,
            .dark .prose li,
            .dark .prose span,
            .dark .prose div {
              color: white !important;
            }
            .dark .prose code {
              color: #818cf8 !important;
            }
            .dark .prose a {
              color: #818cf8 !important;
            }
            .dark .prose strong {
              color: white !important;
            }
          `}</style>
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-white
            prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-indigo-900 dark:prose-h3:text-indigo-300 prose-h3:border-b prose-h3:border-gray-200 dark:prose-h3:border-gray-700 prose-h3:pb-2
            prose-p:text-gray-700 dark:prose-p:text-white prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
            prose-ul:my-4 prose-ul:space-y-2
            prose-li:text-gray-700 dark:prose-li:text-white prose-li:leading-relaxed
            prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold prose-strong:text-indigo-700 dark:prose-strong:text-indigo-400
            prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:font-semibold
            prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:shadow-lg
            prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 dark:prose-blockquote:border-indigo-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-950/20 prose-blockquote:py-2 prose-blockquote:rounded-r
            prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            [&_*]:text-gray-700 dark:[&_*]:text-white
            [&_p]:text-gray-700 dark:[&_p]:text-white
            [&_li]:text-gray-700 dark:[&_li]:text-white
            [&_span]:text-gray-700 dark:[&_span]:text-white">
            {isQuiz ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 dark:text-white">
                  {preprocessQuizContent(reviewer.content)}
                </div>
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preprocessReviewerContent(reviewer.content)}</ReactMarkdown>
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

  return (
    <>
      {ReactDOM.createPortal(modal, document.body)}
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