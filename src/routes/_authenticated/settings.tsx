import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Edit profile — Gallery" },
      { name: "description", content: "Update your Gallery name, photo and bio." },
      { property: "og:title", content: "Edit profile — Gallery" },
      { property: "og:description", content: "Update your Gallery name, photo and bio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  if (!profile || !user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() || profile.username, bio: bio.trim() }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
    navigate({ to: "/u/$username", params: { username: profile.username } });
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    await refreshProfile();
    toast.success("Photo updated");
  };

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-6 text-2xl font-extrabold">Edit profile</h1>
      <form onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-4">
          <UserAvatar profile={profile} size="lg" />
          <Label className="cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold hover:bg-accent">
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </Label>
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={`@${profile.username}`} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} />
        </div>
        <Button type="submit" variant="rose" disabled={busy}>Save</Button>
      </form>
    </div>
  );
}
