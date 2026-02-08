import React from 'react';
import { Award, ChevronRight } from 'lucide-react';

export interface LeagueTier {
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Tailwind: bg-* and text-* for badge */
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const LEAGUES: LeagueTier[] = [
  { name: 'Iron', minLevel: 1, maxLevel: 4, bgClass: 'bg-gray-600', textClass: 'text-gray-100', borderClass: 'border-gray-500' },
  { name: 'Bronze', minLevel: 5, maxLevel: 9, bgClass: 'bg-amber-700', textClass: 'text-amber-100', borderClass: 'border-amber-600' },
  { name: 'Silver', minLevel: 10, maxLevel: 14, bgClass: 'bg-slate-400', textClass: 'text-slate-900', borderClass: 'border-slate-500' },
  { name: 'Gold', minLevel: 15, maxLevel: 19, bgClass: 'bg-yellow-500', textClass: 'text-yellow-900', borderClass: 'border-yellow-600' },
  { name: 'Platinum', minLevel: 20, maxLevel: 29, bgClass: 'bg-cyan-400', textClass: 'text-cyan-900', borderClass: 'border-cyan-500' },
  { name: 'Diamond', minLevel: 30, maxLevel: 49, bgClass: 'bg-indigo-400', textClass: 'text-indigo-900', borderClass: 'border-indigo-500' },
  { name: 'Master', minLevel: 50, maxLevel: 99, bgClass: 'bg-purple-500', textClass: 'text-purple-100', borderClass: 'border-purple-400' },
  { name: 'Legend', minLevel: 100, maxLevel: 999, bgClass: 'bg-gradient-to-r from-amber-400 to-rose-500', textClass: 'text-white', borderClass: 'border-amber-400' },
];

function getLeagueForLevel(level: number): { league: LeagueTier; nextLeague: LeagueTier | null; progressInTier: number } {
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
    <div className="flex flex-col items-center justify-center w-full">
      <div className="flex items-center gap-2 mb-2">
        <Award className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden />
        <span className="text-sm text-gray-600 dark:text-gray-400">Level League</span>
      </div>
      <div
        className={`inline-flex items-center justify-center px-5 py-2.5 rounded-lg border ${league.borderClass} ${league.bgClass} ${league.textClass}`}
      >
        <span className="text-lg font-semibold">{league.name}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Levels {league.minLevel}–{league.maxLevel}
      </p>
      {nextLeague && (
        <>
          <div className="w-full max-w-[160px] mt-2 h-1.5 bg-gray-100 dark:bg-[#1e1e1e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${league.bgClass}`}
              style={{ width: `${progressInTier * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            Next: <span className="font-medium text-gray-700 dark:text-gray-300">{nextLeague.name}</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </>
      )}
    </div>
  );
};

export default LevelLeague;
