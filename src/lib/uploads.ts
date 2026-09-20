import { supabase } from "@/integrations/supabase/client";

/** Upload a file to the private "media" bucket and return its storage path. */
export async function uploadToMedia(userId: string, file: Blob, folder: string, ext: string): Promise<string> {
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function extFor(file: Blob, fallback: string) {
  const name = (file as File).name;
  const fromName = name?.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName && fromName.length <= 5) return fromName;
  const type = file.type || "";
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("mpeg")) return "mp3";
  if (type.includes("png")) return "png";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("gif")) return "gif";
  return fallback;
}

/** Download a video (or any media) to the user's device. */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}
