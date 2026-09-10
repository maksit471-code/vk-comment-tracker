CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.fetch_lock (
    id INTEGER PRIMARY KEY DEFAULT 1,
    locked_at TIMESTAMPTZ,
    CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO t_p94871206_vk_comment_tracker.fetch_lock (id, locked_at) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;