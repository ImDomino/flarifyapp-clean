"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { MarketSearchInput } from "@/components/MarketSearchInput";
import { Image as ImageIcon, X, Send, Users, PenSquare, Ticket } from "lucide-react";
import Image from "next/image";

type Tab = "waitlist" | "create-post";

interface WaitlistEntry {
  email: string;
  created_at: string;
  approved: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
}

interface Market {
  id: string;
  question: string;
  description?: string;
  url: string;
  outcomes: string[];
  outcomePrices: number[] | null;
  volume: string;
  liquidity?: string;
  endDate?: string;
  yesTokenId?: string;
  noTokenId?: string;
  negRisk?: boolean;
  tokens?: Array<{ token_id: string; outcome: string }>;
}

export default function AdminPage() {
  const authFetch = useAuthFetch();
  const [activeTab, setActiveTab] = useState<Tab>("create-post");
  const [error, setError] = useState<string | null>(null);

  // Waitlist state
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistLoaded, setWaitlistLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    label: string;
    code: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create post state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load waitlist
  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const res = await authFetch("/api/admin/waitlist");
      if (res.status === 401 || res.status === 403) {
        setError("Access denied");
        return;
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setWaitlistLoaded(true);
    } catch {
      setError("Failed to load waitlist");
    } finally {
      setWaitlistLoading(false);
    }
  }, [authFetch]);

  // Search users
  const searchUsers = useCallback(
    async (search: string) => {
      setUsersLoading(true);
      try {
        const res = await authFetch(
          `/api/admin/users?search=${encodeURIComponent(search)}`
        );
        if (res.status === 401 || res.status === 403) {
          setError("Access denied");
          return;
        }
        const data = await res.json();
        setUsers(data.users || []);
      } catch {
        console.error("Failed to search users");
      } finally {
        setUsersLoading(false);
      }
    },
    [authFetch]
  );

  // Load users on tab switch
  useEffect(() => {
    if (activeTab === "create-post" && users.length === 0) {
      searchUsers("");
    }
    if (activeTab === "waitlist" && !waitlistLoaded) {
      loadWaitlist();
    }
  }, [activeTab, searchUsers, loadWaitlist, users.length, waitlistLoaded]);

  // Handle user search input
  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    setShowUserDropdown(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchUsers(value), 300);
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        userSearchRef.current &&
        !userSearchRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Shared image processor
  const processImageFile = (file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // File input handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  // Paste handler (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processImageFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Generate invite
  const generateInvite = async (email?: string) => {
    if (email) {
      setGeneratingFor(email);
    } else {
      setGenerating(true);
    }
    setInviteResult(null);
    try {
      const res = await authFetch("/api/admin/approve", {
        method: "POST",
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();
      if (data.success) {
        setInviteResult({
          label: email || "Quick invite",
          code: data.inviteCode,
          link: `${window.location.origin}${data.inviteLink}`,
        });
        if (email) {
          setEntries((prev) =>
            prev.map((e) =>
              e.email === email ? { ...e, approved: true } : e
            )
          );
        }
      } else {
        alert(data.error || "Failed to generate invite");
      }
    } catch {
      alert("Failed to generate invite");
    } finally {
      setGenerating(false);
      setGeneratingFor(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit post as user
  const handlePostSubmit = async () => {
    if (!selectedUser || (!postContent.trim() && !imageFile)) return;
    setIsPosting(true);
    setPostSuccess(null);

    try {
      // Upload image if present
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await authFetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success)
          throw new Error(uploadData.error || "Upload failed");
        imageUrl = uploadData.url;
      }

      // Build market data
      let marketData = null;
      if (selectedMarket) {
        let yesTokenId: string | null = null;
        let noTokenId: string | null = null;
        if (selectedMarket.yesTokenId && selectedMarket.noTokenId) {
          yesTokenId = selectedMarket.yesTokenId;
          noTokenId = selectedMarket.noTokenId;
        } else if (selectedMarket.tokens) {
          const yesToken = selectedMarket.tokens.find((t) =>
            t.outcome?.toLowerCase().includes("yes")
          );
          const noToken = selectedMarket.tokens.find((t) =>
            t.outcome?.toLowerCase().includes("no")
          );
          yesTokenId = yesToken?.token_id || null;
          noTokenId = noToken?.token_id || null;
        }
        marketData = {
          question: selectedMarket.question,
          outcomes: selectedMarket.outcomes,
          prices: selectedMarket.outcomePrices,
          volume: selectedMarket.volume,
          url: selectedMarket.url,
          yesTokenId: yesTokenId || undefined,
          noTokenId: noTokenId || undefined,
          negRisk: selectedMarket.negRisk,
        };
      }

      const res = await authFetch("/api/admin/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: selectedUser.id,
          content: postContent,
          image_url: imageUrl,
          polymarket_market_id: selectedMarket?.id || null,
          market_data: marketData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create post");

      setPostSuccess(
        `Post published as @${data.targetUsername || selectedUser.username}`
      );
      setPostContent("");
      setImageFile(null);
      setImagePreview("");
      setSelectedMarket(null);
      setSelectedUser(null);
      setUserSearch("");
      setTimeout(() => setPostSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-500 text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("create-post")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "create-post"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenSquare className="w-4 h-4" />
          Create Post
        </button>
        <button
          onClick={() => setActiveTab("waitlist")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "waitlist"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ticket className="w-4 h-4" />
          Waitlist
        </button>
      </div>

      {/* Create Post Tab */}
      {activeTab === "create-post" && (
        <div className="space-y-5">
          {/* Success banner */}
          {postSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm font-medium">
              {postSuccess}
            </div>
          )}

          {/* User selector */}
          <div ref={userSearchRef} className="relative">
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Post as user
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
                {selectedUser.avatar_url ? (
                  <Image
                    src={selectedUser.avatar_url}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-foreground">
                    {(selectedUser.username || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    @{selectedUser.username}
                  </p>
                  {selectedUser.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedUser.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearch("");
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => handleUserSearchChange(e.target.value)}
                    onFocus={() => {
                      setShowUserDropdown(true);
                      if (users.length === 0) searchUsers("");
                    }}
                    placeholder="Search by username or email..."
                    className="w-full bg-card border border-border rounded-lg py-3 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                {showUserDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg max-h-64 overflow-y-auto z-50 shadow-lg">
                    {usersLoading && (
                      <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                        Loading...
                      </div>
                    )}
                    {!usersLoading && users.length === 0 && (
                      <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                        No users found
                      </div>
                    )}
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDropdown(false);
                          setUserSearch("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                      >
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt=""
                            width={28}
                            height={28}
                            className="w-7 h-7 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-bold text-foreground">
                            {(user.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            @{user.username}
                          </p>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Post content */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Post content
            </label>
            <div
              className={`bg-card border rounded-lg overflow-hidden transition-all duration-200 relative ${
                isDragging
                  ? "border-foreground ring-2 ring-foreground/20"
                  : "border-border"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-foreground/40 flex items-center justify-center mb-3 animate-pulse">
                    <ImageIcon className="w-5 h-5 text-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground/70">
                    Drop image here
                  </p>
                </div>
              )}

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                onPaste={handlePaste}
                placeholder="Write post content... (paste images with Ctrl+V)"
                rows={4}
                className="w-full bg-transparent p-4 text-foreground text-sm placeholder-muted-foreground focus:outline-none resize-none"
              />

              {/* Image preview */}
              {imagePreview && (
                <div className="px-4 pb-3 relative">
                  <div className="border border-border rounded-lg relative overflow-hidden group">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={690}
                      height={400}
                      className="w-full h-auto object-cover max-h-48"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-7 h-7 bg-background/80 backdrop-blur border border-border rounded-full flex items-center justify-center text-foreground hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Selected market preview */}
              {selectedMarket && (
                <div className="px-4 pb-3">
                  <div className="border border-border rounded-lg p-3 bg-accent/50 relative">
                    <button
                      type="button"
                      onClick={() => setSelectedMarket(null)}
                      className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-1 block">
                      Attached Market
                    </span>
                    <p className="text-sm font-medium text-foreground pr-6">
                      {selectedMarket.question}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-all"
                    title="Attach image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  {!imagePreview && (
                    <span className="text-[11px] text-muted-foreground/50 hidden sm:inline">
                      Drag & drop or Ctrl+V to add image
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {postContent.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Market search */}
          {!selectedMarket && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Attach Market (optional)
              </label>
              <MarketSearchInput onSelectMarket={setSelectedMarket} />
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handlePostSubmit}
            disabled={
              isPosting ||
              !selectedUser ||
              (!postContent.trim() && !imageFile)
            }
            className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background font-medium text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isPosting
              ? "Publishing..."
              : selectedUser
              ? `Publish as @${selectedUser.username}`
              : "Select a user first"}
          </button>
        </div>
      )}

      {/* Waitlist Tab */}
      {activeTab === "waitlist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {entries.length} total &middot;{" "}
                {entries.filter((e) => e.approved).length} approved &middot;{" "}
                {entries.filter((e) => !e.approved).length} pending
              </p>
            </div>
            <button
              onClick={() => generateInvite()}
              disabled={generating}
              className="px-4 py-2 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Invite Code"}
            </button>
          </div>

          {/* Invite result banner */}
          {inviteResult && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Invite for{" "}
                <span className="text-foreground font-medium">
                  {inviteResult.label}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono select-all truncate">
                  {inviteResult.link}
                </code>
                <button
                  onClick={() => copyToClipboard(inviteResult.link)}
                  className="px-3 py-2 text-sm border border-border rounded hover:bg-accent transition-colors whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Code: {inviteResult.code}
              </p>
            </div>
          )}

          {waitlistLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.email}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-foreground">
                        {entry.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {entry.approved ? (
                          <span className="text-green-500 text-xs font-medium">
                            Approved
                          </span>
                        ) : (
                          <span className="text-yellow-500 text-xs font-medium">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => generateInvite(entry.email)}
                          disabled={generatingFor === entry.email}
                          className="px-3 py-1 text-xs border border-border rounded hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          {generatingFor === entry.email
                            ? "Generating..."
                            : "Send Invite"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No waitlist entries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
