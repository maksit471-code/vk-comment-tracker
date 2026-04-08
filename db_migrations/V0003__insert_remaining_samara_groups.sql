UPDATE t_p94871206_vk_comment_tracker.groups SET vk_id = -1, screen_name = 'overstory163',     name = 'Overstory163 | Самара' WHERE vk_id = 0;

INSERT INTO t_p94871206_vk_comment_tracker.groups (vk_id, screen_name, name, photo_url, members_count, is_active)
VALUES
  (-2, 'chp_samara',       'ЧП Самара',              NULL, 0, TRUE),
  (-3, 'incident63',       'Инцидент Самара',         NULL, 0, TRUE),
  (-4, 'v_togliatti',      'ЧП Тольятти (v)',         NULL, 0, TRUE),
  (-5, 'chptlt',           'ЧП Тольятти',             NULL, 0, TRUE),
  (-6, 'overheard_syzran', 'Подслушано Сызрань',      NULL, 0, TRUE),
  (-7, 'tlt_chp',          'ЧП | Тольятти',           NULL, 0, TRUE),
  (-8, 'samara_online_63', 'Самара Онлайн 63',        NULL, 0, TRUE),
  (-9, 'life_samara',      'Life Самара',             NULL, 0, TRUE)
ON CONFLICT (vk_id) DO NOTHING;