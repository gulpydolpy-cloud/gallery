INSERT INTO public.sticker_packs (id, name, creator_id, is_official)
VALUES ('11111111-1111-4111-8111-111111111111', 'first pack EVER!!11!!', 'b8584feb-0000-0000-0000-000000000000', true)
ON CONFLICT (id) DO NOTHING;

UPDATE public.sticker_packs SET creator_id = NULL WHERE id = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.stickers (pack_id, storage_path, sort) VALUES
  ('11111111-1111-4111-8111-111111111111', 'packs/first-pack/s1.png', 1),
  ('11111111-1111-4111-8111-111111111111', 'packs/first-pack/s2.png', 2),
  ('11111111-1111-4111-8111-111111111111', 'packs/first-pack/s3.png', 3),
  ('11111111-1111-4111-8111-111111111111', 'packs/first-pack/s4.png', 4),
  ('11111111-1111-4111-8111-111111111111', 'packs/first-pack/s5.png', 5);