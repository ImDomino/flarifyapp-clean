// components/MoveToSafeButton.tsx
"use client";

import { useState } from "react";
import { MoveToSafeModal } from "./MoveToSafeModal";

interface MoveToSafeButtonProps {
  eoaBalance: string;
  onMoved?: () => void; // refresh()
}

export function MoveToSafeButton({ eoaBalance, onMoved }: MoveToSafeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const eoaNum = parseFloat(eoaBalance || "0") || 0;
  const disabled = eoaNum <= 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-medium py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {eoaNum > 0
          ? `Move USDC.e to trading balance`
          : `No USDC.e to move`}
      </button>

      <MoveToSafeModal
        eoaBalance={eoaBalance}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMoved={onMoved}
      />
    </>
  );
}
