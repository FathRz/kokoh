"use client";

import { useRef } from "react";

interface Props {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function formatIDR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

export default function CurrencyInput({ value, onChange, placeholder = "0", className = "", disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Keep cursor roughly stable after reformatting
    const el = e.currentTarget;
    const oldFormatted = el.value;
    const raw = oldFormatted.replace(/\D/g, "");
    const newFormatted = formatIDR(raw);
    // Adjust cursor: count how many digits are left of the cursor in the old string,
    // then find that same digit position in the new string.
    const cursorBefore = el.selectionStart ?? oldFormatted.length;
    const digitsBeforeCursor = oldFormatted.slice(0, cursorBefore).replace(/\D/g, "").length;
    onChange(raw);
    // Restore cursor after React re-render (via rAF)
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let digitCount = 0;
      let pos = 0;
      for (pos = 0; pos < newFormatted.length; pos++) {
        if (/\d/.test(newFormatted[pos])) digitCount++;
        if (digitCount === digitsBeforeCursor) { pos++; break; }
      }
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none z-10">
        Rp
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={formatIDR(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-10 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent ${disabled ? "bg-gray-50 text-gray-400" : ""} ${className}`}
      />
    </div>
  );
}
