CREATE TABLE IF NOT EXISTS t_p94871206_vk_comment_tracker.keywords (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    hits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p94871206_vk_comment_tracker.keywords (word, active) VALUES
  ('угроза городу', true),
  ('взорвать', true),
  ('удар по', true),
  ('экстремизм', true),
  ('теракт', true),
  ('радикальный', false)
ON CONFLICT (word) DO NOTHING;

INSERT INTO t_p94871206_vk_comment_tracker.settings (key, value) VALUES
  ('tg_chat_id', NULL),
  ('tg_enabled', 'false'),
  ('min_mentions', '1')
ON CONFLICT (key) DO NOTHING;
