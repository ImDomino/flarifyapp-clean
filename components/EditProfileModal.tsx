"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Check, AlertCircle } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

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
  isOpen,
  onClose,
  currentUsername,
  currentDisplayName,
  currentAvatarUrl,
  currentBio,
  onSaved,
}: EditProfileModalProps) {
  const { user } = usePrivy();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [bio, setBio] = useState(currentBio);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ✅ FIX: Sync local state whenever modal opens with fresh props
  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername);
      setDisplayName(currentDisplayName);
      setBio(currentBio);
      setAvatarPreview(currentAvatarUrl);
      setAvatarFile(null);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, currentUsername, currentDisplayName, currentBio, currentAvatarUrl]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      let avatarUrl = currentAvatarUrl;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("user_id", user.id);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          throw new Error(uploadData.error || "Failed to upload avatar");
        }
        avatarUrl = uploadData.url;
      }

      // Update profile
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          username: username.trim(),
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      console.log("✅ Profile saved successfully:", data.profile);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
        setSuccess(false);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const usernameValid = /^[a-zA-Z0-9_]{2,30}$/.test(username.trim());

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-base-900 border border-white/10 rounded-2xl shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="relative p-5 border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">
              Edit Profile
            </h2>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 p-[3px] shadow-glow">
                  <div className="h-full w-full rounded-full bg-base-900 flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center">
                        <span className="font-display text-3xl font-bold text-blue-100">
                          {(displayName || username)[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Change avatar
              </button>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={50}
                className="w-full bg-base-850/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 text-slate-100"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                  }
                  placeholder="username"
                  maxLength={30}
                  className={`w-full bg-base-850/50 border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-slate-500 text-slate-100 ${
                    username.trim() && !usernameValid
                      ? "border-rose-500/50 focus:ring-rose-500/50"
                      : "border-white/10 focus:ring-blue-500/50"
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                2-30 characters: letters, numbers, underscores
              </p>
              {username.trim() && !usernameValid && (
                <p className="mt-1 text-xs text-rose-400">Invalid username format</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about yourself..."
                maxLength={200}
                rows={3}
                className="w-full bg-base-850/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 text-slate-100 resize-none"
              />
              <p className="mt-1 text-xs text-slate-500 text-right">
                {bio.length}/200
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                <p className="text-xs text-teal-300">Profile updated!</p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !usernameValid || !displayName.trim()}
              className="w-full py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-teal-400 text-slate-950 shadow-glow"
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
