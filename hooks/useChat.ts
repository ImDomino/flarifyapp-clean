"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  read: boolean;
  created_at: string;
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

  // Find conversation and load messages
  const loadConversation = useCallback(async () => {
    if (!userId) return;
    try {
      // Get conversations to find matching one
      const res = await authFetch("/api/messages/conversations");
      const data = await res.json();
      const conv = (data.conversations || []).find(
        (c: any) => c.other_user?.id === recipientId ||
          c.user1_id === recipientId || c.user2_id === recipientId
      );

      if (conv) {
        setConversationId(conv.id);
        await loadMessages(conv.id);
        // Mark as read
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
  }, [userId, recipientId, authFetch]);

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

  // Poll for new messages every 5 seconds
  const pollMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await authFetch(`/api/messages?conversation_id=${conversationId}&limit=50`);
      const data = await res.json();
      const msgs = data.messages || [];
      if (msgs.length > 0) {
        const lastNew = msgs[msgs.length - 1].created_at;
        if (lastNew !== lastMessageTimeRef.current) {
          setMessages(msgs);
          lastMessageTimeRef.current = lastNew;
          // Mark as read
          authFetch("/api/messages/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conversationId }),
          }).catch(() => {});
        }
      }
    } catch {}
  }, [conversationId, authFetch]);

  // Poll typing status
  const pollTyping = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await authFetch(`/api/messages/typing?conversation_id=${conversationId}`);
      const data = await res.json();
      setIsTyping(data.is_typing || false);
    } catch {}
  }, [conversationId, authFetch]);

  // Send message
  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    if (!userId) return;
    setIsSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || "",
      sender_id: userId,
      content: content || null,
      image_url: imageUrl || null,
      read: false,
      created_at: new Date().toISOString(),
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (!conversationId && data.conversation_id) {
          setConversationId(data.conversation_id);
        }
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => m.id === tempMessage.id ? data.message : m)
        );
      }
    } catch (err) {
      console.error("Send message error:", err);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  }, [userId, recipientId, conversationId, authFetch]);

  // Notify typing
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

  // Init
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Polling
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
  };
}
