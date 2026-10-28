import React from 'react';
import { Award } from 'lucide-react';

export interface LeagueTier {
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Tailwind: bg-* and text-* for badge */
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const LEAGUES: LeagueTier[] = [
  { name: 'Iron', minLevel: 1, maxLevel: 4, bgClass: 'bg-gray-600', textClass: 'text-gray-100', borderClass: 'border-gray-500' },
  { name: 'Bronze', minLevel: 5, maxLevel: 9, bgClass: 'bg-amber-700', textClass: 'text-amber-100', borderClass: 'border-amber-600' },
  { name: 'Silver', minLevel: 10, maxLevel: 14, bgClass: 'bg-slate-400', textClass: 'text-slate-900', borderClass: 'border-slate-500' },
  { name: 'Gold', minLevel: 15, maxLevel: 19, bgClass: 'bg-yellow-500', textClass: 'text-yellow-900', borderClass: 'border-yellow-600' },
  { name: 'Platinum', minLevel: 20, maxLevel: 29, bgClass: 'bg-cyan-400', textClass: 'text-cyan-900', borderClass: 'border-cyan-500' },
  { name: 'Diamond', minLevel: 30, maxLevel: 49, bgClass: 'bg-indigo-400', textClass: 'text-indigo-900', borderClass: 'border-indigo-500' },
  { name: 'Master', minLevel: 50, maxLevel: 99, bgClass: 'bg-purple-500', textClass: 'text-purple-100', borderClass: 'border-purple-400' },
  { name: 'Legend', minLevel: 100, maxLevel: 999, bgClass: 'bg-gradient-to-r from-amber-400 to-rose-500', textClass: 'text-white', borderClass: 'border-amber-400' },
];

export function getLeagueForLevel(level: number): { league: LeagueTier; nextLeague: LeagueTier | null; progressInTier: number } {
  const clampedLevel = Math.max(1, Math.min(999, level));
  for (let i = 0; i < LEAGUES.length; i++) {
    if (clampedLevel >= LEAGUES[i].minLevel && clampedLevel <= LEAGUES[i].maxLevel) {
      const league = LEAGUES[i];
      const nextLeague = i < LEAGUES.length - 1 ? LEAGUES[i + 1] : null;
      const range = league.maxLevel - league.minLevel + 1;
      const progressInTier = range > 0 ? (clampedLevel - league.minLevel) / range : 1;
      return { league, nextLeague, progressInTier };
    }
  }
  const last = LEAGUES[LEAGUES.length - 1];
  return { league: last, nextLeague: null, progressInTier: 1 };
}

interface LevelLeagueProps {
  currentLevel: number;
}

const LevelLeague: React.FC<LevelLeagueProps> = ({ currentLevel }) => {
  const { league, nextLeague, progressInTier } = getLeagueForLevel(currentLevel);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 dark:border-[#333333] dark:bg-[#262626]">
        <Award className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${league.borderClass} ${league.bgClass} ${league.textClass}`}>
            {league.name}
          </span>
          <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
            Levels {league.minLevel}–{league.maxLevel}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#262626]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${league.bgClass}`}
            style={{ width: `${Math.max(progressInTier * 100, 2)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {nextLeague ? `Next league: ${nextLeague.name}` : 'Top league reached'}
        </p>
      </div>
    </div>
  );
};

export default LevelLeague;
