"use client";

import { useState } from "react";
import { RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";

/**
 * Debug компонент для управления API credentials
 * Добавьте временно в RightSidebar или ProfilePage для отладки
 */
export function CredentialsDebugPanel() {
  const [status, setStatus] = useState<"idle" | "clearing" | "success" | "error">("idle");

  const handleClearCredentials = () => {
    try {
      setStatus("clearing");
      
      // Очищаем все связанные ключи из localStorage
      window.localStorage.removeItem("polymarket_user_api_creds");
      window.localStorage.removeItem("polymarket_user_api_creds_eoa");
      window.localStorage.removeItem("polymarket_user_api_creds_safe");
      
      console.log("🗑️ Cleared all cached credentials");
      setStatus("success");
      
      // Сбросить статус через 2 секунды
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      console.error("❌ Error clearing credentials:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-sm text-amber-200">
          Debug: API Credentials
        </h3>
      </div>
      
      <p className="text-xs text-amber-300 mb-3">
        If you're getting 401 Unauthorized errors, try clearing and recreating your API credentials.
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleClearCredentials}
          disabled={status === "clearing"}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30 transition disabled:opacity-50"
        >
          {status === "clearing" ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Clearing...
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Cleared!
            </>
          ) : status === "error" ? (
            <>
              <AlertCircle className="w-4 h-4" />
              Error
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Clear Credentials
            </>
          )}
        </button>

        {status === "success" && (
          <button
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border border-blue-500/30 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-amber-500/20">
        <p className="text-xs text-amber-400/60">
          After clearing, credentials will be recreated automatically on next trading attempt.
        </p>
      </div>
    </div>
  );
}
