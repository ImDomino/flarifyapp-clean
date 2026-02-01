"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";
import type { CommentWithUser } from "@/lib/types";

interface CommentSectionProps {
  postId: string;
  comments: CommentWithUser[];
  currentUserId?: string;
}

export function CommentSection({ postId, comments, currentUserId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localComments, setLocalComments] = useState(comments);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!currentUserId || !newComment.trim()) return;

  setIsSubmitting(true);

  setTimeout(() => {
    const mockNewComment: CommentWithUser = {
      id: `c-${Date.now()}`,
      post_id: postId,
      user_id: currentUserId,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      profiles: {
        id: currentUserId,
        email: "demo@flarifyapp.com",
        username: "DemoUser",
        wallet_address: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    setLocalComments([...localComments, mockNewComment]);
    setNewComment("");
    setIsSubmitting(false);
  }, 1000);  // ✅ Только эта ;
};
  

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-foreground">
        <MessageCircle className="h-6 w-6" />
        <span>Comments ({localComments.length})</span>
      </h2>

      {/* Comment Form */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground mb-2"
            rows={3}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Posting...
              </span>
            ) : (
              "Post Comment"
            )}
          </button>
        </form>
      ) : (
        <p className="text-muted-foreground mb-6">
          Sign in to leave a comment
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {localComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          localComments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 bg-secondary/30 rounded-lg border border-border"
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {comment.profiles.username[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {comment.profiles.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <p className="text-foreground">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
