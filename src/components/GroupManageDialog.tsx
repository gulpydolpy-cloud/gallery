import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Shield, ShieldAlert, Trash2, LogOut, Flag, UserMinus, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { uploadToMedia, extFor } from "@/lib/uploads";
import type { ConversationSummary } from "@/lib/chat";

interface GroupManageDialogProps {
  conversation: ConversationSummary;
  currentUserId: string;
  isSiteAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupManageDialog({
  conversation,
  currentUserId,
  isSiteAdmin,
  open,
  onOpenChange,
}: GroupManageDialogProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(conversation.name || "");
  const [description, setDescription] = useState(conversation.description || "");
  const [avatarPath, setAvatarPath] = useState<string | null>(conversation.avatar_path || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reporting state
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const { data: avatarUrl } = useSignedUrl("media", avatarPath);

  const allMembers = conversation.all_members || [];
  const currentMember = allMembers.find((m) => m.id === currentUserId);
  const isOwner = conversation.created_by === currentUserId;
  const isGroupAdmin = currentMember?.role === "admin" || isOwner;
  const adminCount = allMembers.filter((m) => m.role === "admin").length;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const ext = extFor(file, "jpg");
      const path = await uploadToMedia(currentUserId, file, "group-avatars", ext);
      setAvatarPath(path);
      toast.success("Group photo uploaded!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("conversations")
        .update({
          name: name.trim() || null,
          description: description.trim(),
          avatar_path: avatarPath,
        })
        .eq("id", conversation.id);

      if (error) throw error;
      toast.success("Group updated!");
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

   const handlePromoteAdmin = async (targetId: string) => {
    if (adminCount >= 4) {
      toast.error("You can have at most 4 admins in this group");
      return;
    }
    try {
      const { error } = await supabase.rpc("add_conversation_admin", {
        _conversation_id: conversation.id,
        _target: targetId,
      });

      if (error) throw error;
      toast.success("Admin added!");
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDemoteAdmin = async (targetId: string) => {
    try {
      const { error } = await supabase.rpc("remove_conversation_admin", {
        _conversation_id: conversation.id,
        _target: targetId,
      });

      if (error) throw error;
      toast.success("Admin role removed");
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleKickMember = async (targetId: string, username: string) => {
    if (!confirm(`Remove @${username} from the group?`)) return;
    try {
      const { error } = await supabase.rpc("kick_group_member", {
        _conversation_id: conversation.id,
        _target: targetId,
      });

      if (error) throw error;
      toast.success(`Removed @${username}`);
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", conversation.id] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      const { error } = await supabase.rpc("leave_group", {
        _conversation_id: conversation.id,
      });
      if (error) throw error;
      toast.success("Left group");
      onOpenChange(false);
      navigate({ to: "/inbox" });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Delete this group permanently for everyone? This cannot be undone.")) return;
    try {
      if (isSiteAdmin && !isOwner) {
        const { error } = await supabase.rpc("delete_group", {
          _conversation_id: conversation.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("conversations")
          .delete()
          .eq("id", conversation.id);
        if (error) throw error;
      }

      toast.success("Group deleted");
      onOpenChange(false);
      navigate({ to: "/inbox" });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSendReport = async () => {
    try {
      setReporting(true);
      const { error } = await supabase.rpc("report_group", {
        _conversation_id: conversation.id,
        _reason: reportReason,
        _details: reportDetails.trim(),
      });
      if (error) throw error;
      toast.success("Group reported! Site admins have been invited to inspect and moderate.");
      setShowReport(false);
      setReportDetails("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Details</DialogTitle>
        </DialogHeader>

        {showReport ? (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-destructive">Report this group</h3>
            <p className="text-xs text-muted-foreground">
              Reporting this group automatically invites site admins into the group chat so they can review the messages and delete it if necessary.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Spam", "Harassment", "Inappropriate", "Violence", "Other"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReportReason(r)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${
                    reportReason === r ? "border-rose bg-rose/10 font-bold" : "hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Provide details about the issue..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReport(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={reporting}
                onClick={handleSendReport}
              >
                {reporting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Avatar & Info */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Group profile"
                    className="size-20 rounded-full object-cover border"
                  />
                ) : (
                  <div className="size-20 rounded-full bg-rose/10 text-rose flex items-center justify-center text-2xl font-bold border">
                    {name.charAt(0) || "👥"}
                  </div>
                )}
                {(isOwner || isGroupAdmin) && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Change group photo"
                  >
                    <Camera className="size-6" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {isOwner || isGroupAdmin ? (
                <div className="w-full space-y-2">
                  <Input
                    placeholder="Group name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                  />
                  <Textarea
                    placeholder="Group description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={200}
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={saving}
                    onClick={handleSaveInfo}
                  >
                    {saving ? "Saving..." : "Save Group Info"}
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="font-bold">{conversation.name || "Group"}</h3>
                  {conversation.description && (
                    <p className="text-xs text-muted-foreground mt-1">{conversation.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Members Section */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  MEMBERS ({allMembers.length}) · {adminCount}/4 Admins
                </span>
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {allMembers.map((m) => {
                  const memberIsOwner = m.id === conversation.created_by;
                  const memberIsAdmin = m.role === "admin";
                  const isMe = m.id === currentUserId;

                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg p-1 hover:bg-accent/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar profile={m} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold flex items-center gap-1">
                            {m.display_name || m.username}
                            {memberIsOwner && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 py-0.2 text-[10px] font-bold text-amber-600">
                                👑 Owner
                              </span>
                            )}
                            {memberIsAdmin && !memberIsOwner && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-rose/10 px-1 py-0.2 text-[10px] font-bold text-rose">
                                <ShieldCheck className="size-2.5" /> Admin
                              </span>
                            )}
                            {isMe && <span className="text-[10px] text-muted-foreground">(You)</span>}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">@{m.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Owner can toggle Admin up to 4 */}
                        {isOwner && !memberIsOwner && (
                          memberIsAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => handleDemoteAdmin(m.id)}
                            >
                              Dismiss Admin
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              disabled={adminCount >= 4}
                              onClick={() => handlePromoteAdmin(m.id)}
                            >
                              <Shield className="size-3 mr-1" /> Make Admin
                            </Button>
                          )
                        )}

                        {/* Owner or Admin can kick (except owner) */}
                        {isGroupAdmin && !memberIsOwner && !isMe && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleKickMember(m.id, m.username)}
                            title="Remove from group"
                          >
                            <UserMinus className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs justify-start gap-2"
                onClick={() => setShowReport(true)}
              >
                <Flag className="size-3.5 text-amber-600" /> Report Group
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs justify-start gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleLeaveGroup}
              >
                <LogOut className="size-3.5" /> Leave Group
              </Button>

              {(isOwner || isSiteAdmin) && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs justify-start gap-2"
                  onClick={handleDeleteGroup}
                >
                  <Trash2 className="size-3.5" /> Delete Group Permanently
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
