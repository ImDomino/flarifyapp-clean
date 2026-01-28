"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Heart, MessageCircle, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    id: string;
    email: string;
    username: string | null;
  };
}

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
  };
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, authenticated, login } = usePrivy();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [id]);

  const loadPost = async () => {
    try {
      const response = await fetch(`/api/posts?page=1&limit=100`);
      const data = await response.json();
      const foundPost = data.posts.find((p: Post) => p.id === id);
      
      if (foundPost) {
        setPost(foundPost);
        setLikes(foundPost.likes_count || 0);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?post_id=${id}`);
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
          post_id: id,
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

  const handleCommentSubmit = async (e: React.FormEvent) => {
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
          post_id: id,
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
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch('/api/posts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: id,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch('/api/comments/delete', {
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
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
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
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Post not found</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const username = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'Unknown';
  const handle = '@' + username.toLowerCase().replace(/\s+/g, '');

  return (
    <div className="w-full space-y-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span style={{ letterSpacing: '-1px' }}>Back</span>
      </button>

      {/* Post */}
      <div className="bg-card rounded-[30px] border border-border card-shadow p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-[60px] h-[60px] rounded-full bg-[#C2C2C2] flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-white">
                {username[0].toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold" style={{ fontSize: '20px', letterSpacing: '-1px', color: '#140106' }}>
                  {username}
                </span>
                <span className="text-xs" style={{ letterSpacing: '0px', color: '#989898' }}>
                  {handle}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#989898]"></span>
                <span className="text-sm" style={{ letterSpacing: '0px', color: '#989898' }}>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                </span>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          {user?.id === post.user_id && (
            <button
              onClick={handleDeletePost}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="whitespace-pre-wrap break-words mb-3" style={{ fontSize: '20px', lineHeight: '24px', letterSpacing: '-1px', color: '#140106' }}>
            {post.content}
          </p>

          {/* Image */}
          {post.image_url && (
            <div className="relative w-full rounded-[30px] overflow-hidden border border-border mt-3">
              <Image
                src={post.image_url}
                alt="Post image"
                width={690}
                height={500}
                className="w-full h-auto object-cover"
                unoptimized
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-8 pt-4 border-t border-border">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 group transition-colors ${
              hasLiked ? "text-red-500" : "text-[#989898] hover:text-red-500"
            }`}
          >
            <Heart className={`w-5 h-5 ${hasLiked && "fill-current"} transition-all group-hover:scale-110`} />
            <span className="font-semibold text-xs" style={{ letterSpacing: '-1px' }}>
              {likes > 0 ? (likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes) : ''}
            </span>
          </button>

          <div className="flex items-center gap-2 text-[#989898]">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold text-xs" style={{ letterSpacing: '-1px' }}>
              {comments.length > 0 ? comments.length : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-card rounded-[30px] border border-border card-shadow p-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#140106', letterSpacing: '-1px' }}>
          Comments ({comments.length})
        </h2>

        {/* Add Comment */}
        {authenticated ? (
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              style={{ fontSize: '16px', letterSpacing: '-1px', color: '#140106' }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold disabled:opacity-50"
              style={{ fontSize: '16px', letterSpacing: '-1px' }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-accent/30 rounded-lg text-center">
            <p className="text-muted-foreground mb-3" style={{ letterSpacing: '-1px' }}>
              Sign in to leave a comment
            </p>
            <button
              onClick={login}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
              style={{ fontSize: '16px', letterSpacing: '-1px' }}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" style={{ letterSpacing: '-1px' }}>
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => {
              const commentUsername = comment.profiles?.username || comment.profiles?.email?.split('@')[0] || 'Unknown';
              const commentHandle = '@' + commentUsername.toLowerCase().replace(/\s+/g, '');
              
              return (
                <div key={comment.id} className="flex gap-3 p-4 bg-accent/20 rounded-lg">
                  <div className="w-[40px] h-[40px] rounded-full bg-[#C2C2C2] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">
                      {commentUsername[0].toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ letterSpacing: '-1px', color: '#140106' }}>
                          {commentUsername}
                        </span>
                        <span className="text-xs" style={{ letterSpacing: '0px', color: '#989898' }}>
                          {commentHandle}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#989898]"></span>
                        <span className="text-xs" style={{ letterSpacing: '0px', color: '#989898' }}>
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                        </span>
                      </div>

                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap break-words" style={{ fontSize: '16px', lineHeight: '20px', letterSpacing: '-1px', color: '#140106' }}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}