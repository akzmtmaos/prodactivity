import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Star, StarOff, Trash2, Download, Share2, ExternalLink, PlayCircle, Trophy, Edit, MoreVertical, FileText, File } from 'lucide-react';
import { truncateHtmlContent } from '../../utils/htmlUtils';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import ShareModal from '../collaboration/ShareModal';
import jsPDF from 'jspdf';

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
  onEdit?: (reviewer: Reviewer) => void;
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
  onEdit,
  quizLoadingId,
  showFavorite = true,
  showGenerateQuiz = true,
  showTakeQuiz = false,
}) => {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const isQuiz = reviewer.tags && Array.isArray(reviewer.tags) && reviewer.tags.includes('quiz');

  // Update menu position when it opens
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSourceClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Source click - reviewer:', reviewer);
    console.log('source_note:', reviewer.source_note);
    console.log('source_note_notebook_id:', reviewer.source_note_notebook_id);
    console.log('source_notebook:', reviewer.source_notebook);
    
    if (reviewer.source_note) {
      // If we have notebook ID from backend, use it
      if (reviewer.source_note_notebook_id) {
        console.log('Navigating to:', `/notebooks/${reviewer.source_note_notebook_id}/note/${reviewer.source_note}`);
        navigate(`/notebooks/${reviewer.source_note_notebook_id}/note/${reviewer.source_note}`);
      } else {
        // Fetch the note to get notebook ID
        console.log('Fetching note to get notebook ID...');
        try {
          const response = await axiosInstance.get(`/notes/${reviewer.source_note}/`);
          const note = response.data;
          console.log('Fetched note:', note);
          
          if (note.notebook) {
            console.log('Navigating to:', `/notebooks/${note.notebook}/note/${reviewer.source_note}`);
            navigate(`/notebooks/${note.notebook}/note/${reviewer.source_note}`);
          } else {
            console.log('Note has no notebook, going to /notes');
            navigate('/notebooks');
          }
        } catch (err) {
          console.error('Failed to fetch note:', err);
          navigate('/notebooks');
        }
      }
    } else if (reviewer.source_notebook) {
      console.log('Navigating to notebook:', `/notes?notebook=${reviewer.source_notebook}`);
      navigate(`/notebooks?notebook=${reviewer.source_notebook}`);
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
    setShowMenu(false);
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

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    const title = reviewer.title || 'Reviewer';
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'reviewer';

    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(18);
    pdf.text(title, 14, 20);
    
    // Add content
    const contentText = reviewer.content || '';
    // Remove HTML tags for PDF
    const textContent = contentText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(textContent, 180); // 180mm width
    let y = 30;
    
    lines.forEach((line: string) => {
      if (y > 270) { // New page if near bottom
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 14, y);
      y += 7;
    });

    pdf.save(`${safeTitle}.pdf`);
  };
  return (
    <div
      className="group relative bg-white dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-[#333333] hover:border-indigo-400/50 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all duration-150 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-lg" />
      <div className="flex items-center justify-between gap-3 pl-3 pr-2.5 py-2">
        {/* Left: Title and Source */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {reviewer.title}
          </h3>
          {(reviewer.source_note || reviewer.source_notebook) && (
            <button
              onClick={handleSourceClick}
              className="flex-shrink-0 flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors truncate max-w-[140px]"
              title={`Go to ${reviewer.source_note ? 'note' : 'notebook'}: ${reviewer.source_note_title || reviewer.source_notebook_name || (reviewer.source_note ? `Note #${reviewer.source_note}` : `Notebook #${reviewer.source_notebook}`)}`}
            >
              <ExternalLink size={11} />
              <span className="truncate">{reviewer.source_note_title || reviewer.source_notebook_name || (reviewer.source_note ? `#${reviewer.source_note}` : `Notebook`)}</span>
            </button>
          )}
        </div>

        {/* Right: Meta + Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Best Score (quizzes) */}
          {reviewer.best_score !== null && reviewer.best_score !== undefined && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <Trophy size={12} />
              {reviewer.best_score_correct != null && reviewer.best_score_total != null
                ? `${reviewer.best_score_correct}/${reviewer.best_score_total}`
                : `${reviewer.best_score}%`}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:inline">
            {new Date(reviewer.created_at).toLocaleDateString()}
          </span>
          {showFavorite && onFavorite && (
            <button
              onClick={e => { e.stopPropagation(); onFavorite(reviewer.id); }}
              className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-[#333333]"
              title={reviewer.is_favorite ? "Remove from favorites" : "Add to favorites"}
              aria-label={reviewer.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {reviewer.is_favorite ? <Star size={14} className="text-yellow-500 fill-current" /> : <StarOff size={14} />}
            </button>
          )}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical size={14} />
            </button>
            
            {/* Dropdown Menu - Rendered as Portal */}
            {showMenu && ReactDOM.createPortal(
              <div 
                ref={menuRef}
                className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999]"
                style={{
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`,
                }}
              >
                <div className="py-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowShareModal(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 size={16} />
                    Share {isQuiz ? 'Quiz' : 'Reviewer'}
                  </button>
                  
                  {onEdit && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onEdit(reviewer);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit {isQuiz ? 'Quiz' : 'Reviewer'}
                    </button>
                  )}
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  
                  <button
                    onClick={handleDownloadDocx}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Download as DOC
                  </button>
                  
                  <button
                    onClick={handleDownloadPdf}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <File size={16} />
                    Download as PDF
                  </button>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(reviewer.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete {isQuiz ? 'Quiz' : 'Reviewer'}
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
          
          {showGenerateQuiz && onGenerateQuiz && (
            <button
              onClick={e => { e.stopPropagation(); onGenerateQuiz(reviewer); }}
              disabled={quizLoadingId === reviewer.id}
              className="flex items-center justify-center h-7 px-2.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {quizLoadingId === reviewer.id ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              ) : (
                'Generate Quiz'
              )}
            </button>
          )}
          {showTakeQuiz && onTakeQuiz && (
            <button
              onClick={e => { e.stopPropagation(); onTakeQuiz(reviewer); }}
              className="flex items-center justify-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              title="Start interactive quiz"
            >
              <PlayCircle size={12} />
              Take Quiz
            </button>
          )}
        </div>
      </div>
      
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itemType="reviewer"
        itemId={reviewer.id}
        itemTitle={reviewer.title}
      />
    </div>
  );
};

export default ReviewerCard; 