CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.tg_groups (
    id SERIAL PRIMARY KEY,
    tg_id BIGINT UNIQUE,
    username VARCHAR(255),
    title VARCHAR(500),
    photo_url TEXT,
    members_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.tg_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES t_p94871206_vk_comment_tracker.tg_groups(id),
    tg_message_id BIGINT,
    author_id BIGINT,
    author_name VARCHAR(500),
    author_username VARCHAR(255),
    text TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    sentiment VARCHAR(20) DEFAULT 'neutral',
    UNIQUE(group_id, tg_message_id)
);