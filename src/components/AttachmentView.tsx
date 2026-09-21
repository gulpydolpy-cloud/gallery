import { StickerImage } from "@/components/StickerPicker";
import { VoiceNote } from "@/components/VoiceNote";
import { useSignedUrl } from "@/lib/media";

type Props = {
  image_path?: string | null;
  sticker_path?: string | null;
  voice_path?: string | null;
  voice_duration?: number | null;
  mine?: boolean;
};

function Photo({ path }: { path: string }) {
  const { data: src } = useSignedUrl("media", path);
  if (!src) return <div className="h-40 w-40 animate-pulse rounded-xl bg-muted" />;
  return <img src={src} alt="Attachment" className="max-h-56 w-40 rounded-xl object-cover" />;
}

/** Renders photo / sticker / voice attachments on a comment or message. */
export function AttachmentView({ image_path, sticker_path, voice_path, voice_duration, mine }: Props) {
  if (!image_path && !sticker_path && !voice_path) return null;
  return (
    <div className="mt-1 space-y-1">
      {image_path && <Photo path={image_path} />}
      {sticker_path && <div className="w-28"><StickerImage path={sticker_path} /></div>}
      {voice_path && <VoiceNote path={voice_path} duration={voice_duration} mine={mine} />}
    </div>
  );
}
