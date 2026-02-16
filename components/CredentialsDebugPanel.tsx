"use client";

import { useState } from "react";
import { RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";

export function CredentialsDebugPanel() {
  const [status, setStatus] = useState<"idle" | "clearing" | "success" | "error">("idle");

  const handleClearCredentials = () => {
    try {
      setStatus("clearing");
      localStorage.removeItem("pm_api_creds");
      localStorage.removeItem("pm_api_creds_eoa");
      // Also clear old keys if they exist
      localStorage.removeItem("polymarket_user_api_creds");
      localStorage.removeItem("polymarket_user_api_creds_eoa");
      localStorage.removeItem("polymarket_user_api_creds_safe");
      console.log("[Debug] Cleared all credentials");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-sm text-amber-200">Debug: API Credentials</h3>
      </div>
      <p className="text-xs text-amber-300 mb-3">
        If getting 401 errors, clear and recreate credentials.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleClearCredentials}
          disabled={status === "clearing"}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/30 transition disabled:opacity-50"
        >
          {status === "success" ? <><CheckCircle className="w-4 h-4" />Cleared!</> :
           <><Trash2 className="w-4 h-4" />Clear Credentials</>}
        </button>
        {status === "success" && (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border border-blue-500/30 transition"
          >
            <RefreshCw className="w-4 h-4" />Reload Page
          </button>
        )}
      </div>
    </div>
  );
}