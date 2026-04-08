INSERT INTO t_p94871206_vk_comment_tracker.groups (vk_id, screen_name, name, photo_url, members_count, is_active)
VALUES
  (0, 'overstory163',     'Overstory163 | Самара',           NULL, 0, TRUE),
  (0, 'chp_samara',       'ЧП Самара',                       NULL, 0, TRUE),
  (0, 'incident63',       'Инцидент Самара',                  NULL, 0, TRUE),
  (0, 'v_togliatti',      'Вторник в Тольятти',              NULL, 0, TRUE),
  (0, 'chptlt',           'ЧП Тольятти',                     NULL, 0, TRUE),
  (0, 'overheard_syzran', 'Подслушано Сызрань',              NULL, 0, TRUE),
  (0, 'tlt_chp',          'ЧП | Тольятти',                   NULL, 0, TRUE),
  (0, 'samara_online_63', 'Самара Онлайн 63',                NULL, 0, TRUE),
  (0, 'life_samara',      'Life Самара',                     NULL, 0, TRUE)
ON CONFLICT (vk_id) DO NOTHING;