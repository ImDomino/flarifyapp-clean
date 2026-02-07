"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

interface FollowButtonProps {
  targetUserId: string;
  onToggle?: (isFollowing: boolean) => void;
  className?: string;
}

export function FollowButton({ targetUserId, onToggle, className }: FollowButtonProps) {
  const { user, authenticated, login } = usePrivy();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  // Don't show follow button for own profile
  const isOwnProfile = user?.id === targetUserId;

  useEffect(() => {
    if (!user?.id || !targetUserId || isOwnProfile) return;

    const checkFollow = async () => {
      try {
        const res = await fetch(
          `/api/follows?user_id=${encodeURIComponent(targetUserId)}&viewer_id=${encodeURIComponent(user.id)}`
        );
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      } catch (err) {
        console.error("Error checking follow:", err);
      } finally {
        setChecked(true);
      }
    };

    checkFollow();
  }, [user?.id, targetUserId, isOwnProfile]);

  const handleToggle = async () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follower_id: user.id,
          following_id: targetUserId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const newState = data.action === "followed";
        setIsFollowing(newState);
        onToggle?.(newState);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isOwnProfile) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || !checked}
      className={
        className ||
        `inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition min-h-[40px] ${
          isFollowing
            ? "bg-white/5 hover:bg-rose-500/10 border border-white/10 text-slate-200 hover:text-rose-300 hover:border-rose-500/20"
            : "bg-gradient-to-r from-blue-500/90 to-teal-400/90 text-slate-950 hover:from-blue-500 hover:to-teal-400 shadow-glow"
        } disabled:opacity-50 disabled:cursor-not-allowed`
      }
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          Follow
        </>
      )}
    </button>
  );
}
