import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import CreateDeckModal from '../components/decks/CreateDeckModal';
import ManageFlashcards from '../components/decks/ManageFlashcardModal';
import DeleteConfirmationModal from '../components/decks/DeleteConfirmationModal';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: 'easy' | 'medium' | 'hard';
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
}

// Mock data for demonstration
const mockDecks: Deck[] = [
  {
    id: '1',
    title: 'Spanish Vocabulary',
    subdecks: [
      { id: '1-1', title: 'Greetings', flashcards: [] },
      { id: '1-2', title: 'Food', flashcards: [] }
    ],
    flashcards: [
      { id: 'f1', question: 'Hello', answer: 'Hola', difficulty: 'easy' },
      { id: 'f2', question: 'Goodbye', answer: 'Adiós', difficulty: 'medium' }
    ]
  },
  {
    id: '2',
    title: 'JavaScript Concepts',
    subdecks: [],
    flashcards: [
      { id: 'f3', question: 'What is a closure?', answer: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.', difficulty: 'hard' }
    ]
  }
];

const DeckDetails: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const [showCreateSubdeck, setShowCreateSubdeck] = useState(false);
  const [showAddFlashcard, setShowAddFlashcard] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubdeck, setSelectedSubdeck] = useState<Subdeck | null>(null);
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null);

  // Find the deck by ID (mock)
  const deck = mockDecks.find(d => d.id === deckId);

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

  const handleCreateSubdeck = (deckData: { title: string }) => {
    // Mock implementation - in real app, this would make an API call
    console.log('Creating subdeck:', deckData);
    setShowCreateSubdeck(false);
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

  return (
    <PageLayout>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6">
            <button onClick={() => navigate('/decks')} className="text-indigo-600 hover:underline flex items-center mr-2">
              Decks
            </button>
            <span className="mx-2 text-gray-400">&gt;</span>
            <span className="text-gray-900 dark:text-white font-semibold">{deck.title}</span>
          </div>

          {/* Subdecks Section */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deck.subdecks.length === 0 ? (
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
                deck.subdecks.map(subdeck => (
                  <div key={subdeck.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{subdeck.title}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSubdeck(subdeck);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span>{subdeck.flashcards.length} flashcards</span>
                      <ChevronRight size={16} className="ml-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Flashcards Section */}
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

      {showAddFlashcard && (
        <ManageFlashcards
          deckTitle={deck.title}
          flashcards={deck.flashcards}
          onClose={() => {
            setShowAddFlashcard(false);
            setSelectedFlashcard(null);
          }}
          onAddFlashcard={handleAddFlashcard}
          onUpdateFlashcard={() => {}}
          onDeleteFlashcard={() => {}}
        />
      )}

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
    </PageLayout>
  );
};

export default DeckDetails; 