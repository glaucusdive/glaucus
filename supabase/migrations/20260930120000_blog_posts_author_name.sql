-- Per-post blog author (admin CMS); site job title remains in shared/blogSiteIdentity.ts.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Shashwat Rajvaidya';

UPDATE blog_posts
SET author_name = 'Shashwat Rajvaidya'
WHERE author_name IS DISTINCT FROM 'Shashwat Rajvaidya';

COMMENT ON COLUMN blog_posts.author_name IS 'Display name for post byline and BlogPosting JSON-LD Person author.';
