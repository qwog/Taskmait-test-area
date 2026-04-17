insert into reasons (id, direction, label, badge_emoji, badge_name_playful, badge_name_snarky, badge_name_wholesome, badge_threshold)
values
  ('lead_foot', 'down', 'Lead Foot', '🏁', 'Lead Foot', 'Lead Foot', 'Lead Foot', 10),
  ('turn_signal_allergy', 'down', 'Turn Signal Allergy', '👻', 'Ghost Turner', 'Ghost Turner', 'Ghost Turner', 10),
  ('parking_crime', 'down', 'Parking Crime', '🅿️', 'Parking Outlaw', 'Parking Outlaw', 'Parking Outlaw', 10),
  ('tailgater', 'down', 'Tailgater', '🐕', 'Tailgate Terror', 'Tailgate Terror', 'Tailgate Terror', 10),
  ('slow_fast_lane', 'down', 'Slow in the Fast Lane', '🐢', 'Fast Lane Philosopher', 'Fast Lane Philosopher', 'Fast Lane Philosopher', 10),
  ('red_light_gambler', 'down', 'Red Light Gambler', '🎰', 'Red Light Gambler', 'Red Light Gambler', 'Red Light Gambler', 10),
  ('cant_merge', 'down', 'Can\'t Merge', '🙈', 'Merge Menace', 'Merge Menace', 'Merge Menace', 10),
  ('distracted_driver', 'down', 'Distracted Driver', '📱', 'Phone Zombie', 'Phone Zombie', 'Phone Zombie', 10),
  ('road_rage_aura', 'down', 'Road Rage Aura', '🌋', 'Volcano Energy', 'Volcano Energy', 'Volcano Energy', 10),
  ('stops_in_road', 'down', 'Stops In The Road', '🛑', 'Human Speed Bump', 'Human Speed Bump', 'Human Speed Bump', 10),
  ('let_me_merge', 'up', 'Let Me Merge', '🙌', 'Mensch of the Road', 'Mensch of the Road', 'Mensch of the Road', 10),
  ('waved_me_through', 'up', 'Waved Me Through', '✨', 'Politeness Icon', 'Politeness Icon', 'Politeness Icon', 10),
  ('let_pedestrian_cross', 'up', 'Let Pedestrian Cross', '🚶', 'Crosswalk Hero', 'Crosswalk Hero', 'Crosswalk Hero', 10),
  ('great_parallel_park', 'up', 'Great Parallel Park', '🎯', 'Parking Wizard', 'Parking Wizard', 'Parking Wizard', 10),
  ('funny_bumper_sticker', 'up', 'Funny Bumper Sticker', '😂', 'Comedy on Wheels', 'Comedy on Wheels', 'Comedy on Wheels', 10),
  ('nice_car', 'up', 'Nice Car', '💎', 'Certified Clean', 'Certified Clean', 'Certified Clean', 10),
  ('used_signal', 'up', 'Actually Used Signal', '💡', 'Signal Scholar', 'Signal Scholar', 'Signal Scholar', 10),
  ('yielded_like_legend', 'up', 'Yielded Like a Legend', '👑', 'Yield Royalty', 'Yield Royalty', 'Yield Royalty', 10)
on conflict (id) do update set
  direction = excluded.direction,
  label = excluded.label,
  badge_emoji = excluded.badge_emoji,
  badge_name_playful = excluded.badge_name_playful,
  badge_name_snarky = excluded.badge_name_snarky,
  badge_name_wholesome = excluded.badge_name_wholesome,
  badge_threshold = excluded.badge_threshold;
