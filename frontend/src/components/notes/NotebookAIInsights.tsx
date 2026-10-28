// frontend/src/components/notes/NotebookAIInsights.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain,
  RefreshCw,
  X,
  Copy,
  Check,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import HeaderTooltip from '../common/HeaderTooltip';

interface Notebook {
  id: number;
  name: string;
  notebook_type: string;
  urgency_level: string;
  description: string;
  color: string;
  notes_count: number;
}

interface Note {
  id: number;
  title: string;
  content: string;
  priority: string;
  is_urgent: boolean;
  note_type: string;
  notebook_color: string;
  created_at: string;
  updated_at: string;
}

interface NotebookAIInsightsProps {
  notebook: Notebook;
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
}

type Priority = 'urgent' | 'high' | 'medium' | 'low';

/** Same priority colours the task surfaces use, so notes read the same way. */
const PRIORITY_META: Record<Priority, { label: string; dot: string }> = {
  urgent: { label: 'Urgent', dot: 'bg-red-500' },
  high: { label: 'High', dot: 'bg-orange-500' },
  medium: { label: 'Medium', dot: 'bg-amber-400' },
  low: { label: 'Low', dot: 'bg-emerald-500' },
};

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const wordCount = (html: string) => {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
};

const relativeTime = (value?: string | null): string => {
  if (!value) return 'unknown';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'unknown';
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const splitCells = (row: string): string[] =>
  row
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);

const formatRow = (cells: string[]): string => `| ${cells.join(' | ')} |`;

const isSeparatorCells = (cells: string[]): boolean =>
  cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));

/** A separator row written without the outer pipes, e.g. `--- | --- | ---`. */
const isBareSeparator = (line: string): boolean =>
  /^:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+$/.test(line) && splitCells(line).length > 1;

/**
 * Small models merge several rows onto one line (`| a | b | | c | d |`), which reaches us
 * as a row with an empty middle cell. Split those back into separate rows.
 */
const splitMergedRows = (row: string): string[] =>
  row.split(/\|\s+\|/).map((fragment) => `| ${fragment.trim().replace(/^\|/, '').replace(/\|$/, '').trim()} |`);

/**
 * The AI returns markdown, and the tailwind typography plugin is not installed - every
 * `prose` class in this app is inert. Style the elements we actually get instead.
 */
const MarkdownBlock: React.FC<{ text: string }> = ({ text }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      h1: ({ children }) => (
        <h1 className="mb-2 mt-5 border-t border-gray-200 pt-3.5 text-[14px] font-semibold text-gray-900 first:mt-0 first:border-t-0 first:pt-0 dark:border-[#333333] dark:text-white">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-2.5 mt-5 first:mt-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
            {children}
          </span>
          <span className="mt-1 block h-px w-full bg-gray-200 dark:bg-[#333333]" />
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-1.5 mt-3.5 text-[13px] font-semibold text-gray-900 first:mt-0 dark:text-white">{children}</h3>
      ),
      h4: ({ children }) => (
        <h4 className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 first:mt-0 dark:text-gray-400">
          {children}
        </h4>
      ),
      p: ({ children }) => (
        <p className="mb-2 text-[13px] leading-relaxed text-gray-700 last:mb-0 dark:text-gray-300">{children}</p>
      ),
      ul: ({ children }) => (
        <ul className="mb-2 ml-4 list-disc space-y-1 text-[13px] text-gray-700 marker:text-gray-400 dark:text-gray-300">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-2 ml-4 list-decimal space-y-1 text-[13px] text-gray-700 marker:text-gray-400 dark:text-gray-300">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      a: ({ children, href }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-gray-200 pl-3 text-[13px] italic text-gray-600 dark:border-[#3f3f3f] dark:text-gray-400">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-gray-200 dark:border-[#333333]" />,
      code: ({ children }) => (
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11.5px] text-indigo-700 dark:bg-[#252525] dark:text-indigo-300">
          {children}
        </code>
      ),
      pre: ({ children }) => (
        <pre className="my-2 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-[11.5px] leading-relaxed text-gray-800 dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-gray-200">
          {children}
        </pre>
      ),
      table: ({ children }) => (
        <div className="my-3 overflow-x-auto rounded-md border border-gray-200 dark:border-[#333333]">
          <table className="w-full border-collapse text-left text-[12px]">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-gray-50 dark:bg-[#252525]">{children}</thead>,
      tbody: ({ children }) => (
        <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="align-top even:bg-gray-50/60 dark:even:bg-[#232323]">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="border-b border-gray-200 px-2.5 py-1.5 align-top text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-[#333333] dark:text-gray-400">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-gray-100 px-2.5 py-1.5 align-top leading-relaxed text-gray-700 last:border-b-0 dark:border-[#2a2a2a] dark:text-gray-300">
          {children}
        </td>
      ),
    }}
  >
    {text}
  </ReactMarkdown>
);

const NotebookAIInsights: React.FC<NotebookAIInsightsProps> = ({
  notebook,
  notes,
  isOpen,
  onClose,
}) => {
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const generatedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      generatedFor.current = null;
      return;
    }
    if (!notebook || notes.length === 0) return;
    // One request per open: `notes` is a fresh array on every parent render.
    if (generatedFor.current === notebook.id) return;
    generatedFor.current = notebook.id;
    generateNotebookSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, notebook?.id, notes.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  /**
   * The summary is markdown, and the model is asked to use tables because they organize
   * structured content best. It breaks them in predictable ways: rows merged onto one
   * line, a missing separator row, or no outer pipes at all. Repair those, leave prose alone.
   */
  const normalizeMarkdown = (raw: string): string => {
    if (!raw) return '';

    let text = raw.replace(/\r\n/g, '\n');

    // Empty emphasis artefacts render as stray asterisks.
    text = text.replace(/\*\*\s*\*\*/g, '');

    // A table wrapped in a code fence renders as code; unwrap it.
    text = text.replace(/```(?:markdown|md)?[ \t]*\n?(\|[\s\S]*?)\n?```/g, '$1');

    const out: string[] = [];
    let inTable = false;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const isRow =
        trimmed.startsWith('|') ||
        (inTable && trimmed.includes('|') && !/^[#>]/.test(trimmed) && !trimmed.startsWith('```'));

      if (!isRow) {
        // `Term | Meaning` over `--- | ---`: the model left off the outer pipes, so the
        // previous line is a header rather than a paragraph.
        if (isBareSeparator(trimmed) && out.length > 0) {
          const headerCells = splitCells(out[out.length - 1]);
          const columns = splitCells(trimmed).length;
          if (headerCells.length === columns) {
            out[out.length - 1] = formatRow(headerCells);
            out.push(formatRow(Array(columns).fill('---')));
            inTable = true;
            continue;
          }
        }

        inTable = false;
        if (!/^#+\s*$/.test(trimmed)) out.push(line.trimEnd());
        continue;
      }

      for (const row of splitMergedRows(trimmed)) {
        const cells = splitCells(row);
        if (cells.length === 0) continue;

        // The header always gets its separator below, so the model's own separator row is
        // never needed - and it must not land after a data row.
        if (isSeparatorCells(cells)) continue;

        if (!inTable) {
          // First table row we see is the header, but its separator may be missing.
          out.push(formatRow(cells));
          out.push(formatRow(cells.map(() => '---')));
          inTable = true;
          continue;
        }

        out.push(formatRow(cells));
      }
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const callBackendSummary = async (notebookId: number) => {
    try {
      // Use a longer timeout for AI generation (up to 60 seconds)
      const res = await axiosInstance.post(`/notes/notebook-summary/`, { notebook_id: notebookId }, { timeout: 60000 });
      const data = res.data || {};
      const out = (data.summary || '').toString();
      if (!out.trim()) {
        throw new Error('Empty summary received from server');
      }
      return out.trim();
    } catch (error: any) {
      // Re-throw with more context
      if (error.response) {
        const errorData = error.response.data || {};
        const errorMsg = errorData.error || error.response.statusText || 'Server error';
        throw new Error(errorMsg);
      }
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Request timeout - The AI is taking longer than expected. Please try again.');
      }
      throw error;
    }
  };

  const generateNotebookSummary = async () => {
    setIsSummarizing(true);
    setError(null);
    try {
      const summary = await callBackendSummary(notebook.id);
      if (summary && summary.trim()) {
        setAiSummary(summary);
        setUsedFallback(false);
      } else {
        throw new Error('Empty summary received');
      }
    } catch (e: any) {
      console.error('AI summary error:', e);
      const errorMessage = e?.response?.data?.error || e?.message || 'Failed to generate summary';
      setError(errorMessage);
      // Keep the panel useful when the model is unavailable: an overview from the notes
      // themselves, labelled as such.
      setAiSummary(buildLocalOverview(notes, notebook));
      setUsedFallback(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  /** Fallback overview written from the notes' own data (no invented content). */
  const buildLocalOverview = (ns: Note[], nb: Notebook): string => {
    if (ns.length === 0) return '';
    const totalWords = ns.reduce((sum, note) => sum + wordCount(note.content), 0);
    const recent = [...ns]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 5);

    const lines = [
      `## ${nb.name || 'Notebook'} at a glance`,
      `- **${ns.length}** note${ns.length === 1 ? '' : 's'}, about **${totalWords.toLocaleString()}** words in total`,
      `- Last updated **${relativeTime(recent[0]?.updated_at || recent[0]?.created_at)}**`,
      '',
      '### Most recently touched',
      ...recent.map((note) => `- ${(note.title || 'Untitled note').trim()} — ${relativeTime(note.updated_at || note.created_at)}`),
    ];

    return lines.join('\n');
  };

  const insights = useMemo(() => {
    const totalWords = notes.reduce((sum, note) => sum + wordCount(note.content), 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lastTouched = (note: Note) => new Date(note.updated_at || note.created_at).getTime();

    const updatedThisWeek = notes.filter((note) => lastTouched(note) >= weekAgo).length;
    const averageWords = notes.length ? Math.round(totalWords / notes.length) : 0;
    const recent = [...notes].sort((a, b) => lastTouched(b) - lastTouched(a)).slice(0, 6);

    return { totalWords, averageWords, updatedThisWeek, recent };
  }, [notes]);

  const copySummary = async () => {
    const text = (aiSummary || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!isOpen) return null;

  const hasNotes = notes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label={`AI Insights for ${notebook.name}`}
        className="relative mx-4 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl dark:border-[#333333] dark:bg-[#1e1e1e]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-[#333333]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Brain size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">AI Insights</h2>
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                {notebook.name} · {notes.length} note{notes.length === 1 ? '' : 's'}
                {notebook.notebook_type ? ` · ${notebook.notebook_type}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <HeaderTooltip label="Regenerate summary" fixed>
              <button
                onClick={generateNotebookSummary}
                disabled={isSummarizing || !hasNotes}
                aria-label="Regenerate summary"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white"
              >
                <RefreshCw size={14} className={isSummarizing ? 'animate-spin' : ''} />
              </button>
            </HeaderTooltip>
            <HeaderTooltip label={copied ? 'Copied' : 'Copy summary'} fixed>
              <button
                onClick={copySummary}
                disabled={!aiSummary}
                aria-label="Copy summary"
                className="flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333333] dark:text-gray-300 dark:hover:bg-[#2f2f2f]"
              >
                {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </HeaderTooltip>
            <HeaderTooltip label="Close" fixed>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#2f2f2f] dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </HeaderTooltip>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {!hasNotes ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-200 py-12 text-center dark:border-[#333333]">
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-[#252525] dark:text-gray-400">
                <FileText size={16} />
              </span>
              <p className="text-[13px] font-medium text-gray-900 dark:text-white">Nothing to look at yet</p>
              <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Insights are built from the notes in this notebook. Add one and they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <section className="overflow-hidden rounded-md border border-gray-200 dark:border-[#333333]">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-[#333333] dark:bg-[#252525]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Notebook summary
                  </h3>
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    {isSummarizing ? (
                      <>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                        Writing…
                      </>
                    ) : (
                      'From your notes'
                    )}
                  </span>
                </div>

                <div className="px-3 py-3">
                  {isSummarizing && !aiSummary ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-[#333333]" />
                      <div className="h-3 w-full rounded bg-gray-200 dark:bg-[#333333]" />
                      <div className="h-3 w-11/12 rounded bg-gray-200 dark:bg-[#333333]" />
                      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-[#333333]" />
                    </div>
                  ) : (
                    <MarkdownBlock text={normalizeMarkdown(aiSummary)} />
                  )}

                  {error && !isSummarizing && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-900/60 dark:bg-amber-900/20">
                      <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">{error}</p>
                        <button
                          onClick={generateNotebookSummary}
                          className="mt-1 text-[11px] font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-100"
                        >
                          {usedFallback ? 'Try the AI summary again' : 'Retry'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                {/* At a glance */}
                <section className="rounded-md border border-gray-200 p-3 dark:border-[#333333]">
                  <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    At a glance
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Notes', value: notes.length.toLocaleString() },
                      { label: 'Words', value: insights.totalWords.toLocaleString() },
                      { label: 'Avg note', value: `${insights.averageWords.toLocaleString()}w` },
                      { label: 'This week', value: `${insights.updatedThisWeek}/${notes.length}` },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md bg-gray-50 px-2.5 py-2 dark:bg-[#252525]"
                      >
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</div>
                        <div className="text-[15px] font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Recently updated */}
                <section className="rounded-md border border-gray-200 p-3 dark:border-[#333333]">
                  <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Recently updated
                  </h3>
                  <ul className="space-y-2">
                    {insights.recent.map((note) => {
                      const priority = PRIORITY_META[(note.priority as Priority) || 'medium'] || PRIORITY_META.medium;
                      return (
                        <li key={note.id} className="flex items-start justify-between gap-3 text-[12px]">
                          <span className="flex min-w-0 items-start gap-2">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${priority.dot}`}
                              title={priority.label}
                            />
                            <span className="truncate text-gray-700 dark:text-gray-300">{note.title || 'Untitled note'}</span>
                          </span>
                          <span className="flex-shrink-0 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                            {relativeTime(note.updated_at || note.created_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookAIInsights;
