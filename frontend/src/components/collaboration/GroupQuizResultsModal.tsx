import React, { useState, useEffect } from 'react';
import { X, Trophy, Users, Award, CheckCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import Toast from '../common/Toast';

interface Participant {
  id: string;
  user_id: number;
  username: string;
  email: string;
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

  const completedParticipants = groupQuiz?.participants.filter(p => p.status === 'completed') || [];
  const avgScore = completedParticipants.length > 0
    ? Math.round(completedParticipants.reduce((sum, p) => sum + (p.score || 0), 0) / completedParticipants.length)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Group Quiz Results
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : groupQuiz ? (
            <div className="space-y-6">
              {/* Quiz Info */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{groupQuiz.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Deck: {groupQuiz.deck_title}</p>
                {groupQuiz.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{groupQuiz.description}</p>
                )}
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Participants</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {groupQuiz.completed_participants_count} / {groupQuiz.participant_count}
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{avgScore}%</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Team XP</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {groupQuiz.team_xp_awarded}
                  </p>
                </div>
              </div>

              {/* Participants List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Participant Results
                </h3>
                <div className="space-y-3">
                  {groupQuiz.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                              {participant.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {participant.username}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {participant.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          {participant.status === 'completed' ? (
                            <>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                  {participant.score || 0}%
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {participant.correct_answers || 0} / {participant.total_questions || 0}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  Individual XP: {participant.individual_xp_awarded}
                                </p>
                                {participant.team_xp_received > 0 && (
                                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    Team XP: +{participant.team_xp_received}
                                  </p>
                                )}
                              </div>
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {participant.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
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
