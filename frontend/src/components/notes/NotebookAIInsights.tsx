// frontend/src/components/notes/NotebookAIInsights.tsx
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Calendar,
  CheckCircle
} from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';

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

interface AIInsights {
  overall_summary: string;
  key_topics: string[];
  important_items: string[];
  study_recommendations: string[];
  content_gaps: string[];
  priority_distribution: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  time_analysis: {
    most_active_period: string;
    study_patterns: string[];
    recommended_schedule: string[];
  };
  related_concepts: string[];
  action_items: string[];
}

const NotebookAIInsights: React.FC<NotebookAIInsightsProps> = ({ 
  notebook, 
  notes, 
  isOpen, 
  onClose 
}) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'recommendations'>('overview');

  useEffect(() => {
    if (isOpen && notebook && notes.length > 0) {
      generateNotebookSummary();
    }
  }, [isOpen, notebook, notes]);

  // remove old generateInsights; using simplified generateNotebookSummary instead

  // --- Simplified Notebook Summary via local Ollama ---
  const stripHtml = (html: string) => (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const buildPrompt = (nb: Notebook, ns: Note[]) => {
    const header = `Summarize the following notebook into a clear, concise, well-structured overview.
Guidelines:
- Use short sections with headings and bullet points where useful.
- Preserve any lists (bullets/numbered) found in the content.
- Avoid repetition of titles and filler text.
- Output only the final summary, no preamble or meta notes.`;
    const items = ns.slice(0, 10).map((n, i) => {
      const title = (n.title || '').trim();
      const content = stripHtml(n.content || '').slice(0, 3000);
      return `Note ${i + 1}\nTitle: ${title}\nContent: ${content}`;
    }).join('\n\n');
    return `${header}\n\nNotebook: ${nb.name}\n\n${items}`;
  };

  const callBackendSummary = async (notebookId: number) => {
    const res = await axiosInstance.post(`/notes/notebook-summary/`, { notebook_id: notebookId });
    const data = res.data || {};
    const out = (data.summary || '').toString();
    if (!out.trim()) throw new Error('Empty summary');
    return out.trim();
  };

  const generateNotebookSummary = async () => {
    setIsSummarizing(true);
    setError(null);
    try {
      const summary = await callBackendSummary(notebook.id);
      setAiSummary(summary);
    } catch (e: any) {
      console.warn('AI summary unavailable:', e);
      setError(null);
      setAiSummary(generateLocalSummary(notes, notebook));
    } finally {
      setIsSummarizing(false);
    }
  };

  // Backwards-compat handler used by existing JSX button
  const generateInsights = async () => {
    await generateNotebookSummary();
  };

  const extractKeyTopics = (notes: Note[]): string[] => {
    const topics = new Set<string>();
    notes.forEach(note => {
      // Extract topics from titles and content
      const words = `${note.title} ${note.content}`.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)) {
          topics.add(word);
        }
      });
    });
    return Array.from(topics).slice(0, 10);
  };

  const extractUrgentItems = (urgencyData: any[], notes: Note[]): string[] => {
    const urgentItems: string[] = [];
    urgencyData.forEach((data, index) => {
      if (data.urgency_level === 'urgent' || data.urgency_level === 'high') {
        urgentItems.push(notes[index].title);
      }
    });
    return urgentItems;
  };

  const identifyContentGaps = (notes: Note[]): string[] => {
    const gaps: string[] = [];
    const noteTypes = notes.map(n => n.note_type);
    
    if (!noteTypes.includes('lecture')) gaps.push('Lecture notes');
    if (!noteTypes.includes('assignment')) gaps.push('Assignment details');
    if (!noteTypes.includes('exam')) gaps.push('Exam preparation');
    if (!noteTypes.includes('reading')) gaps.push('Reading summaries');
    
    return gaps;
  };

  const calculatePriorityDistribution = (urgencyData: any[]) => {
    const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };
    urgencyData.forEach(data => {
      const level = data.suggested_priority || 'medium';
      distribution[level as keyof typeof distribution]++;
    });
    return distribution;
  };

  const analyzeTimePatterns = (notes: Note[]): any => {
    const dates = notes.map(n => new Date(n.created_at));
    const hours = dates.map(d => d.getHours());
    
    // Find most active hour
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostActiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    return {
      most_active_period: `${mostActiveHour}:00`,
      study_patterns: ['Evening study sessions', 'Weekend focus time'],
      recommended_schedule: ['Morning review (9-10 AM)', 'Evening study (7-9 PM)']
    };
  };

  const extractRelatedConcepts = (notes: Note[]): string[] => {
    const concepts = new Set<string>();
    notes.forEach(note => {
      // Extract potential concepts (capitalized words)
      const matches = note.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3) concepts.add(match);
        });
      }
    });
    return Array.from(concepts).slice(0, 8);
  };

  const extractActionItems = (notes: Note[], urgencyData: any[]): string[] => {
    const actionItems: string[] = [];
    urgencyData.forEach((data, index) => {
      if (data.action_required) {
        actionItems.push(`Review: ${notes[index].title}`);
      }
    });
    return actionItems;
  };

  // Local helper functions for faster insights generation
  const generateLocalSummary = (notes: Note[], notebook: Notebook): string => {
    const totalNotes = notes.length;
    const totalContent = notes.reduce((acc, note) => acc + note.content.length, 0);
    const avgNoteLength = Math.round(totalContent / totalNotes);
    
    return `This notebook contains ${totalNotes} notes with an average length of ${avgNoteLength} characters. The content covers various topics and provides comprehensive coverage of the subject matter.`;
  };

  const extractImportantItemsLocal = (notes: Note[]): string[] => {
    return notes
      .filter(note => note.is_urgent || note.priority === 'urgent' || note.priority === 'high')
      .map(note => note.title)
      .slice(0, 5);
  };

  const generateStudyRecommendations = (notes: Note[]): string[] => {
    const recommendations = [
      'Review notes within 24 hours of creation',
      'Create flashcards for key concepts',
      'Schedule regular review sessions',
      'Group related notes together',
      'Use active recall techniques'
    ];
    
    // Add specific recommendations based on note types
    const noteTypes = notes.map(n => n.note_type);
    if (noteTypes.includes('lecture')) {
      recommendations.push('Summarize lecture notes after class');
    }
    if (noteTypes.includes('exam')) {
      recommendations.push('Create practice questions from exam notes');
    }
    
    return recommendations;
  };

  const calculatePriorityDistributionLocal = (notes: Note[]): any => {
    const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };
    notes.forEach(note => {
      const priority = note.priority || 'medium';
      distribution[priority as keyof typeof distribution]++;
    });
    return distribution;
  };

  const extractActionItemsLocal = (notes: Note[]): string[] => {
    const actionItems: string[] = [];
    
    // Check for important items
    const importantNotes = notes.filter(n => n.is_urgent || n.priority === 'urgent');
    importantNotes.forEach(note => {
      actionItems.push(`Review important note: ${note.title}`);
    });
    
    // Check for recent notes that need review
    const recentNotes = notes
      .filter(n => {
        const daysSinceCreation = (Date.now() - new Date(n.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation > 7; // Notes older than a week
      })
      .slice(0, 3);
    
    recentNotes.forEach(note => {
      actionItems.push(`Review older note: ${note.title}`);
    });
    
    return actionItems;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-indigo-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Insights for {notebook.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">Notebook summary</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>

        {/* Simplified Notebook Summary (Ollama) */}
        <div className="px-6 pt-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notebook Summary</h3>
            </div>
            {isSummarizing ? (
              <div className="flex items-center py-8 text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500 mr-3"></div>
                Generating summary…
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-sm">
                {aiSummary || generateLocalSummary(notes, notebook)}
              </div>
            )}
          </div>
        </div>

        {/* Tabs removed for simplified summary */}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Generating insights...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : insights ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Executive Summary
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {insights.overall_summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-600" />
                        Key Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.key_topics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Important Items
                      </h4>
                      <div className="space-y-2">
                        {insights.important_items.length > 0 ? (
                          insights.important_items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">No important items detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Priority Distribution
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(insights.priority_distribution).map(([priority, count]) => (
                          <div key={priority} className="flex items-center justify-between">
                            <span className="capitalize text-gray-700 dark:text-gray-300">{priority}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div
                                  className="bg-indigo-500 h-2 rounded-full"
                                  style={{ width: `${(count / notes.length) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        Time Analysis
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Most Active:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{insights.time_analysis.most_active_period}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Study Patterns:</span>
                          <ul className="mt-1 space-y-1">
                            {insights.time_analysis.study_patterns.map((pattern, index) => (
                              <li key={index} className="text-sm text-gray-700 dark:text-gray-300">• {pattern}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Content Gaps
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {insights.content_gaps.map((gap, index) => (
                        <div key={index} className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">{gap}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {activeTab === 'recommendations' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Study Recommendations
                    </h4>
                    <div className="space-y-3">
                      {insights.study_recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 dark:text-gray-300">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        Recommended Schedule
                      </h4>
                      <div className="space-y-2">
                        {insights.time_analysis.recommended_schedule.map((schedule, index) => (
                          <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                            • {schedule}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-600" />
                        Action Items
                      </h4>
                      <div className="space-y-2">
                        {insights.action_items.length > 0 ? (
                          insights.action_items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">No immediate actions required</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NotebookAIInsights;
