"use client";
//used in filter modal 
interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export const Checkbox = ({ checked, onChange }: CheckboxProps) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
    style={{
      background: checked ? "hsl(var(--accent))" : "transparent",
      border: `1.5px solid ${checked ? "transparent" : "hsl(var(--muted-foreground) / 0.4)"}`,
    }}
  >
    {checked && (
      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
        <path
          d="M1 3.5L3.5 6L8 1"
          stroke="hsl(var(--accent-foreground))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);