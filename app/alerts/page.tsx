"use client";

import { useState } from "react";
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Check, Plus, Search } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { useAlerts } from "@/hooks/useAlerts";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { MarketSearchInput } from "@/components/MarketSearchInput";
import { CreateAlertModal } from "@/components/CreateAlertModal";

interface SelectedMarket {
  id: string;
  question: string;
  outcomePrices: number[] | null;
  yesTokenId?: string;
  noTokenId?: string;
}

export default function AlertsPage() {
  const { authenticated, login } = usePrivy();
  const router = useRouter();
  const { alerts, isLoading, toggleAlert, deleteAlert, createAlert } = useAlerts();
  const [showSearch, setShowSearch] = useState(false);
  const [alertMarket, setAlertMarket] = useState<SelectedMarket | null>(null);

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at);
  const pausedAlerts = alerts.filter((a) => !a.is_active && !a.triggered_at);

  if (!authenticated) {
    return (
      <PageTransition>
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-12 text-center animate-scale-in corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <Bell className="w-10 h-10 mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">
              Sign In Required
            </h3>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
              Sign in to manage your price alerts
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300"
            >
              Sign In
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 border-r border-t border-zinc-800/50 opacity-60 animate-fade-in stagger-2" />
          <div className="absolute inset-0 grid-bg-animated opacity-20" />
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-3">
              <span className="inline-block animate-fade-up stagger-1">Price</span>
              <br />
              <span className="inline-block text-zinc-600 animate-fade-up stagger-2">Alerts</span>
            </h1>
            <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold border-l-2 border-white pl-4 py-1 max-w-md animate-fade-up stagger-3">
              Get notified when market prices hit your targets
            </p>
          </div>
        </div>

        {/* Create Alert */}
        <div className="animate-fade-up stagger-1 relative z-30">
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full py-3.5 border-2 border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-white flex items-center justify-center gap-2 transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-xs font-black uppercase tracking-widest">
                Create Alert
              </span>
            </button>
          ) : (
            <div className="border border-zinc-800 bg-[#0a0a0a] p-4 space-y-3 relative z-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Search Market
                  </span>
                </div>
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
              <MarketSearchInput
                onSelectMarket={(market) => {
                  setAlertMarket({
                    id: market.id,
                    question: market.question,
                    outcomePrices: market.outcomePrices,
                    yesTokenId: market.yesTokenId,
                    noTokenId: market.noTokenId,
                  });
                  setShowSearch(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Alert Modal */}
        {alertMarket && (
          <CreateAlertModal
            isOpen={true}
            onClose={() => setAlertMarket(null)}
            onCreateAlert={createAlert}
            marketData={{
              conditionId: alertMarket.id,
              question: alertMarket.question,
              yesTokenId: alertMarket.yesTokenId,
              noTokenId: alertMarket.noTokenId,
              yesPrice: alertMarket.outcomePrices?.[0] ?? null,
              noPrice: alertMarket.outcomePrices?.[1] ?? null,
            }}
          />
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-zinc-800/50 p-5 animate-fade-in">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shimmer-bg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 shimmer-bg" />
                    <div className="h-3 w-1/2 shimmer-bg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && alerts.length === 0 && (
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-12 text-center animate-scale-in corner-accent relative overflow-hidden">
            <div className="absolute inset-0 grid-bg-animated opacity-10" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
                <Bell className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">
                No Alerts Yet
              </h3>
              <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
                Search for a market above to create your first alert
              </p>
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="animate-fade-up stagger-1">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 pl-1">
              Active ({activeAlerts.length})
            </h2>
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  question={alert.market_question}
                  outcome={alert.outcome}
                  direction={alert.direction}
                  threshold={alert.threshold}
                  conditionId={alert.condition_id}
                  status="active"
                  onToggle={() => toggleAlert(alert.id)}
                  onDelete={() => deleteAlert(alert.id)}
                  onClick={() => router.push(`/market/${alert.condition_id}?token_id=${alert.token_id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Paused Alerts */}
        {pausedAlerts.length > 0 && (
          <div className="animate-fade-up stagger-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 pl-1">
              Paused ({pausedAlerts.length})
            </h2>
            <div className="space-y-2">
              {pausedAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  question={alert.market_question}
                  outcome={alert.outcome}
                  direction={alert.direction}
                  threshold={alert.threshold}
                  conditionId={alert.condition_id}
                  status="paused"
                  onToggle={() => toggleAlert(alert.id)}
                  onDelete={() => deleteAlert(alert.id)}
                  onClick={() => router.push(`/market/${alert.condition_id}?token_id=${alert.token_id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <div className="animate-fade-up stagger-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 pl-1">
              Triggered ({triggeredAlerts.length})
            </h2>
            <div className="space-y-2">
              {triggeredAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  question={alert.market_question}
                  outcome={alert.outcome}
                  direction={alert.direction}
                  threshold={alert.threshold}
                  conditionId={alert.condition_id}
                  status="triggered"
                  triggeredAt={alert.triggered_at}
                  onDelete={() => deleteAlert(alert.id)}
                  onClick={() => router.push(`/market/${alert.condition_id}?token_id=${alert.token_id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function AlertRow({
  question,
  outcome,
  direction,
  threshold,
  conditionId,
  status,
  triggeredAt,
  onToggle,
  onDelete,
  onClick,
}: {
  question: string | null;
  outcome: string;
  direction: string;
  threshold: number;
  conditionId: string;
  status: "active" | "paused" | "triggered";
  triggeredAt?: string | null;
  onToggle?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}) {
  const thresholdCents = Math.round(threshold * 100);

  return (
    <div
      className={`bg-[#0a0a0a] border p-4 flex items-center gap-3 group transition-all ${
        status === "active"
          ? "border-zinc-800/70 hover:border-zinc-600"
          : status === "paused"
          ? "border-zinc-800/40 opacity-60"
          : "border-zinc-800/40"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${
          status === "triggered"
            ? "border-zinc-600 text-zinc-400"
            : status === "active"
            ? "border-white text-white"
            : "border-zinc-700 text-zinc-600"
        }`}
      >
        {direction === "above" ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="text-[12px] font-bold text-zinc-300 truncate leading-tight">
          {question || "Market"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono font-bold text-zinc-500">
            {outcome} {direction === "above" ? ">" : "<"} {thresholdCents}¢
          </span>
          {status === "triggered" && triggeredAt && (
            <span className="text-[9px] font-mono text-zinc-700">
              {new Date(triggeredAt).toLocaleDateString()}
            </span>
          )}
          {status === "triggered" && (
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <Check className="w-3 h-3 inline" /> Triggered
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {onToggle && status !== "triggered" && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1.5 text-zinc-600 hover:text-white transition-colors"
            title={status === "active" ? "Pause" : "Resume"}
          >
            {status === "active" ? (
              <BellOff className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
