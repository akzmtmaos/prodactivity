import React, { useState, useEffect } from 'react';
import { X, Trophy, Users, Award, Zap } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { getAvatarUrl } from '../chat/utils';
import Toast from '../common/Toast';

interface Participant {
  id: string;
  user_id: number;
  username: string;
  email: string;
  avatar: string | null;
  status: string;
  score: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  completed_at: string | null;
  individual_xp_awarded: number;
  team_xp_received: number;
}

interface GroupQuiz {
  id: string;
  deck_id: number;
  deck_title: string;
  created_by_id: number;
  created_by_username: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  team_xp_awarded: number;
  team_xp_distributed: boolean;
  participants: Participant[];
  participant_count: number;
  completed_participants_count: number;
  all_participants_completed: boolean;
}

interface GroupQuizResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupQuizId: string;
}

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  accepted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  declined: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

// Profile picture with the initial as a fallback when none is set or it fails to load
const ParticipantAvatar: React.FC<{ username: string; avatar: string | null }> = ({ username, avatar }) => {
  const [failed, setFailed] = useState(false);
  const avatarUrl = getAvatarUrl(avatar);

  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={username}
          className="w-7 h-7 object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
          {(username || '?').charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

// One cell of the compact summary strip
const StatCell: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="px-3 py-2">
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{value}</p>
  </div>
);

const GroupQuizResultsModal: React.FC<GroupQuizResultsModalProps> = ({
  isOpen,
  onClose,
  groupQuizId
}) => {
  const [groupQuiz, setGroupQuiz] = useState<GroupQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && groupQuizId) {
      fetchResults();
    }
  }, [isOpen, groupQuizId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/decks/group-quizzes/${groupQuizId}/results/`);
      setGroupQuiz(response.data);
    } catch (error: any) {
      console.error('Error fetching group quiz results:', error);
      setToast({ 
        message: error.response?.data?.error || 'Failed to load results', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const participants = groupQuiz?.participants ?? [];
  const completedParticipants = participants.filter(p => p.status === 'completed');
  const avgScore = completedParticipants.length > 0
    ? Math.round(completedParticipants.reduce((sum, p) => sum + (p.score || 0), 0) / completedParticipants.length)
    : 0;

  // Leaderboard: finishers by score first, then everyone still pending, alphabetical
  const sortedParticipants = [...participants].sort((a, b) => {
    const aDone = a.status === 'completed';
    const bDone = b.status === 'completed';
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (aDone && bDone) return (b.score || 0) - (a.score || 0);
    return a.username.localeCompare(b.username);
  });
  let rank = 0;
  const rankedParticipants = sortedParticipants.map((participant) => ({
    participant,
    rank: participant.status === 'completed' ? ++rank : null,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-quiz-results-title"
        className="relative bg-white dark:bg-[#1e1e1e] rounded-md shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-[#333333] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <Trophy className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="min-w-0">
              <h2
                id="group-quiz-results-title"
                className="text-base font-semibold text-gray-900 dark:text-white truncate"
              >
                {groupQuiz?.title || 'Group Quiz Results'}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {groupQuiz
                  ? `${groupQuiz.deck_title} · by ${groupQuiz.created_by_username}`
                  : 'Loading results…'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close results"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 space-y-3 animate-pulse" aria-live="polite" aria-label="Loading results">
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-[#333333] rounded-md border border-gray-200 dark:border-[#333333]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="px-3 py-2 space-y-1.5">
                    <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-3.5 w-10 bg-gray-100 dark:bg-gray-800 rounded" />
                  </div>
                ))}
              </div>
              <div className="rounded-md border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-2 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : groupQuiz ? (
            <div className="px-4 py-3 space-y-4">
              {/* Summary strip */}
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-[#333333] rounded-md border border-gray-200 dark:border-[#333333]">
                <StatCell
                  icon={<Users size={12} className="text-gray-400" />}
                  label="Completed"
                  value={`${groupQuiz.completed_participants_count} / ${groupQuiz.participant_count}`}
                />
                <StatCell
                  icon={<Award size={12} className="text-gray-400" />}
                  label="Average score"
                  value={`${avgScore}%`}
                />
                <StatCell
                  icon={<Zap size={12} className="text-gray-400" />}
                  label="Team XP"
                  value={`${groupQuiz.team_xp_awarded}`}
                />
              </div>

              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Participants</h3>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {completedParticipants.length > 0 ? 'Ranked by score' : 'Awaiting responses'}
                  </span>
                </div>

                {rankedParticipants.length === 0 ? (
                  <div className="rounded-md border border-gray-200 dark:border-[#333333] px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                    No participants yet.
                  </div>
                ) : (
                  <div className="rounded-md border border-gray-200 dark:border-[#333333] divide-y divide-gray-200 dark:divide-[#333333] overflow-hidden">
                    {rankedParticipants.map(({ participant, rank }) => (
                      <div key={participant.id} className="flex items-center gap-2.5 px-3 py-2">
                        <span className="w-4 text-right text-[11px] tabular-nums text-gray-400 flex-shrink-0">
                          {rank ?? ''}
                        </span>
                        <ParticipantAvatar username={participant.username} avatar={participant.avatar} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {participant.username}
                          </p>
                          {participant.status === 'completed' ? (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1 flex-1 max-w-[120px] rounded-full bg-gray-200 dark:bg-[#333333] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(100, Math.max(0, participant.score || 0))}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums truncate">
                                {participant.correct_answers || 0} / {participant.total_questions || 0} correct
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {participant.email}
                            </p>
                          )}
                        </div>
                        {participant.status === 'completed' ? (
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                              {participant.score || 0}%
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                              +{participant.individual_xp_awarded} XP
                              {participant.team_xp_received > 0 ? ` · +${participant.team_xp_received} team` : ''}
                            </p>
                          </div>
                        ) : (
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded capitalize flex-shrink-0 ${
                              STATUS_STYLES[participant.status] ||
                              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {participant.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-xs text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#181818]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-[#333333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default GroupQuizResultsModal;
