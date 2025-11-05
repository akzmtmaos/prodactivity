import React from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Star, StarOff, Trash2, Download, Share2, ExternalLink, PlayCircle, Trophy } from 'lucide-react';
import { truncateHtmlContent } from '../../utils/htmlUtils';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';

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
  best_score?: number | null;
  best_score_correct?: number | null;
  best_score_total?: number | null;
}

interface ReviewerCardProps {
  reviewer: Reviewer;
  onFavorite?: (id: number) => void;
  onDelete: (id: number) => void;
  onGenerateQuiz?: (reviewer: Reviewer) => void;
  onClick: () => void;
  onTakeQuiz?: (reviewer: Reviewer) => void;
  quizLoadingId?: number | null;
  showFavorite?: boolean;
  showGenerateQuiz?: boolean;
  showTakeQuiz?: boolean;
}

const ReviewerCard: React.FC<ReviewerCardProps> = ({
  reviewer,
  onFavorite,
  onDelete,
  onGenerateQuiz,
  onClick,
  onTakeQuiz,
  quizLoadingId,
  showFavorite = true,
  showGenerateQuiz = true,
  showTakeQuiz = false,
}) => {
  const navigate = useNavigate();

  const handleSourceClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Source click - reviewer:', reviewer);
    console.log('source_note:', reviewer.source_note);
    console.log('source_note_notebook_id:', reviewer.source_note_notebook_id);
    console.log('source_notebook:', reviewer.source_notebook);
    
    if (reviewer.source_note) {
      // If we have notebook ID from backend, use it
      if (reviewer.source_note_notebook_id) {
        console.log('Navigating to:', `/notes/notebooks/${reviewer.source_note_notebook_id}/notes/${reviewer.source_note}`);
        navigate(`/notes/notebooks/${reviewer.source_note_notebook_id}/notes/${reviewer.source_note}`);
      } else {
        // Fetch the note to get notebook ID
        console.log('Fetching note to get notebook ID...');
        try {
          const response = await axiosInstance.get(`/notes/${reviewer.source_note}/`);
          const note = response.data;
          console.log('Fetched note:', note);
          
          if (note.notebook) {
            console.log('Navigating to:', `/notes/notebooks/${note.notebook}/notes/${reviewer.source_note}`);
            navigate(`/notes/notebooks/${note.notebook}/notes/${reviewer.source_note}`);
          } else {
            console.log('Note has no notebook, going to /notes');
            navigate('/notes');
          }
        } catch (err) {
          console.error('Failed to fetch note:', err);
          navigate('/notes');
        }
      }
    } else if (reviewer.source_notebook) {
      console.log('Navigating to notebook:', `/notes?notebook=${reviewer.source_notebook}`);
      navigate(`/notes?notebook=${reviewer.source_notebook}`);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = reviewer.title || 'reviewer';
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'reviewer';

    const header = `# ${reviewer.title}\n\n`;
    const body = reviewer.content || '';
    const text = `${header}${body}`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = reviewer.title || 'Reviewer';
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'reviewer';

    const contentText = reviewer.content || '';
    const lines = contentText.split(/\r?\n/);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
            }),
            ...lines.map((line) =>
              new Paragraph({
                children: [new TextRun(line)],
              })
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="group relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Subtle accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title and Source */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {reviewer.title}
            </h3>
            {(reviewer.source_note || reviewer.source_notebook) && (
              <button
                onClick={handleSourceClick}
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
                title={`Go to ${reviewer.source_note ? 'note' : 'notebook'}: ${reviewer.source_note_title || reviewer.source_notebook_name || (reviewer.source_note ? `Note #${reviewer.source_note}` : `Notebook #${reviewer.source_notebook}`)}`}
              >
                <ExternalLink size={12} />
                {reviewer.source_note_title || reviewer.source_notebook_name || 
                  (reviewer.source_note ? `Note #${reviewer.source_note}` : `Notebook #${reviewer.source_notebook}`)}
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Best Score Badge (for quizzes only) */}
          {reviewer.best_score !== null && reviewer.best_score !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full">
              <Trophy size={14} className="text-yellow-600 dark:text-yellow-400" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                  {reviewer.best_score_correct && reviewer.best_score_total 
                    ? `${reviewer.best_score_correct}/${reviewer.best_score_total}`
                    : `${reviewer.best_score}%`}
                </span>
                {reviewer.best_score_correct && reviewer.best_score_total && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    ({reviewer.best_score}%)
                  </span>
                )}
              </div>
            </div>
          )}
          
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {new Date(reviewer.created_at).toLocaleDateString()}
          </span>
          
          {showFavorite && onFavorite && (
            <button
              onClick={e => {
                e.stopPropagation();
                onFavorite(reviewer.id);
              }}
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
              title={reviewer.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {reviewer.is_favorite ? <Star size={16} className="text-yellow-500 fill-current" /> : <StarOff size={16} />}
            </button>
          )}
          
          <button
            onClick={handleDownloadDocx}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Download as Word (.docx)"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={e => {
              e.stopPropagation();
              onDelete(reviewer.id);
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete reviewer"
          >
            <Trash2 size={16} />
          </button>
          
          {showGenerateQuiz && onGenerateQuiz && (
            <button
              onClick={e => {
                e.stopPropagation();
                onGenerateQuiz(reviewer);
              }}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              disabled={quizLoadingId === reviewer.id}
            >
              {quizLoadingId === reviewer.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>Generate Quiz</>
              )}
            </button>
          )}
          
          {showTakeQuiz && onTakeQuiz && (
            <button
              onClick={e => {
                e.stopPropagation();
                onTakeQuiz(reviewer);
              }}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md whitespace-nowrap font-semibold"
              title="Start interactive quiz"
            >
              <PlayCircle size={16} />
              Take Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerCard; 