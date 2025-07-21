import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudySession from '../components/decks/StudySession';

interface FlashcardData {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Deck {
  id: string;
  title: string;
  flashcards: FlashcardData[];
}

const StudySessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

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
          flashcards: (data.flashcards || []).map((fc: any) => ({
            id: fc.id.toString(),
            front: fc.front,
            back: fc.back,
            difficulty: fc.difficulty
          }))
        });
      } catch (error) {
        setDeck(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDeck();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500">Deck not found.</div>
      </div>
    );
  }

  return (
    <StudySession
      deckTitle={deck.title}
      flashcards={deck.flashcards}
      onClose={() => navigate('/decks')}
      onComplete={() => {}}
    />
  );
};

export default StudySessionPage; 