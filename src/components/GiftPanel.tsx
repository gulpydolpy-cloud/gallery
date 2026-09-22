import { useState } from "react";
import { Gift as GiftIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useGiftTypes, sendGift, type GiftType } from "@/lib/gifts";

const GIFT_STYLE: Record<string, { emoji: string; glow: string }> = {
  rose_burst: { emoji: "🌹", glow: "text-rose" },
  diamond_sparkle: { emoji: "💎", glow: "text-cyan-400" },
  bonnie_blue_special: { emoji: "💙", glow: "text-blue-400" },
  galaxy_explosion: { emoji: "🌌", glow: "text-purple-400" },
};

export function GiftPanel({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const { user } = useAuth();
  const { data: gifts = [] } = useGiftTypes();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ key: string; id: number } | null>(null);

  const send = async (gift: GiftType) => {
    if (!user) return toast.error("Log in to send gifts");
    setSending(gift.id);
    try {
      const result = await sendGift(gift.id, recipientId);
      setBurst({ key: result.animation_key, id: Date.now() });
      toast.success(`Sent ${gift.name}! ${recipientName} just got G$${gift.g_dollar_value}.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <GiftIcon /> Send Gift
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send a gift to {recipientName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gifts.map((gift) => {
              const style = GIFT_STYLE[gift.animation_key] ?? { emoji: "🎁", glow: "text-foreground" };
              return (
                <button
                  key={gift.id}
                  onClick={() => send(gift)}
                  disabled={sending === gift.id}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 text-center transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {gift.icon_url ? (
                    <img src={gift.icon_url} alt={gift.name} className="size-12 rounded-lg object-cover" />
                  ) : (
                    <span className={`text-4xl ${style.glow}`}>{style.emoji}</span>
                  )}
                  <span className="text-sm font-semibold">{gift.name}</span>
                  <span className="text-xs text-muted-foreground">G$ {gift.g_dollar_value}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {burst && (
        <div key={burst.id} className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center">
          <span className="animate-gift-burst text-6xl" onAnimationEnd={() => setBurst(null)}>
            {GIFT_STYLE[burst.key]?.emoji ?? "🎁"}
          </span>
        </div>
      )}
    </>
  );
}
