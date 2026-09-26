import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Radio, Settings, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AttachmentView } from "@/components/AttachmentView";
import { MediaComposer } from "@/components/MediaComposer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useSignedUrl } from "@/lib/media";
import { checkAchievements } from "@/lib/achievements";
import {
  useChannel,
  useChannelPosts,
  useChannelReactions,
  useIsFollowingChannel,
  useChannelFollowerCount,
  followChannel,
  unfollowChannel,
  postToChannel,
  deleteChannelPost,
  toggleReaction,
  updateChannel,
  uploadChannelAvatar,
  type Channel,
} from "@/lib/channels";

export const Route = createFileRoute("/channels/$id")({
  component: ChannelPage,
});

const QUICK_EMOJI = ["❤️", "🔥", "😂", "👍", "😮"];

function ChannelPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: channel } = useChannel(id);
  const { data: posts = [] } = useChannelPosts(id);
  const { data: reactions = [] } = useChannelReactions(id);
  const { data: following = false } = useIsFollowingChannel(id, user?.id);
  const { data: followerCount = 0 } = useChannelFollowerCount(id);
  const { data: avatarUrl } = useSignedUrl("avatars", channel?.avatar_path ?? null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const isOwner = Boolean(user && channel && channel.owner_id === user.id);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts.length]);

  if (!channel) return <div className="p-10 text-center text-muted-foreground">Loading channel…</div>;

  const toggleFollow = async () => {
    if (!user) return navigate({ to: "/auth" });
    try {
      if (following) await unfollowChannel(id, user.id);
      else {
        await followChannel(id, user.id);
        void checkAchievements(user.id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const react = async (postId: string, emoji: string) => {
    if (!user) return navigate({ to: "/auth" });
    const mine = reactions.some((r) => r.post_id === postId && r.user_id === user.id && r.emoji === emoji);
    await toggleReaction(postId, user.id, emoji, mine);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col md:h-screen">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate({ to: "/channels" })}><ArrowLeft /></Button>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-rose/15 text-rose"><Radio className="size-4" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {channel.name}
            {!channel.is_active && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(deactivated)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground"><Users className="mr-1 inline size-3" />{followerCount} followers</p>
        </div>
        {isOwner ? (
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Channel settings"><Settings className="size-4" /></Button>
        ) : (
          <Button variant={following ? "outline" : "rose"} size="sm" onClick={toggleFollow}>{following ? "Following" : "Follow"}</Button>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {channel.description && <p className="mx-auto max-w-sm text-center text-sm text-muted-foreground">{channel.description}</p>}
        {posts.length === 0 && <p className="py-10 text-center text-muted-foreground">No posts yet.</p>}
        {posts.map((p) => {
          const postReactions = reactions.filter((r) => r.post_id === p.id);
          const counts = new Map<string, number>();
          for (const r of postReactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
          return (
            <div key={p.id} className="mx-auto max-w-md space-y-1.5">
              <div className="space-y-1 rounded-2xl bg-secondary px-4 py-3 text-center">
                {p.content && <p className="text-sm break-words">{p.content}</p>}
                <div className="flex justify-center">
                  <AttachmentView image_path={p.image_path} sticker_path={p.sticker_path} voice_path={p.voice_path} voice_duration={p.voice_duration} mine={false} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {QUICK_EMOJI.map((e) => {
                  const count = counts.get(e) ?? 0;
                  const mine = Boolean(user && postReactions.some((r) => r.user_id === user.id && r.emoji === e));
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => react(p.id, e)}
                      className={`rounded-full border px-2 py-0.5 text-xs ${mine ? "border-rose bg-rose/10" : "border-border"}`}
                    >
                      {e} {count > 0 && count}
                    </button>
                  );
                })}
                {isOwner && (
                  <button type="button" onClick={() => deleteChannelPost(p.id)} className="text-xs text-muted-foreground underline">
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {isOwner && channel.is_active && user && (
        <div className="border-t p-3">
          <MediaComposer
            userId={user.id}
            placeholder="Post to your channel…"
            onSend={async (content, attachment) => {
              await postToChannel(id, user.id, content, attachment);
            }}
          />
        </div>
      )}
      {isOwner && !channel.is_active && (
        <p className="border-t p-3 text-center text-sm text-muted-foreground">This channel is deactivated. Reactivate it in settings to post again.</p>
      )}

      {isOwner && <ChannelSettingsDialog channel={channel} open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </div>
  );
}

function ChannelSettingsDialog({ channel, open, onOpenChange }: { channel: Channel; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: avatarUrl } = useSignedUrl("avatars", channel.avatar_path);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const avatarPath = file ? await uploadChannelAvatar(user.id, file) : undefined;
      await updateChannel(channel.id, { name: name.trim(), description: description.trim(), ...(avatarPath ? { avatar_path: avatarPath } : {}) });
      toast.success("Channel updated");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    try {
      await updateChannel(channel.id, { is_active: !channel.is_active });
      toast.success(channel.is_active ? "Channel deactivated" : "Channel reactivated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Channel settings</DialogTitle></DialogHeader>
        <label className="mx-auto flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-secondary text-xs text-muted-foreground">
          {file ? (
            <img src={URL.createObjectURL(file)} alt="" className="size-16 object-cover" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-16 object-cover" />
          ) : (
            "Add photo"
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" maxLength={60} />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" maxLength={300} />
        <Button variant="rose" className="w-full" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="outline" className="w-full" onClick={toggleActive}>
          {channel.is_active ? "Deactivate channel" : "Reactivate channel"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
