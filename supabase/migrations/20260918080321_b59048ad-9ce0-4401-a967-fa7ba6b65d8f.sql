-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  display_name text,
  bio text,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NULLIF(NEW.raw_user_meta_data->>'username', ''), 'User')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bans
CREATE TABLE public.bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bans TO authenticated;
GRANT ALL ON public.bans TO service_role;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bans WHERE user_id = _user_id AND (expires_at IS NULL OR expires_at > now()))
$$;

CREATE POLICY "Users see own bans, admins see all" ON public.bans FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create bans" ON public.bans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND banned_by = auth.uid());
CREATE POLICY "Admins update bans" ON public.bans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete bans" ON public.bans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Videos
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}',
  storage_path text NOT NULL,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX videos_user_idx ON public.videos (user_id);
CREATE INDEX videos_created_idx ON public.videos (created_at DESC);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Videos are public" ON public.videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users upload own videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Users update own videos" ON public.videos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners and admins delete videos" ON public.videos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_views(_video_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.videos SET views = views + 1 WHERE id = _video_id
$$;
GRANT EXECUTE ON FUNCTION public.increment_views(uuid) TO anon, authenticated;

-- Likes
CREATE TABLE public.likes (
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public" ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users like" ON public.likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unlike" ON public.likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Saves
CREATE TABLE public.saves (
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT ON public.saves TO anon;
GRANT SELECT, INSERT, DELETE ON public.saves TO authenticated;
GRANT ALL ON public.saves TO service_role;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saves are public" ON public.saves FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users save" ON public.saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unsave" ON public.saves FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_video_idx ON public.comments (video_id, created_at);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Owners, video owners and admins delete comments" ON public.comments FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = auth.uid())
);

-- Follows
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are public" ON public.follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid() AND follower_id <> following_id);
CREATE POLICY "Users unfollow" ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters and admins see reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users report" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.conversation_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conversation_id AND user_id = _user_id)
$$;

CREATE POLICY "Members see conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Users create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members update conversations" ON public.conversations FOR UPDATE TO authenticated USING (public.is_member(id, auth.uid()));

CREATE POLICY "Members see members" ON public.conversation_members FOR SELECT TO authenticated USING (public.is_member(conversation_id, auth.uid()));
CREATE POLICY "Members add members" ON public.conversation_members FOR INSERT TO authenticated WITH CHECK (
  public.is_member(conversation_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
CREATE POLICY "Members leave" ON public.conversation_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_member(conversation_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_member(conversation_id, auth.uid()) AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Senders delete messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Storage policies
CREATE POLICY "Anyone can read media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id IN ('videos', 'avatars'));
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('videos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Users update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('videos', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners and admins delete media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('videos', 'avatars') AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));