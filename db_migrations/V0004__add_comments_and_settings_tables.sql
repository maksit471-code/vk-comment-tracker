CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.comments (
    id SERIAL PRIMARY KEY,
    group_id INTEGER,
    vk_post_id BIGINT NOT NULL,
    vk_comment_id BIGINT NOT NULL UNIQUE,
    author_id BIGINT,
    author_name TEXT,
    author_photo TEXT,
    text TEXT NOT NULL,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    sentiment TEXT DEFAULT 'neutral'
);

CREATE INDEX IF NOT EXISTS idx_comments_group_id ON t_p94871206_vk_comment_tracker.comments(group_id);
CREATE INDEX IF NOT EXISTS idx_comments_fetched_at ON t_p94871206_vk_comment_tracker.comments(fetched_at DESC);

CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT
);
