"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Star, Users, CheckCircle2, XCircle,
  Sparkles, ChevronDown, Github, Briefcase, GraduationCap,
} from "lucide-react";
import { Team } from "./TeamsTable";

interface MemberSummary {
  name: string;
  summary: string;
  skills: string[];
  projects: string[];
  education: string | null;
  experience: string | null;
  qualities: string[];
  github_highlights: string[];
  hackathon_ready: boolean;
}

interface TeamSummaryData {
  team_name: string;
  team_summary: string;
  strengths: string[];
  weaknesses: string[];
  selection_verdict: string;
  members: MemberSummary[];
}

interface SummaryDrawerProps {
  team: Team | null;
  onClose: () => void;
}

const PIPELINE_BASE = process.env.NEXT_PUBLIC_PIPELINE_URL ?? "http://localhost:8000";

function MemberCard({ member, index }: { member: MemberSummary; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: "hsl(var(--muted) / 0.18)",
        border: "1px solid hsl(var(--border) / 0.4)",
      }}
    >
      {/* Member header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
          style={{
            background: `hsl(${210 + (index * 55) % 150}, 40%, 16%)`,
            border: `1px solid hsl(${210 + (index * 55) % 150}, 40%, 26%)`,
            color: `hsl(${210 + (index * 55) % 150}, 60%, 62%)`,
          }}
        >
          {member.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
            <div className="flex items-center gap-2 shrink-0">
              {/* Hackathon ready badge */}
              {member.hackathon_ready ? (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: "hsl(143, 60%, 50% / 0.1)",
                    border: "1px solid hsl(143, 60%, 50% / 0.3)",
                    color: "hsl(143, 60%, 50%)",
                  }}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Ready
                </span>
              ) : (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: "hsl(var(--destructive) / 0.1)",
                    border: "1px solid hsl(var(--destructive) / 0.3)",
                    color: "hsl(var(--destructive))",
                  }}
                >
                  <XCircle className="w-2.5 h-2.5" />
                  Not ready
                </span>
              )}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.18 }}
              >
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{member.summary}</p>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 flex flex-col gap-3"
              style={{ borderTop: "1px solid hsl(var(--border) / 0.2)", paddingTop: "12px" }}
            >
              {/* Skills */}
              {member.skills.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                        style={{
                          background: "hsl(var(--muted) / 0.4)",
                          border: "1px solid hsl(var(--border) / 0.5)",
                          color: "hsl(var(--foreground) / 0.8)",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education + Experience */}
              <div className="flex flex-col gap-1.5">
                {member.education && (
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">{member.education}</p>
                  </div>
                )}
                {member.experience && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">{member.experience}</p>
                  </div>
                )}
              </div>

              {/* Projects */}
              {member.projects.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Projects</p>
                  {member.projects.map((proj) => (
                    <div key={proj} className="flex items-start gap-1.5">
                      <span className="text-muted-foreground/40 mt-0.5 shrink-0">▸</span>
                      <p className="text-[10px] text-muted-foreground">{proj}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* GitHub highlights */}
              {member.github_highlights.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                    <Github className="w-2.5 h-2.5" /> GitHub
                  </p>
                  {member.github_highlights.map((h) => (
                    <div key={h} className="flex items-start gap-1.5">
                      <span className="text-muted-foreground/40 mt-0.5 shrink-0">▸</span>
                      <p className="text-[10px] text-muted-foreground">{h}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Qualities */}
              {member.qualities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {member.qualities.map((q) => (
                    <span
                      key={q}
                      className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "hsl(var(--accent) / 0.08)",
                        border: "1px solid hsl(var(--accent) / 0.2)",
                        color: "hsl(var(--accent) / 0.8)",
                      }}
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SummaryDrawer({ team, onClose }: SummaryDrawerProps) {
  const [summary, setSummary] = useState<TeamSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) return;
    setSummary(null);
    setError(null);
    setLoading(true);

    fetch(`${PIPELINE_BASE}/summary/${team.teamId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.summary) setSummary(json.summary);
        else setError("No summary available. Run the pipeline first.");
      })
      .catch(() => setError("Could not reach the pipeline server."))
      .finally(() => setLoading(false));
  }, [team?.teamId]);

  return (
    <AnimatePresence>
      {team && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "hsl(0 0% 0% / 0.35)" }}
          />

          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-[420px] z-50 flex flex-col overflow-hidden"
            style={{
              background: "hsl(var(--background))",
              borderLeft: "1px solid hsl(var(--border) / 0.6)",
              boxShadow: "-8px 0 40px hsl(0 0% 0% / 0.3)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
            >
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  AI Summary
                </p>
                <h2 className="text-base font-bold font-mono text-foreground">{team.teamName}</h2>
              </div>
              <div className="flex items-center gap-3">
                {team.teamResult?.teamScore !== undefined && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: "hsl(var(--accent) / 0.1)",
                      border: "1px solid hsl(var(--accent) / 0.25)",
                    }}
                  >
                    <Star className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: "hsl(var(--accent))" }}>
                      {(team.teamResult.teamScore * 100).toFixed(1)}
                    </span>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div
              className="flex items-center gap-2 px-5 py-2.5 shrink-0"
              style={{
                borderBottom: "1px solid hsl(var(--border) / 0.3)",
                background: "hsl(var(--muted) / 0.12)",
              }}
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{team.participant.length}</span> members
              </span>
              {team.teamResult?.level && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      color: team.teamResult.level === "Advanced"
                        ? "hsl(var(--accent))"
                        : team.teamResult.level === "Intermediate"
                        ? "hsl(45, 90%, 55%)"
                        : "hsl(200, 80%, 55%)",
                      background: team.teamResult.level === "Advanced"
                        ? "hsl(var(--accent) / 0.1)"
                        : team.teamResult.level === "Intermediate"
                        ? "hsl(45, 90%, 55% / 0.1)"
                        : "hsl(200, 80%, 55% / 0.1)",
                      border: `1px solid ${team.teamResult.level === "Advanced"
                        ? "hsl(var(--accent) / 0.3)"
                        : team.teamResult.level === "Intermediate"
                        ? "hsl(45, 90%, 55% / 0.3)"
                        : "hsl(200, 80%, 55% / 0.3)"}`,
                    }}
                  >
                    {team.teamResult.level}
                  </span>
                </>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

              {/* Loading */}
              {loading && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 rounded-full border-2 border-current border-t-transparent"
                    style={{ color: "hsl(var(--accent))" }}
                  />
                  <p className="text-xs text-muted-foreground">Fetching AI summary...</p>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              )}

              {/* Summary content */}
              {!loading && summary && (
                <>
                  {/* Team overview */}
                  <div
                    className="rounded-xl p-4 flex flex-col gap-2"
                    style={{
                      background: "hsl(var(--muted) / 0.2)",
                      border: "1px solid hsl(var(--border) / 0.4)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Overview
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{summary.team_summary}</p>
                  </div>

                  {/* Verdict */}
                  <div
                    className="rounded-xl p-4 flex flex-col gap-2"
                    style={{
                      background: "hsl(var(--accent) / 0.08)",
                      border: "1px solid hsl(var(--accent) / 0.25)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Verdict
                      </p>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{summary.selection_verdict}</p>
                  </div>

                  {/* Strengths + Weaknesses */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Strengths */}
                    <div
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{
                        background: "hsl(143, 60%, 50% / 0.06)",
                        border: "1px solid hsl(143, 60%, 50% / 0.2)",
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: "hsl(143, 60%, 50%)" }}>
                        Strengths
                      </p>
                      {summary.strengths.map((s) => (
                        <div key={s} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "hsl(143, 60%, 50%)" }} />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>

                    {/* Weaknesses */}
                    <div
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{
                        background: "hsl(var(--destructive) / 0.06)",
                        border: "1px solid hsl(var(--destructive) / 0.2)",
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: "hsl(var(--destructive))" }}>
                        Weaknesses
                      </p>
                      {summary.weaknesses.map((w) => (
                        <div key={w} className="flex items-start gap-1.5">
                          <XCircle className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ color: "hsl(var(--destructive))" }} />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Members */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Members
                    </p>
                    {summary.members.map((member, i) => (
                      <MemberCard key={member.name} member={member} index={i} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}