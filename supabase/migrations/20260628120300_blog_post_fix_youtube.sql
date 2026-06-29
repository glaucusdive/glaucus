-- Replace placeholder YouTube URL with PADI official Open Water intro video.
UPDATE blog_posts
SET body_markdown = REPLACE(
      body_markdown,
      'https://www.youtube.com/watch?v=9S9-Shipj7k',
      'https://www.youtube.com/watch?v=KvZT3etZIsw'
    ),
    updated_at = NOW()
WHERE slug = 'choosing-right-dive-course'
  AND body_markdown LIKE '%9S9-Shipj7k%';
