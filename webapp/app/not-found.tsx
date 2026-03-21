"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function DigitWithHand({
  digit,
  phase = 0,
}: {
  digit: string;
  phase?: number;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={{ y: phase === 0 ? [0, -22, 0] : [0, 22, 0] }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Digit */}
      <span
        className="font-mono font-bold select-none leading-none"
        style={{
          fontSize: "clamp(7rem, 18vw, 14rem)",
          color: "hsl(var(--foreground))",
          letterSpacing: "-0.05em",
          textShadow: "0 0 80px hsl(93 100% 50% / 0.12)",
        }}
      >
        {digit}
      </span>

      {/* Hand */}
      <span
        style={{
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          display: "block",
          lineHeight: 1,
          filter: "drop-shadow(0 0 18px hsl(93 100% 50% / 0.35))",
        }}
      >
        🫴🏻
      </span>
    </motion.div>
  );
}

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-12 px-6"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Digits row */}
      <div className="flex items-end gap-4 md:gap-8">
        <DigitWithHand digit="6" phase={0} />
        <DigitWithHand digit="7" phase={1} />
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p
          className="font-mono font-semibold text-sm uppercase tracking-widest"
          style={{ color: "hsl(93 100% 50%)" }}
        >
          Page not found
        </p>
      </div>

      {/* Back home */}
      <Link
        href="/"
        className="font-mono text-sm px-6 py-2.5 rounded-xl border transition-all duration-200"
        style={{
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--muted-foreground))",
        }}
        onMouseEnter={(e) => {
          const a = e.currentTarget;
          a.style.borderColor = "hsl(93 100% 50% / 0.5)";
          a.style.color = "hsl(93 100% 50%)";
          a.style.background = "hsl(93 100% 50% / 0.06)";
        }}
        onMouseLeave={(e) => {
          const a = e.currentTarget;
          a.style.borderColor = "hsl(var(--border))";
          a.style.color = "hsl(var(--muted-foreground))";
          a.style.background = "";
        }}
      >
        ← back to home
      </Link>
    </div>
  );
}