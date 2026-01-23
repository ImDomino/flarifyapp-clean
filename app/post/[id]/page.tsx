"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Heart, MessageCircle, ArrowLeft, Trash2, Loader2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();
  
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const postId = params.id as string;

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId]);

  const loadPost = async () => {
    try {
      const response = await fetch(`/api/posts?page=1&limit=100`);
      const data = await response.json();
      const foundPost = data.posts.find((p: PostWithUser) => p.id === postId);
      
      if (foundPost) {
        setPost(foundPost);
        setLikes(foundPost.likes_count || 0);
        setHasLiked(foundPost.user_has_liked || false);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?post_id=${postId}`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_id: postId,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.action === 'liked') {
          setLikes(likes + 1);
          setHasLiked(true);
        } else {
          setLikes(likes - 1);
          setHasLiked(false);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      login();
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          user_id: user.id,
          content: newComment,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment("");
        loadComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_id: postId,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/');
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          comment_id: commentId,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        loadComments();
      } else {
        alert(data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-card rounded-lg border border-border p-8">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const username = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'Unknown';
  const isOwnPost = user?.id === post.user_id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>

      {/* Post */}
      <div className="bg-card rounded-lg border border-border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Delete Button */}
          {isOwnPost && (
            <button
              onClick={handleDeletePost}
              className="text-red-500 hover:text-red-600 transition-colors"
              title="Delete post"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-foreground mb-4 whitespace-pre-wrap text-lg">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center space-x-4 pt-4 border-t border-border">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 transition-colors ${
              hasLiked
                ? "text-red-500"
                : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <Heart className={`h-5 w-5 ${hasLiked && "fill-current"}`} />
            <span className="text-sm font-medium">{likes}</span>
          </button>

          <div className="flex items-center space-x-2 text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{comments.length}</span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold mb-4">Comments ({comments.length})</h2>

        {/* Comment Form */}
        {authenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground mb-3"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Post Comment</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-muted-foreground mb-3">Sign in to comment</p>
            <button
              onClick={login}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => {
              const commentUsername = comment.profiles?.username || comment.profiles?.email?.split('@')[0] || 'Unknown';
              const isOwnComment = user?.id === comment.user_id;

              return (
                <div key={comment.id} className="bg-secondary/30 rounded-lg p-4 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {commentUsername[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{commentUsername}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Delete Comment Button */}
                    {isOwnComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
