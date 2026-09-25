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
import { checkAchievements } from "@/lib/achievements";

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

  const goLiveClick = () => {
    if (!user) return navigate({ to: "/auth" });
    if (myLive) return navigate({ to: "/live/$id", params: { id: myLive.id } });
    setOpen(true);
  };

  const goLive = async () => {
    if (!user) return navigate({ to: "/auth" });
    setStarting(true);
    try {
            const id = await startLive(title.trim() || "Live");
      setOpen(false);
      void checkAchievements(user.id);
      navigate({ to: "/live/$id", params: { id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const goLiveButton = (
    <Button variant="rose" size="sm" className="h-7 px-2 text-xs" onClick={goLiveClick}>
      <Radio className="size-3.5" /> {myLive ? "Return" : "Go Live"}
    </Button>
  );

  return (
    <div className="relative h-[calc(100dvh-7rem)] min-h-[560px] w-full bg-video-bg md:h-screen md:min-h-0">
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-on-video/60">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-on-video">
          <p className="text-lg font-semibold">No one is live right now</p>
          <p className="text-sm text-on-video/60">Be the first to go live.</p>
          <Button variant="rose" onClick={goLiveClick}><Radio className="size-4" /> Go Live</Button>
        </div>
      ) : (
        <div ref={container} className="snap-feed h-full overflow-y-auto">
          {sessions.map((s, i) => (
            <div key={s.id} data-index={i} className="snap-item h-full">
              <LiveRoomView sessionId={s.id} active={i === active} headerExtra={goLiveButton} />
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
