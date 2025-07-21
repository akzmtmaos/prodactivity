import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Edit2, Trash2, ChevronRight, Play, HelpCircle, ChevronLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import CreateDeckModal from '../components/decks/CreateDeckModal';
import AddFlashcardModal from '../components/decks/AddFlashcardModal';
import DeleteConfirmationModal from '../components/decks/DeleteConfirmationModal';
import StudySession from '../components/decks/StudySession';
import QuizSession from '../components/decks/QuizSession';
import DeckCard from '../components/decks/DeckCard';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  front?: string;
  back?: string;
}

interface Subdeck {
  id: string;
  title: string;
  flashcards: Flashcard[];
}

interface Deck {
  id: string;
  title: string;
  subdecks: Subdeck[];
  flashcards: Flashcard[];
  flashcardCount: number;
  progress: number;
  created_at: string;
  updated_at: string;
  parent?: { id: string; title: string } | null;
}

const DeckDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSubdeck, setShowCreateSubdeck] = useState(false);
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStudySession, setShowStudySession] = useState(false);
  const [showQuizSession, setShowQuizSession] = useState(false);
  const [selectedSubdeck, setSelectedSubdeck] = useState<Subdeck | null>(null);
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);
  const [activeTab, setActiveTab] = useState<'subdecks' | 'flashcards'>('subdecks');

  // Fetch deck data
  useEffect(() => {
    const fetchDeck = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://localhost:8000/api/decks/decks/${id}/`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        
        if (!res.ok) throw new Error('Failed to fetch deck');
        
        const data = await res.json();
        setDeck({
          id: data.id.toString(),
          title: data.title,
          flashcardCount: data.flashcard_count || 0,
          progress: data.progress || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          subdecks: data.subdecks || [],
          flashcards: (data.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          })),
          parent: data.parent ? { id: data.parent, title: data.parent_title || 'Parent Deck' } : null
        });
      } catch (error) {
        console.error('Error fetching deck:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeck();
  }, [id]);

  // Fetch subdecks from backend for up-to-date data
  const [subdecksLoading, setSubdecksLoading] = useState(false);
  const [subdecks, setSubdecks] = useState<Subdeck[]>([]);
  useEffect(() => {
    const fetchSubdecks = async () => {
      if (!id) return;
      setSubdecksLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`http://localhost:8000/api/decks/decks/?parent=${id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!res.ok) throw new Error('Failed to fetch subdecks');
        const data = await res.json();
        setSubdecks(data.map((sd: any) => ({
          id: sd.id.toString(),
          title: sd.title,
          flashcards: (sd.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          }))
        })));
      } catch (error) {
        setSubdecks([]);
      } finally {
        setSubdecksLoading(false);
      }
    };
    fetchSubdecks();
  }, [id, showCreateSubdeck]);

  // Real subdeck creation
  const handleCreateSubdeck = async (deckData: { title: string }) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:8000/api/decks/decks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ title: deckData.title, parent: id })
      });
      if (!res.ok) throw new Error('Failed to create subdeck');
      const newSubdeck = await res.json();
      setSubdecks(prev => [
        ...prev,
        {
          id: newSubdeck.id.toString(),
          title: newSubdeck.title,
          flashcards: (newSubdeck.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            question: fc.front,
            answer: fc.back,
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          }))
        }
      ]);
      setShowCreateSubdeck(false);
    } catch (error) {
      alert('Error creating subdeck.');
    }
  };

  const handleAddFlashcard = (flashcard: Omit<Flashcard, 'id'>) => {
    // Mock implementation - in real app, this would make an API call
    const newFlashcard: Flashcard = {
      ...flashcard,
      id: Date.now().toString()
    };
    console.log('Adding flashcard:', newFlashcard);
    setShowAddFlashcard(false);
  };

  const handleDeleteSubdeck = (subdeckId: string) => {
    // Mock implementation - in real app, this would make an API call
    console.log('Deleting subdeck:', subdeckId);
    setShowDeleteModal(false);
    setSelectedSubdeck(null);
  };

  const handlePractice = () => {
    if (deck) {
      setShowStudySession(true);
    }
  };

  const handleQuiz = () => {
    if (deck) {
      setShowQuizSession(true);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </PageLayout>
    );
  }

  if (!deck) {
    return (
      <PageLayout>
        <div className="p-8">
          <button onClick={() => navigate('/decks')} className="mb-4 flex items-center text-indigo-600 hover:underline">
            <ArrowLeft className="mr-2" /> Back to Decks
          </button>
          <div className="text-center text-gray-500">Deck not found.</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <button onClick={() => navigate('/decks')} className="text-indigo-600 hover:underline flex items-center mr-2">
              Decks
            </button>
            {deck.parent && (
              <>
                <span className="mx-2 text-gray-400">&gt;</span>
                <button
                  onClick={() => navigate(`/decks/${deck.parent!.id}`)}
                  className="text-indigo-600 hover:underline flex items-center mr-2"
                >
                  {deck.parent.title}
                </button>
              </>
            )}
            <span className="mx-2 text-gray-400">&gt;</span>
            <span className="text-gray-900 dark:text-white font-semibold">{deck.title}</span>
          </div>

          {/* Deck Actions */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{deck.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{deck.flashcardCount} cards</span>
                <span>•</span>
                <span>{deck.progress}% complete</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePractice}
                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                <Play size={16} className="mr-2" />
                Practice
              </button>
              <button
                onClick={handleQuiz}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <HelpCircle size={16} className="mr-2" />
                Quiz
              </button>
            </div>
          </div>

          {/* Tabs Bar */}
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('subdecks')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'subdecks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Subdecks
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px focus:outline-none ${
                activeTab === 'flashcards'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Flashcards
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'subdecks' && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subdecks</h2>
                <button 
                  onClick={() => setShowCreateSubdeck(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                  <Plus size={20} className="mr-2" />
                  Add Subdeck
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {subdecksLoading ? (
                  <div className="col-span-full text-center py-8">Loading subdecks...</div>
                ) : subdecks.length === 0 ? (
                  <div className="col-span-full text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No subdecks yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first subdeck to organize your flashcards</p>
                    <button
                      onClick={() => setShowCreateSubdeck(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Create Subdeck
                    </button>
                  </div>
                ) : (
                  subdecks.map(subdeck => (
                    <div key={subdeck.id} className="relative">
                      <DeckCard
                        deck={{
                          id: subdeck.id,
                          title: subdeck.title,
                          flashcardCount: subdeck.flashcards.length,
                          progress: 0,
                          created_at: '',
                          updated_at: '',
                          createdAt: '',
                          flashcards: subdeck.flashcards,
                          is_deleted: false,
                        }}
                        onOpen={() => navigate(`/decks/${subdeck.id}`)}
                        onDelete={() => {
                          setSelectedSubdeck(subdeck);
                          setShowDeleteModal(true);
                        }}
                        onStudy={() => {}}
                        onQuiz={() => {}}
                        onEdit={() => {}}
                        onViewStats={() => {}}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcards</h2>
                <button 
                  onClick={() => setShowAddFlashcard(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                  <Plus size={20} className="mr-2" />
                  Add Flashcard
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deck.flashcards.length === 0 ? (
                  <div className="col-span-full text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flashcards yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Add your first flashcard to start learning</p>
                    <button
                      onClick={() => setShowAddFlashcard(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Add Flashcard
                    </button>
                  </div>
                ) : (
                  deck.flashcards.map(card => (
                    <div key={card.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="mb-2 text-gray-900 dark:text-white font-medium">Q: {card.question}</div>
                          <div className="text-gray-700 dark:text-gray-300">A: {card.answer}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedFlashcard(card);
                              setShowAddFlashcard(true);
                            }}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFlashcard(card);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      {card.difficulty && (
                        <div className="mt-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            card.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateSubdeck && (
        <CreateDeckModal
          isOpen={showCreateSubdeck}
          onClose={() => setShowCreateSubdeck(false)}
          onCreateDeck={handleCreateSubdeck}
        />
      )}

      <AddFlashcardModal
        isOpen={showAddFlashcard}
        onClose={() => {
          setShowAddFlashcard(false);
          setSelectedFlashcard(null);
        }}
        onAddFlashcard={handleAddFlashcard}
      />

      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          deckTitle={selectedSubdeck?.title || selectedFlashcard?.question || ''}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedSubdeck(null);
            setSelectedFlashcard(null);
          }}
          onConfirm={() => {
            if (selectedSubdeck) {
              handleDeleteSubdeck(selectedSubdeck.id);
            } else if (selectedFlashcard) {
              // Handle flashcard deletion
              console.log('Deleting flashcard:', selectedFlashcard.id);
            }
          }}
        />
      )}

      {showStudySession && (
        <StudySession
          deckTitle={deck.title}
          flashcards={deck.flashcards.map(fc => ({
            id: fc.id,
            front: fc.front || fc.question,
            back: fc.back || fc.answer,
            difficulty: fc.difficulty
          }))}
          onClose={() => setShowStudySession(false)}
          onComplete={(results) => {
            console.log('Study session completed:', results);
            setShowStudySession(false);
          }}
        />
      )}

      {showQuizSession && deck && (
        <QuizSession
          deckId={deck.id}
          deckTitle={deck.title}
          flashcards={deck.flashcards.map(fc => ({
            id: fc.id,
            front: fc.front || fc.question,
            back: fc.back || fc.answer,
            difficulty: fc.difficulty
          }))}
          onClose={() => setShowQuizSession(false)}
          onComplete={async (results) => {
            // Refetch deck from backend for updated progress
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`http://localhost:8000/api/decks/decks/${deck.id}/`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
            });
            if (res.ok) {
              const data = await res.json();
              setDeck({
                ...deck,
                progress: data.progress || 0
              });
            }
            setShowQuizSession(false);
          }}
        />
      )}
    </PageLayout>
  );
};

export default DeckDetails; 