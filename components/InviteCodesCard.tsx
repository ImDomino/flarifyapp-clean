"use client";

import { useState } from "react";
import { Copy, Check, Ticket } from "lucide-react";
import { useBetaGate } from "@/providers/BetaGateProvider";

export function InviteCodesCard() {
  const { inviteCodes } = useBetaGate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!inviteCodes.length) return null;

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const usedCount = inviteCodes.filter((c) => c.used_by).length;
  const totalCount = inviteCodes.length;

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/60 overflow-hidden animate-fade-up stagger-3">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/40">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-white" />
          <h3 className="font-black text-white uppercase tracking-wider text-xs">
            Invite Codes
          </h3>
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          {usedCount}/{totalCount} Used
        </span>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {inviteCodes.map((invite) => (
          <div
            key={invite.code}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <span
                className={`font-mono text-sm font-bold tracking-wider ${
                  invite.used_by ? "text-zinc-600 line-through" : "text-white"
                }`}
              >
                {invite.code}
              </span>
              {invite.used_by && (
                <span className="ml-2 text-[9px] text-zinc-700 uppercase tracking-widest">
                  Used
                </span>
              )}
            </div>
            {!invite.used_by && (
              <button
                onClick={() => handleCopy(invite.code)}
                className="p-2 text-zinc-600 hover:text-white transition-colors"
                title="Copy invite link"
              >
                {copiedCode === invite.code ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
