-- User reviews for dive shops; author_display_name snapshot from profiles (RLS-safe for public reads).

CREATE TABLE IF NOT EXISTS shop_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    body TEXT NOT NULL DEFAULT '',
    author_display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, diveshop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_reviews_diveshop_id_created_at ON shop_reviews (diveshop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_diveshop_id_rating ON shop_reviews (diveshop_id, rating DESC, created_at DESC);

DROP TRIGGER IF EXISTS update_shop_reviews_updated_at ON shop_reviews;
CREATE TRIGGER update_shop_reviews_updated_at
    BEFORE UPDATE ON shop_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set display name from profiles (bypasses RLS on profiles for this column only)
CREATE OR REPLACE FUNCTION public.set_shop_review_author_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Diver') INTO NEW.author_display_name
    FROM public.profiles
    WHERE id = NEW.user_id;
    IF NEW.author_display_name IS NULL THEN
        NEW.author_display_name := 'Diver';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shop_reviews_set_author ON shop_reviews;
CREATE TRIGGER trg_shop_reviews_set_author
    BEFORE INSERT OR UPDATE OF user_id ON shop_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.set_shop_review_author_display_name();

COMMENT ON TABLE shop_reviews IS 'Per-user reviews of dive shops; one row per (user_id, diveshop_id).';

ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Users insert own shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Users update own shop reviews" ON shop_reviews;
DROP POLICY IF EXISTS "Users delete own shop reviews" ON shop_reviews;

CREATE POLICY "Anyone can read shop reviews" ON shop_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users insert own shop reviews" ON shop_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shop reviews" ON shop_reviews
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shop reviews" ON shop_reviews
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
