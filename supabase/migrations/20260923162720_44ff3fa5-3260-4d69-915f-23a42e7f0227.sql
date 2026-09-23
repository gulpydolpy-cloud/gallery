WITH ranked_live_sessions AS (
  SELECT id,
         row_number() OVER (PARTITION BY host_id ORDER BY started_at DESC, id DESC) AS position
  FROM public.live_sessions
  WHERE status = 'live'
)
UPDATE public.live_sessions AS live
SET status = 'ended', ended_at = COALESCE(live.ended_at, now())
FROM ranked_live_sessions AS ranked
WHERE live.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_one_active_per_host
ON public.live_sessions (host_id)
WHERE status = 'live';

CREATE OR REPLACE FUNCTION public.start_live(_title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF public.is_banned(_uid) THEN RAISE EXCEPTION 'Your account is suspended'; END IF;

  SELECT id INTO _id
  FROM public.live_sessions
  WHERE host_id = _uid AND status = 'live'
  ORDER BY started_at DESC
  LIMIT 1;

  IF _id IS NOT NULL THEN RETURN _id; END IF;

  BEGIN
    INSERT INTO public.live_sessions (host_id, title)
    VALUES (_uid, COALESCE(NULLIF(trim(_title), ''), 'Live'))
    RETURNING id INTO _id;

    INSERT INTO public.live_participants (session_id, user_id, role, slot)
    VALUES (_id, _uid, 'host', 0);
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO _id
    FROM public.live_sessions
    WHERE host_id = _uid AND status = 'live'
    ORDER BY started_at DESC
    LIMIT 1;
  END;

  RETURN _id;
END;
$function$;