import { useState, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { toast } from "sonner";

export interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  reposts: boolean;
  messages: boolean;
  price_alerts: boolean;
}

export interface PrivacySettings {
  show_pnl_public: boolean;
  show_positions_public: boolean;
  allow_messages_from: "everyone" | "following" | "nobody";
}

export interface UserSettings {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

const defaultSettings: UserSettings = {
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    reposts: true,
    messages: true,
    price_alerts: true,
  },
  privacy: {
    show_pnl_public: true,
    show_positions_public: true,
    allow_messages_from: "everyone",
  },
};

export function useSettings() {
  const { authenticated } = usePrivy();
  const authFetch = useAuthFetch();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSettings() {
      try {
        const res = await authFetch("/api/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        const s = data?.settings || data;
        if (!cancelled) {
          setSettings({
            notifications: { ...defaultSettings.notifications, ...s?.notifications },
            privacy: { ...defaultSettings.privacy, ...s?.privacy },
          });
        }
      } catch {
        // Keep default settings on error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, [authenticated, authFetch]);

  const updateNotifications = useCallback(
    async (partial: Partial<NotificationSettings>) => {
      const previous = settings;
      const updated: UserSettings = {
        ...settings,
        notifications: { ...settings.notifications, ...partial },
      };

      setSettings(updated);
      setIsSaving(true);

      try {
        const res = await authFetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { notifications: updated.notifications } }),
        });
        if (!res.ok) throw new Error("Failed to save notification settings");
      } catch {
        setSettings(previous);
        toast.error("Failed to save notification settings");
      } finally {
        setIsSaving(false);
      }
    },
    [settings, authFetch]
  );

  const updatePrivacy = useCallback(
    async (partial: Partial<PrivacySettings>) => {
      const previous = settings;
      const updated: UserSettings = {
        ...settings,
        privacy: { ...settings.privacy, ...partial },
      };

      setSettings(updated);
      setIsSaving(true);

      try {
        const res = await authFetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: { privacy: updated.privacy } }),
        });
        if (!res.ok) throw new Error("Failed to save privacy settings");
      } catch {
        setSettings(previous);
        toast.error("Failed to save privacy settings");
      } finally {
        setIsSaving(false);
      }
    },
    [settings, authFetch]
  );

  return {
    settings,
    isLoading,
    isSaving,
    updateNotifications,
    updatePrivacy,
  };
}
