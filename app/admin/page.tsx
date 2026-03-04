"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface WaitlistEntry {
  email: string;
  created_at: string;
  approved: boolean;
}

export default function AdminPage() {
  const authFetch = useAuthFetch();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    label: string;
    code: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadWaitlist = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/waitlist");
      if (res.status === 401 || res.status === 403) {
        setError("Access denied");
        return;
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setError("Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-500 text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin</h1>
        <button
          onClick={() => generateInvite()}
          disabled={generating}
          className="px-4 py-2 text-sm bg-foreground text-background rounded hover:opacity-90 transition-opacity disabled:opacity-50"
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
            <code className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono select-all">
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

      {/* Waitlist */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Waitlist
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {entries.length} total &middot;{" "}
          {entries.filter((e) => e.approved).length} approved &middot;{" "}
          {entries.filter((e) => !e.approved).length} pending
        </p>

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
      </div>
    </div>
  );
}
