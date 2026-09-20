-- 1. videos: editor metadata + shares
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS edit jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shares integer NOT NULL DEFAULT 0;

-- 2. view / share counters
CREATE OR REPLACE FUNCTION public.increment_views(_video_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.videos SET views = views + 1 WHERE id = _video_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.increment_shares(_video_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.videos SET shares = shares + 1 WHERE id = _video_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_shares(uuid) TO authenticated, anon;

-- 3. sticker packs
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  creator_id uuid,
  is_official boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sticker_packs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticker_packs TO authenticated;
GRANT ALL ON public.sticker_packs TO service_role;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sticker packs are public" ON public.sticker_packs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own packs" ON public.sticker_packs FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() AND is_official = false);
CREATE POLICY "Owners and admins update packs" ON public.sticker_packs FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins delete packs" ON public.sticker_packs FOR DELETE TO authenticated USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stickers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stickers TO authenticated;
GRANT ALL ON public.stickers TO service_role;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stickers are public" ON public.stickers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pack owners add stickers" ON public.stickers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND (p.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Pack owners delete stickers" ON public.stickers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sticker_packs p WHERE p.id = pack_id AND (p.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- 4. rich media on comments + messages
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS sticker_path text,
  ADD COLUMN IF NOT EXISTS voice_path text,
  ADD COLUMN IF NOT EXISTS voice_duration integer;
ALTER TABLE public.comments ALTER COLUMN content SET DEFAULT ''::text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS sticker_path text,
  ADD COLUMN IF NOT EXISTS voice_path text,
  ADD COLUMN IF NOT EXISTS voice_duration integer;

-- 5. group chat management
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS avatar_path text;
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

UPDATE public.conversation_members m SET role = 'owner'
FROM public.conversations c WHERE c.id = m.conversation_id AND c.created_by = m.user_id AND m.role <> 'owner';

CREATE OR REPLACE FUNCTION public.is_conv_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id AND role IN ('owner','admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_conv_admin(uuid, uuid) TO authenticated;

CREATE POLICY "Owners delete conversations" ON public.conversations FOR DELETE TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Members leave" ON public.conversation_members;
CREATE POLICY "Members leave or admins remove" ON public.conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_conv_admin(conversation_id, auth.uid()));
CREATE POLICY "Admins set member roles" ON public.conversation_members FOR UPDATE TO authenticated
  USING (public.is_conv_admin(conversation_id, auth.uid())) WITH CHECK (public.is_conv_admin(conversation_id, auth.uid()));

-- 6. admin marquee banners
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  bg_color text NOT NULL DEFAULT '#e11d48',
  text_color text NOT NULL DEFAULT '#ffffff',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners are public" ON public.banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins create banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admins update banners" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete banners" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();