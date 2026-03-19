/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCompare, X, Star, ChevronRight } from "lucide-react";
import { Team } from "./TeamsTable";

interface ComparePanelProps {
  teams: Team[];
  onClose: () => void;
}

interface ComparisonResult {
  winner: string;
  reasons: string[];
  rankings: { teamName: string; summary: string }[];
}

function generatePlaceholder(teams: Team[]): ComparisonResult {
  const sorted = [...teams].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  const winner = sorted[0]?.teamName ?? teams[0]?.teamName;

  return {
    winner,
    reasons: [
      `${winner} has the highest combined team score across all evaluation criteria.`,
      "Strong GitHub contribution history and active open-source presence among members.",
      "Resume analysis indicates a well-balanced mix of beginner, intermediate and expert skill levels.",
    ],
    rankings: sorted.map((t, i) => ({
      teamName: t.teamName,
      summary:
        i === 0
          ? "Top-ranked team with highest overall score and strongest technical profile."
          : i === sorted.length - 1
          ? "Lowest-scoring team in this comparison; consider reviewing member skill distribution."
          : `Mid-tier team with ${t.participant.length} members; competitive but trailing the leader.`,
    })),
  };
}

export default function ComparePanel({ teams, onClose }: ComparePanelProps) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const prevKey = useRef("");

  // Re-generate whenever the set of checked teams changes
  const key = teams.map((t) => t.teamId).sort().join(",");
  useEffect(() => {
    if (key === prevKey.current) return;
    prevKey.current = key;
    if (teams.length >= 2) {
      // Small artificial delay so the panel feels responsive
      setResult(null);
      const t = setTimeout(() => setResult(generatePlaceholder(teams)), 600);
      return () => clearTimeout(t);
    } else {
      setResult(null);
    }
  }, [key]);

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-[340px] z-40 flex flex-col overflow-hidden"
      style={{
        background: "hsl(var(--background))",
        borderLeft: "1px solid hsl(var(--border) / 0.6)",
        boxShadow: "-8px 0 40px hsl(0 0% 0% / 0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-sm font-semibold text-foreground">Comparison</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Selected teams chips */}
      <div className="px-5 py-3 shrink-0 flex flex-wrap gap-2" style={{ borderBottom: "1px solid hsl(var(--border) / 0.3)" }}>
        {teams.length === 0 ? (
          <p className="text-xs text-muted-foreground">Check teams from the list to compare</p>
        ) : (
          teams.map((t) => (
            <span key={t.teamId} className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: "hsl(var(--accent) / 0.1)", border: "1px solid hsl(var(--accent) / 0.3)", color: "hsl(var(--accent))" }}>
              {t.teamName}
            </span>
          ))
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {teams.length < 2 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <GitCompare className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select at least 2 teams to compare</p>
          </div>
        )}

        {teams.length >= 2 && !result && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <motion.div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--accent))" }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </motion.div>
            <p className="text-xs text-muted-foreground">Comparing teams…</p>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
              {/* Winner card */}
              <div className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: "hsl(var(--accent) / 0.08)", border: "1px solid hsl(var(--accent) / 0.25)" }}>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Best Team</span>
                </div>
                <p className="text-base font-bold text-foreground font-mono">{result.winner}</p>
                <ul className="flex flex-col gap-1.5 mt-1">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Rankings */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Rankings</p>
                {result.rankings.map((r, i) => (
                  <motion.div key={r.teamName} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "hsl(var(--muted) / 0.25)", border: "1px solid hsl(var(--border) / 0.4)" }}>
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                      style={{
                        background: i === 0 ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
                        color: i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                        border: i === 0 ? "1px solid hsl(var(--accent) / 0.3)" : "1px solid hsl(var(--border))",
                      }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{r.teamName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.summary}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}