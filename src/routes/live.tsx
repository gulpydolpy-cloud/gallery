import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LiveRoomView } from "@/components/LiveRoomView";
import { useAuth } from "@/lib/auth";
import { startLive, useLiveSessions } from "@/lib/live";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live on Gallery" },
      { name: "description", content: "Watch creators and guests broadcasting live on Gallery." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useLiveSessions();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const myLive = user ? sessions.find((s) => s.host_id === user.id) : undefined;

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-index]"));
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset["index"]));
      },
      { root, threshold: [0.6] }
    );
    items.forEach((i) => obs.observe(i));
    return () => obs.disconnect();
  }, [sessions.length]);

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
    <div className="fixed inset-0 z-30 bg-video-bg">
      <div className="absolute bottom-40 right-3 z-40">
        <Button
          variant="rose"
          size="sm"
          onClick={() => {
            if (!user) return navigate({ to: "/auth" });
            if (myLive) return navigate({ to: "/live/$id", params: { id: myLive.id } });
            setOpen(true);
          }}
        >
          <Radio className="size-4" /> {myLive ? "Return to Live" : "Go Live"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-on-video/60">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-on-video">
          <p className="text-lg font-semibold">No one is live right now</p>
          <p className="text-sm text-on-video/60">Be the first to go live.</p>
        </div>
      ) : (
        <div ref={container} className="snap-feed h-full overflow-y-auto">
          {sessions.map((s, i) => (
            <div key={s.id} data-index={i} className="snap-item h-full">
              <LiveRoomView sessionId={s.id} active={i === active} />
            </div>
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
