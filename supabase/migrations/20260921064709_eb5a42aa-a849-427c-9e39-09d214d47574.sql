-- 1. view tracking with 1 hour cooldown
CREATE TABLE IF NOT EXISTS public.video_views (
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, viewer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own views" ON public.video_views;
CREATE POLICY "Users see own views" ON public.video_views FOR SELECT TO authenticated USING (viewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.register_view(_video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _last timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT last_viewed_at INTO _last FROM public.video_views WHERE video_id = _video_id AND viewer_id = _uid;
  IF _last IS NOT NULL AND _last > now() - interval '1 hour' THEN RETURN false; END IF;
  INSERT INTO public.video_views (video_id, viewer_id, last_viewed_at)
  VALUES (_video_id, _uid, now())
  ON CONFLICT (video_id, viewer_id) DO UPDATE SET last_viewed_at = now();
  UPDATE public.videos SET views = views + 1 WHERE id = _video_id;
  RETURN true;
END;
$$;

-- 2. admin stealth boosts
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boost_likes integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.admin_boost(_video_id uuid, _likes integer, _views integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  UPDATE public.videos
     SET boost_likes = GREATEST(0, boost_likes + COALESCE(_likes, 0)),
         views = GREATEST(0, views + COALESCE(_views, 0))
   WHERE id = _video_id;
END;
$$;

-- 3. reposts
CREATE TABLE IF NOT EXISTS public.reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT ON public.reposts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reposts TO authenticated;
GRANT ALL ON public.reposts TO service_role;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reposts are public" ON public.reposts;
CREATE POLICY "Reposts are public" ON public.reposts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Users repost" ON public.reposts;
CREATE POLICY "Users repost" ON public.reposts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));
DROP POLICY IF EXISTS "Users edit own reposts" ON public.reposts;
CREATE POLICY "Users edit own reposts" ON public.reposts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users remove own reposts" ON public.reposts;
CREATE POLICY "Users remove own reposts" ON public.reposts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. media bucket access for attachments (images, stickers, voice notes)
DROP POLICY IF EXISTS "Media readable by signed in users" ON storage.objects;
CREATE POLICY "Media readable by signed in users" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Users upload own media" ON storage.objects;
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users delete own media" ON storage.objects;
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);