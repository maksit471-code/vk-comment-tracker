CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES t_p94871206_vk_comment_tracker.groups(id),
    vk_post_id BIGINT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    author_id BIGINT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, vk_post_id)
);