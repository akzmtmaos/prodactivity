import { supabase } from './supabase';

export interface Review {
  id: number;
  name: string;
  rating: number;
  content: string;
  avatar: string;
  created_at: string;
  is_approved: boolean;
}

export interface NewReview {
  name: string;
  rating: number;
  content: string;
  avatar?: string;
}

export const reviewsService = {
  // Fetch all approved reviews
  async getReviews(): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getReviews:', error);
      throw error;
    }
  },

  // Submit a new review
  async submitReview(review: NewReview): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          name: review.name || 'Anonymous',
          rating: review.rating,
          content: review.content,
          avatar: review.avatar || '👤',
          is_approved: true // Auto-approve for now
        }])
        .select()
        .single();

      if (error) {
        console.error('Error submitting review:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in submitReview:', error);
      throw error;
    }
  }
};
