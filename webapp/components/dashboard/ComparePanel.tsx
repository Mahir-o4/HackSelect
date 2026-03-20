"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCompare, X, Star, ChevronRight, Loader2 } from "lucide-react";
import { Team } from "./TeamsTable";

interface ComparePanelProps {
  teams: Team[];
  onClose: () => void;
}

interface DimensionComparison {
  dimension: string;
  team_a: string;
  team_b: string;
  edge: "team_a" | "team_b" | "tie";
}

interface CompareResult {
  team_a_id: string;
  team_b_id: string;
  team_a_name: string | null;
  team_b_name: string | null;
  dimensions: DimensionComparison[];
  overall_summary: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
}

const confidenceColor = {
  high: "hsl(143, 60%, 50%)",
  medium: "hsl(45, 90%, 55%)",
  low: "hsl(var(--destructive))",
};

export default function ComparePanel({ teams, onClose }: ComparePanelProps) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevKey = useRef("");

  const key = teams.map((t) => t.teamId).sort().join(",");

  useEffect(() => {
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (teams.length !== 2) {
      setResult(null);
      setError(null);
      return;
    }

    const [teamA, teamB] = teams;
    setResult(null);
    setError(null);
    setLoading(true);

    fetch(`http://localhost:8000/compare/?team=${teamA.teamId}&compare=${teamB.teamId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.detail) {
          setError(json.detail);
        } else {
          setResult(json);
        }
      })
      .catch(() => setError("Could not reach the pipeline server."))
      .finally(() => setLoading(false));
  }, [key]);

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-[360px] z-40 flex flex-col overflow-hidden"
      style={{
        background: "hsl(var(--background))",
        borderLeft: "1px solid hsl(var(--border) / 0.6)",
        boxShadow: "-8px 0 40px hsl(0 0% 0% / 0.25)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
      >
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-sm font-semibold text-foreground">Comparison</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Team chips */}
      <div
        className="px-5 py-3 shrink-0 flex flex-wrap gap-2"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.3)" }}
      >
        {teams.length === 0 ? (
          <p className="text-xs text-muted-foreground">Check teams from the list to compare</p>
        ) : (
          teams.map((t) => (
            <span
              key={t.teamId}
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "hsl(var(--accent) / 0.1)",
                border: "1px solid hsl(var(--accent) / 0.3)",
                color: "hsl(var(--accent))",
              }}
            >
              {t.teamName}
            </span>
          ))
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* Not enough teams */}
        {teams.length < 2 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <GitCompare className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select exactly 2 teams to compare</p>
          </div>
        )}

        {/* More than 2 */}
        {teams.length > 2 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <GitCompare className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Select exactly 2 teams — you have {teams.length} checked</p>
          </div>
        )}

        {/* Loading */}
        {teams.length === 2 && loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(var(--accent))" }} />
            <p className="text-xs text-muted-foreground">Comparing teams...</p>
          </div>
        )}

        {/* Error */}
        {teams.length === 2 && !loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>{error}</p>
            <p className="text-[10px] text-muted-foreground">Make sure the pipeline has run for both teams.</p>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5"
            >
              {/* Confidence */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Confidence
                </span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    color: confidenceColor[result.confidence],
                    background: `${confidenceColor[result.confidence].replace(")", " / 0.1)").replace("hsl(", "hsl(")}`,
                    border: `1px solid ${confidenceColor[result.confidence].replace(")", " / 0.3)").replace("hsl(", "hsl(")}`,
                  }}
                >
                  {result.confidence}
                </span>
              </div>

              {/* Recommendation */}
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{
                  background: "hsl(var(--accent) / 0.08)",
                  border: "1px solid hsl(var(--accent) / 0.25)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Recommendation
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{result.recommendation}</p>
              </div>

              {/* Overall summary */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Summary
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.overall_summary}</p>
              </div>

              {/* Dimensions */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Breakdown
                </p>
                {result.dimensions.map((d, i) => {
                  const edgeA = d.edge === "team_a";
                  const edgeB = d.edge === "team_b";
                  const tie = d.edge === "tie";
                  return (
                    <motion.div
                      key={d.dimension}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-lg p-3 flex flex-col gap-2"
                      style={{
                        background: "hsl(var(--muted) / 0.25)",
                        border: "1px solid hsl(var(--border) / 0.4)",
                      }}
                    >
                      {/* Dimension header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-foreground">{d.dimension}</span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            background: tie
                              ? "hsl(var(--muted))"
                              : "hsl(var(--accent) / 0.1)",
                            color: tie
                              ? "hsl(var(--muted-foreground))"
                              : "hsl(var(--accent))",
                            border: `1px solid ${tie ? "hsl(var(--border))" : "hsl(var(--accent) / 0.3)"}`,
                          }}
                        >
                          {tie ? "tie" : edgeA ? result.team_a_name ?? "Team A" : result.team_b_name ?? "Team B"}
                        </span>
                      </div>

                      {/* Team A */}
                      <div className="flex items-start gap-2">
                        <span
                          className="text-[9px] font-bold shrink-0 mt-0.5 px-1 py-0.5 rounded"
                          style={{
                            background: edgeA ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
                            color: edgeA ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          A
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{d.team_a}</p>
                      </div>

                      {/* Team B */}
                      <div className="flex items-start gap-2">
                        <span
                          className="text-[9px] font-bold shrink-0 mt-0.5 px-1 py-0.5 rounded"
                          style={{
                            background: edgeB ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
                            color: edgeB ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          B
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{d.team_b}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}