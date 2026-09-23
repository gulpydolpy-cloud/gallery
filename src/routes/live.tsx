import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Radio, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/lib/auth";
import { startLive, useLiveSessions } from "@/lib/live";

export const Route = createFileRoute("/live")({
  component: LivePage,
});

function LivePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useLiveSessions();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);

  const goLive = async () => {
    if (!user) return navigate({ to: "/auth" });
    setStarting(true);
    try {
      const id = await startLive(title.trim() || "Live");
      setOpen(false);
      navigate({ to: "/live/$id", params: { id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Live</h1>
        <Button variant="rose" onClick={() => (user ? setOpen(true) : navigate({ to: "/auth" }))}>
          <Radio /> Go Live
        </Button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No one is live right now. Be the first!</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sessions.map((s) => (
            <Link key={s.id} to="/live/$id" params={{ id: s.id }} className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-video-bg">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-black/20 to-black/60">
                {s.host && <UserAvatar profile={s.host} size="lg" />}
                <p className="px-2 text-center text-sm font-semibold text-white">{s.host?.display_name ?? s.host?.username}</p>
              </div>
              <span className="absolute top-2 left-2 rounded-full bg-rose px-2 py-0.5 text-[10px] font-bold text-rose-foreground">LIVE</span>
              <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
                <Users className="size-3" /> {s.participantCount}
              </span>
              <p className="absolute bottom-2 left-2 right-2 truncate text-xs text-white/90">{s.title}</p>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Start a live broadcast</DialogTitle>
          </DialogHeader>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your live a title" maxLength={80} />
          <Button variant="rose" className="w-full" disabled={starting} onClick={goLive}>
            {starting ? "Starting…" : "Go Live"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
