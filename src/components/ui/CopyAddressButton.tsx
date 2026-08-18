"use client";

import { useState } from "react";

type CopyAddressButtonProps = {
  address: string;
};

export function CopyAddressButton({ address }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      if (!navigator.clipboard) {
        window.prompt("주소를 복사해 주세요.", address);
        return;
      }
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("주소를 복사해 주세요.", address);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
    >
      {copied ? "복사됨" : "주소 복사"}
    </button>
  );
}
