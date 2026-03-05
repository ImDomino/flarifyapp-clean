"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface ReplyTo {
  id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  deleted_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  read: boolean;
  created_at: string;
  deleted_at: string | null;
  edited_at: string | null;
  reply_to: ReplyTo | null;
}

interface UseChatOptions {
  recipientId: string;
  userId: string | undefined;
}

export function useChat({ recipientId, userId }: UseChatOptions) {
  const authFetch = useAuthFetch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await authFetch(`/api/messages?conversation_id=${convId}&limit=50`);
      const data = await res.json();
      const msgs = data.messages || [];
      setMessages(msgs);
      if (msgs.length > 0) {
        lastMessageTimeRef.current = msgs[msgs.length - 1].created_at;
      }
    } catch (err) {
      console.error("Load messages error:", err);
    }
  }, [authFetch]);

  const loadConversation = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch("/api/messages/conversations");
      const data = await res.json();
      const conv = (data.conversations || []).find(
        (c: any) => c.other_user?.id === recipientId ||
          c.user1_id === recipientId || c.user2_id === recipientId
      );

      if (conv) {
        setConversationId(conv.id);
        await loadMessages(conv.id);
        await authFetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conv.id }),
        });
      }
    } catch (err) {
      console.error("Load conversation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, recipientId, authFetch, loadMessages]);

  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await authFetch(`/api/messages?conversation_id=${conversationId}&limit=50`);
      const data = await res.json();
      const msgs = data.messages || [];
      // Always update to catch edits/deletes, compare full state
      const newJson = JSON.stringify(msgs);
      setMessages((prev) => {
        const prevJson = JSON.stringify(prev);
        if (newJson !== prevJson) {
          if (msgs.length > 0) {
            lastMessageTimeRef.current = msgs[msgs.length - 1].created_at;
          }
          // Mark as read if new messages
          authFetch("/api/messages/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conversationId }),
          }).catch(() => {});
          return msgs;
        }
        return prev;
      });
    } catch {}
  }, [conversationId, authFetch]);

  const pollTyping = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await authFetch(`/api/messages/typing?conversation_id=${conversationId}`);
      const data = await res.json();
      setIsTyping(data.is_typing || false);
    } catch {}
  }, [conversationId, authFetch]);

  // Send message (with optional reply)
  const sendMessage = useCallback(async (content: string, imageUrl?: string, replyToId?: string) => {
    if (!userId) return;
    setIsSending(true);

    // Build reply_to for optimistic update
    let replyTo: ReplyTo | null = null;
    if (replyToId) {
      const found = messages.find((m) => m.id === replyToId);
      if (found) {
        replyTo = {
          id: found.id,
          sender_id: found.sender_id,
          content: found.content,
          image_url: found.image_url,
          deleted_at: found.deleted_at,
        };
      }
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || "",
      sender_id: userId,
      content: content || null,
      image_url: imageUrl || null,
      read: false,
      created_at: new Date().toISOString(),
      deleted_at: null,
      edited_at: null,
      reply_to: replyTo,
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: recipientId,
          content: content || undefined,
          image_url: imageUrl || undefined,
          reply_to_id: replyToId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (!conversationId && data.conversation_id) {
          setConversationId(data.conversation_id);
        }
        setMessages((prev) =>
          prev.map((m) => m.id === tempMessage.id ? data.message : m)
        );
      }
    } catch (err) {
      console.error("Send message error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  }, [userId, recipientId, conversationId, authFetch, messages]);

  // Delete message (optimistic)
  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, deleted_at: new Date().toISOString(), content: null, image_url: null }
          : m
      )
    );
    try {
      await authFetch(`/api/messages?message_id=${messageId}`, { method: "DELETE" });
    } catch {
      if (conversationId) await loadMessages(conversationId);
    }
  }, [authFetch, conversationId, loadMessages]);

  // Edit message (optimistic)
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, edited_at: new Date().toISOString() }
          : m
      )
    );
    try {
      const res = await authFetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: messageId, content: newContent }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? data.message : m)));
      }
    } catch {
      if (conversationId) await loadMessages(conversationId);
    }
  }, [authFetch, conversationId, loadMessages]);

  const sendTyping = useCallback(async () => {
    if (!conversationId) return;
    try {
      await authFetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
    } catch {}
  }, [conversationId, authFetch]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!conversationId) return;
    intervalRef.current = setInterval(pollMessages, 5000);
    typingIntervalRef.current = setInterval(pollTyping, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [conversationId, pollMessages, pollTyping]);

  return {
    messages,
    conversationId,
    isLoading,
    isSending,
    isTyping,
    sendMessage,
    sendTyping,
    deleteMessage,
    editMessage,
  };
}
