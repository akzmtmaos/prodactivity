import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, X } from 'lucide-react';
import { LEAGUES, getLeagueForLevel } from './LevelLeague';

interface LeagueInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
}

/**
 * Explains the leagues shown in the "Level league" card: which level range each
 * tier covers, which one the user is in, and how XP is earned to climb.
 */
const LeagueInfoModal: React.FC<LeagueInfoModalProps> = ({ isOpen, onClose, currentLevel }) => {
  const { league: currentLeague, nextLeague } = getLeagueForLevel(currentLevel);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="league-info-title"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-[#2f2f2f] dark:bg-[#1e1e1e]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-[#2f2f2f]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-[#333333] dark:bg-[#262626]">
              <Award className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="league-info-title" className="text-sm font-semibold text-gray-900 dark:text-white">
                Level leagues
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Your league is set by your level, and it never drops.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close league info"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-[#2d2d2d] dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2 dark:border-indigo-500/40 dark:bg-indigo-500/10">
            <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              You are here
            </span>
            <span className="flex items-center gap-2 text-[11px] tabular-nums text-indigo-700 dark:text-indigo-300">
              Level {currentLevel} · {currentLeague.name}
              {nextLeague ? ` → next: ${nextLeague.name}` : ' · top league'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {LEAGUES.map((tier) => {
              const isCurrent = tier.name === currentLeague.name;
              return (
                <div
                  key={tier.name}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 ${
                    isCurrent
                      ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                      : 'border-gray-200 dark:border-[#2f2f2f]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tier.borderClass} ${tier.bgClass} ${tier.textClass}`}
                    >
                      {tier.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    Levels {tier.minLevel}–{tier.maxLevel}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              How to climb
            </p>
            <ul className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400">
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <span>
                  Completing a task: <span className="tabular-nums font-medium">+5</span> low,{' '}
                  <span className="tabular-nums font-medium">+10</span> medium,{' '}
                  <span className="tabular-nums font-medium">+20</span> high —{' '}
                  <span className="tabular-nums">2 / 5 / 10</span> XP if it was already overdue.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <span>
                  Unlocking achievements: <span className="tabular-nums">25</span> common,{' '}
                  <span className="tabular-nums">50</span> rare, <span className="tabular-nums">100</span> epic,{' '}
                  <span className="tabular-nums">200</span> legendary.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <span>
                  Level <span className="tabular-nums">N</span> costs{' '}
                  <span className="tabular-nums">N × 100</span> XP, so every level needs 100 XP more than the one
                  before it.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-200 px-4 py-3 dark:border-[#2f2f2f]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 items-center rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#333333] dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#2d2d2d]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LeagueInfoModal;
