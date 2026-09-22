import { ImagePlus, Mic, Send, Smile, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StickerImage, StickerPicker } from "@/components/StickerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { extFor, uploadToMedia } from "@/lib/uploads";
import { useSignedUrl } from "@/lib/media";
import { formatTime } from "@/lib/edit";

export type Attachment = {
  image_path?: string | null;
  sticker_path?: string | null;
  voice_path?: string | null;
  voice_duration?: number | null;
};

export function MediaComposer({
  userId,
  placeholder,
  onSend,
  onSharePack,
}: {
  userId: string;
  placeholder: string;
  onSend: (text: string, attachment: Attachment) => Promise<void>;
  onSharePack?: (packId: string, packName: string) => void;
}) {

  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sticker, setSticker] = useState<string | null>(null);
  const [voice, setVoice] = useState<{ path: string; duration: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { data: imageSrc } = useSignedUrl("media", image);

  const pickImage = async (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Images must be under 10MB"); return; }
    setBusy(true);
    try {
      setImage(await uploadToMedia(userId, file, "images", extFor(file, "jpg")));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        const secs = seconds;
        setRecording(false);
        setSeconds(0);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setBusy(true);
        try {
          const path = await uploadToMedia(userId, blob, "voice", "webm");
          setVoice({ path, duration: secs });
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access was blocked");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const hasAttachment = image || sticker || voice;
    if (!text.trim() && !hasAttachment) return;
    setBusy(true);
    try {
      await onSend(text.trim(), {
        image_path: image,
        sticker_path: sticker,
        voice_path: voice?.path ?? null,
        voice_duration: voice?.duration ?? null,
      });
      setText("");
      setImage(null);
      setSticker(null);
      setVoice(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      {(image || sticker || voice) && (
        <div className="flex items-center gap-2">
          {imageSrc && <img src={imageSrc} alt="" className="size-16 rounded-lg object-cover" />}
          {sticker && <div className="size-16"><StickerImage path={sticker} /></div>}
          {voice && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Voice note · {formatTime(voice.duration)}</span>}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove attachment"
            onClick={() => {
              setImage(null);
              setSticker(null);
              setVoice(null);
            }}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Stickers"><Smile /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <StickerPicker
  userId={userId}
  onPick={(p) => setSticker(p)}
  onSharePack={onSharePack}
/>
          </PopoverContent>
        </Popover>
        <Button type="button" variant="ghost" size="icon" aria-label="Add photo" asChild>
          <label className="cursor-pointer">
            <ImagePlus />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0] ?? null)} />
          </label>
        </Button>
        {recording ? (
          <Button type="button" variant="destructive" size="icon" aria-label="Stop recording" onClick={() => recorder.current?.stop()}>
            <Square />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" aria-label="Record voice note" onClick={startRecording}>
            <Mic />
          </Button>
        )}
        {recording ? (
          <p className="flex-1 text-sm font-semibold text-destructive">Recording {formatTime(seconds)}</p>
        ) : (
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={2000} className="flex-1 rounded-full" />
        )}
        <Button type="submit" variant="rose" size="icon" aria-label="Send" disabled={busy || recording}><Send /></Button>
      </div>
    </form>
  );
}
