import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Radio, Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { createChannel, uploadChannelAvatar, useChannelDirectory } from "@/lib/channels";
import { useSignedUrl } from "@/lib/media";

export const Route = createFileRoute("/channels")({
  head: () => ({
    meta: [
      { title: "Channels — Gallery" },
      { name: "description", content: "Browse and follow broadcast channels on Gallery." },
    ],
  }),
  component: ChannelsPage,
});

function ChannelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: channels = [], isLoading } = useChannelDirectory(q);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Channels</h1>
        <Button variant="rose" onClick={() => (user ? setCreateOpen(true) : navigate({ to: "/auth" }))}>
          <Plus className="size-4" /> Create a channel
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search channels" className="pl-9" />
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : channels.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No channels yet. Be the first to create one!</p>
      ) : (
        <div className="space-y-1">
          {channels.map((c) => (
            <ChannelRow key={c.id} channel={c} />
          ))}
        </div>
      )}

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ChannelRow({ channel }: { channel: { id: string; name: string; description: string; avatar_path: string | null; is_active: boolean; followerCount: number } }) {
  const { data: avatarUrl } = useSignedUrl("avatars", channel.avatar_path);
  return (
    <Link to="/channels/$id" params={{ id: channel.id }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose/15 text-rose"><Radio className="size-5" /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {channel.name}
          {!channel.is_active && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(deactivated)</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">{channel.description || "No description"}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground"><Users className="size-3.5" /> {channel.followerCount}</span>
    </Link>
  );
}

function CreateChannelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const avatarPath = file ? await uploadChannelAvatar(user.id, file) : null;
      const id = await createChannel(user.id, name, description, avatarPath);
      onOpenChange(false);
      setName("");
      setDescription("");
      setFile(null);
      navigate({ to: "/channels/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Create a channel</DialogTitle></DialogHeader>
        <label className="mx-auto flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-secondary text-xs text-muted-foreground">
          {file ? <img src={URL.createObjectURL(file)} alt="" className="size-16 object-cover" /> : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Channel name" maxLength={60} />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" maxLength={300} />
        <Button variant="rose" className="w-full" disabled={busy || !name.trim()} onClick={create}>
          {busy ? "Creating…" : "Create channel"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
