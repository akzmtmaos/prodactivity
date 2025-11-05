-- Create reviews table for landing page testimonials
CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT true
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(is_approved);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to approved reviews
CREATE POLICY "Allow public read access to approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true);

-- Create policy to allow public insert access for new reviews
CREATE POLICY "Allow public insert access for new reviews" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.reviews TO anon;
GRANT INSERT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
GRANT INSERT ON public.reviews TO authenticated;

-- Insert some sample reviews
INSERT INTO public.reviews (name, rating, content, avatar) VALUES
('Alex Johnson', 5, 'This platform has completely transformed how I organize my studies. The AI features are incredible!', '👨‍💻'),
('Maria Garcia', 4, 'Love the flashcard system and progress tracking. It''s helped me improve my grades significantly.', '👩‍🎓'),
('David Kim', 5, 'The productivity analytics have given me insights into my work patterns I never had before. Game changer!', '👨‍💼'),
('Emily Watson', 4, 'I use the flashcard decks to create vocabulary lessons for my students. The spaced repetition algorithm is perfect!', '👩‍🏫');
