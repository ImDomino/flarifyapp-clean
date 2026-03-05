"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { toast } from "sonner";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentDisplayName: string;
  currentAvatarUrl: string | null;
  currentBio: string;
  onSaved: () => void;
}

export function EditProfileModal({
  isOpen, onClose, currentUsername, currentDisplayName,
  currentAvatarUrl, currentBio, onSaved,
}: EditProfileModalProps) {
  const { user } = usePrivy();
  const authFetch = useAuthFetch();
  const [username, setUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [bio, setBio] = useState(currentBio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatarUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername); setDisplayName(currentDisplayName);
      setBio(currentBio); setAvatarPreview(currentAvatarUrl || "");
      setAvatarFile(null); setError(null);
    }
  }, [isOpen, currentUsername, currentDisplayName, currentBio, currentAvatarUrl]);

  if (!isOpen) return null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true); setError(null);

    try {
      let avatarUrl = currentAvatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        // SECURITY: user_id removed from upload — server extracts from JWT
        const uploadRes = await authFetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");
        avatarUrl = uploadData.url;
      }

      // SECURITY: user_id removed — server extracts from JWT
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save");
      toast.success("Profile saved");
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] border-2 border-white w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-lg font-black uppercase tracking-wider">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-zinc-700 bg-white flex items-center justify-center overflow-hidden cursor-pointer group relative"
              onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : <span className="text-3xl font-black text-black uppercase">{displayName[0]}</span>}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Profile Photo</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-white font-bold uppercase tracking-wider mt-1 hover:underline">Change</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#111] border border-zinc-800 p-3 text-sm font-bold text-white focus:outline-none focus:border-white transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">@</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="w-full bg-[#111] border border-zinc-800 p-3 pl-8 text-sm font-bold text-white focus:outline-none focus:border-white transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={160}
              className="w-full bg-[#111] border border-zinc-800 p-3 text-sm font-medium text-white focus:outline-none focus:border-white transition-all resize-none"
              placeholder="Tell people about yourself..." />
            <p className="text-[10px] text-zinc-600 mt-1 text-right font-mono">{bio.length}/160</p>
          </div>
          {error && (
            <div className="border border-red-800 bg-red-950/30 p-3">
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          )}
          <button onClick={handleSave} disabled={isSaving}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30">
            {isSaving ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
