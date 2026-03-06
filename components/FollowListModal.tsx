"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FollowButton } from "./FollowButton";

interface UserItem {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  count: number;
}

const PAGE_SIZE = 20;

export function FollowListModal({ isOpen, onClose, userId, type, count }: FollowListModalProps) {
  const router = useRouter();
  const { user } = usePrivy();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(count);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadUsers = useCallback(async (offset: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/follows/list?user_id=${encodeURIComponent(userId)}&type=${type}&limit=${PAGE_SIZE}&offset=${offset}`
      );
      const data = await res.json();
      const fetched = data.users || [];
      setTotal(data.total || 0);
      if (offset === 0) {
        setUsers(fetched);
      } else {
        setUsers((prev) => [...prev, ...fetched]);
      }
      setHasMore(offset + fetched.length < (data.total || 0));
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    if (isOpen) {
      setUsers([]);
      loadUsers(0);
    }
  }, [isOpen, loadUsers]);

  const handleUserClick = (id: string) => {
    onClose();
    router.push(`/user/${encodeURIComponent(id)}`);
  };

  if (!isOpen) return null;

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9999]" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-white pointer-events-auto relative overflow-hidden max-h-[80vh] flex flex-col">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px w-3 h-3 bg-white z-10" />
          <div className="absolute -bottom-px -right-px w-3 h-3 bg-white z-10" />

          {/* Header */}
          <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xs font-black uppercase tracking-wider">
              {title} <span className="text-zinc-500 ml-1">{total}</span>
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {users.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  {type === "followers" ? "No followers yet" : "Not following anyone"}
                </p>
              </div>
            )}

            {users.map((u) => {
              const name = u.display_name || u.username || "User";
              return (
                <div
                  key={u.id}
                  className="px-4 py-3 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors flex items-center gap-3 group"
                >
                  <button
                    onClick={() => handleUserClick(u.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-zinc-500 uppercase">{name[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white uppercase truncate group-hover:text-zinc-200 transition-colors">
                        {name}
                      </p>
                      {u.username && (
                        <p className="text-[10px] text-zinc-600 font-mono truncate">@{u.username}</p>
                      )}
                      {u.bio && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{u.bio}</p>
                      )}
                    </div>
                  </button>
                  {user && user.id !== u.id && (
                    <div className="flex-shrink-0">
                      <FollowButton targetUserId={u.id} currentUserId={user.id} size="small" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
              </div>
            )}

            {hasMore && !isLoading && (
              <button
                onClick={() => loadUsers(users.length)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/[0.03] transition-colors border-t border-zinc-800/40"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
