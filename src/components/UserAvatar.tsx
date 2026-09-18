import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type P = { username: string; display_name?: string | null; avatar_path?: string | null };

export function UserAvatar({ profile, size = "md", className }: { profile: P; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const { data: url } = useSignedUrl("avatars", profile.avatar_path);
  const sz = { xs: "size-7 text-xs", sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-16 text-xl", xl: "size-28 text-4xl" }[size];
  return (
    <Avatar className={cn(sz, className)}>
      {url && <AvatarImage src={url} alt={profile.username} className="object-cover" />}
      <AvatarFallback className="bg-rose/15 font-bold text-rose">
        {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
