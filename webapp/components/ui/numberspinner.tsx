"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

interface NumberSpinnerProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  accent?: boolean;
}

export const NumberSpinner = ({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  accent = false,
}: NumberSpinnerProps) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label
        className="text-[10px] font-semibold"
        style={{
          color: accent ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
    )}

    <div
      className="flex items-stretch rounded-lg overflow-hidden"
      style={{
        border: "1px solid hsl(var(--border))",
        background: "hsl(var(--background))",
      }}
    >
      {/* Input — native spinners hidden via no-spinner class */}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))
        }
        className="no-spinner flex-1 px-3 py-2 text-sm font-semibold outline-none bg-transparent min-w-0"
        style={{ color: "hsl(var(--foreground))" }}
      />

      {/* Stacked ▲ ▼ */}
      <div
        className="flex flex-col shrink-0"
        style={{ borderLeft: "1px solid hsl(var(--border))", width: "24px" }}
      >
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex-1 flex items-center justify-center transition-all duration-100"
          style={{ color: "hsl(var(--muted-foreground))", background: "transparent", borderBottom: "1px solid hsl(var(--border))" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent) / 0.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--accent))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <ChevronUp className="w-3 h-3" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex-1 flex items-center justify-center transition-all duration-100"
          style={{ color: "hsl(var(--muted-foreground))", background: "transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent) / 0.12)";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--accent))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  </div>
);