// hooks/useBridgeDeposit.ts
"use client";

const BRIDGE_BASE_URL = "https://bridge.polymarket.com";

export function useBridgeDeposit(polymarketAddress: string | null) {
  const createDeposit = async () => {
    if (!polymarketAddress) throw new Error("No Polymarket address");
    const res = await fetch(`${BRIDGE_BASE_URL}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: polymarketAddress }),
    });
    if (!res.ok) throw new Error("Failed to create deposit");
    return res.json(); // { address: { evm, svm, btc }, note: ... } [web:226]
  };

  const getStatus = async (depositAddress: string) => {
    const res = await fetch(`${BRIDGE_BASE_URL}/status/${depositAddress}`);
    if (!res.ok) throw new Error("Failed to get status");
    return res.json(); // { transactions: [...] } [web:182]
  };

  return { createDeposit, getStatus };
}
