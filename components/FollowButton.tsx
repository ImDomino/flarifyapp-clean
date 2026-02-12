"use client";

import { useState, useEffect, useCallback } from "react";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  onFollowChange?: () => void;
}

export function FollowButton({ targetUserId, currentUserId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkFollow = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/follows?user_id=${encodeURIComponent(targetUserId)}&viewer_id=${encodeURIComponent(currentUserId)}`
      );
      const data = await res.json();
      setIsFollowing(data.isFollowing || false);
    } catch { /* silent */ }
  }, [currentUserId, targetUserId]);

  useEffect(() => { checkFollow(); }, [checkFollow]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: currentUserId, following_id: targetUserId }),
      });
      const data = await res.json();
      setIsFollowing(data.action === "followed");
      onFollowChange?.();
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest border-2 transition-colors disabled:opacity-50 ${
        isFollowing
          ? "bg-transparent text-white border-zinc-700 hover:border-red-800 hover:text-red-400"
          : "bg-white text-black border-white hover:bg-black hover:text-white"
      }`}
    >
      {isLoading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
