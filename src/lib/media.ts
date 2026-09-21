import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ONE_DAY = 60 * 60 * 24;

export type Bucket = "videos" | "avatars" | "media";

export async function signedUrl(bucket: Bucket, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ONE_DAY);
  return data?.signedUrl ?? null;
}

export function useSignedUrl(bucket: Bucket, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", bucket, path],
    queryFn: () => signedUrl(bucket, path),
    enabled: Boolean(path),
    staleTime: ONE_DAY * 1000 * 0.9,
  });
}

export function parseHashtags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, "").toLowerCase())
        .filter((t) => t.length > 0 && /^[\p{L}\p{N}_]+$/u.test(t)),
    ),
  ).slice(0, 20);
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}
