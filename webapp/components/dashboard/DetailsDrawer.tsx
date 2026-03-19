"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Github, Linkedin, FileText, Phone, Mail, Star, Users } from "lucide-react";
import { Team } from "./TeamsTable";

interface ParticipantScores {
  githubScore?: number;
  linkedinScore?: number;
  resumeScore?: number;
}

interface DetailsDrawerProps {
  team: Team | null;
  onClose: () => void;
}

const SOURCE_CONFIG = {
  github: {
    icon: <Github className="w-3.5 h-3.5" />,
    label: "github/>",
    color: "hsl(220, 15%, 65%)",
    ring: "hsl(220, 20%, 40%)",
    bg: "hsl(220, 15%, 11%)",
  },
  linkedin: {
    icon: <Linkedin className="w-3.5 h-3.5" />,
    label: "linkedin/>",
    color: "hsl(210, 70%, 58%)",
    ring: "hsl(210, 60%, 38%)",
    bg: "hsl(210, 40%, 10%)",
  },
  resume: {
    icon: <FileText className="w-3.5 h-3.5" />,
    label: "resume/>",
    color: "hsl(270, 50%, 65%)",
    ring: "hsl(270, 45%, 40%)",
    bg: "hsl(270, 30%, 10%)",
  },
};

// ── Circle score badge ───────────────────────────────────────────────────────
function ScoreCircle({ score, color, ring }: { score?: number; color: string; ring: string }) {
  const hasScore = score !== undefined;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono tabular-nums"
      style={{
        border: `2px solid ${hasScore ? ring : "hsl(var(--border) / 0.3)"}`,
        color: hasScore ? color : "hsl(var(--muted-foreground) / 0.3)",
        background: hasScore ? "hsl(var(--muted) / 0.2)" : "transparent",
      }}
    >
      {hasScore ? score : "—"}
    </div>
  );
}

// ── Source row: icon + username/label + circle ──────────────────────────────
function SourceRow({
  source,
  score,
  href,
  username,
  contained = false,
}: {
  source: keyof typeof SOURCE_CONFIG;
  score?: number;
  href?: string;
  username?: string;
  contained?: boolean;
}) {
  const cfg = SOURCE_CONFIG[source];

  const inner = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0" style={{ color: cfg.color }}>{cfg.icon}</span>
        <span
          className="text-xs font-mono truncate"
          style={{ color: username ? cfg.color : "hsl(var(--muted-foreground) / 0.4)" }}
        >
          {username ?? cfg.label}
        </span>
      </div>
      <ScoreCircle score={score} color={cfg.color} ring={cfg.ring} />
    </div>
  );

  const wrapStyle = contained
    ? { background: cfg.bg, border: `1px solid ${cfg.ring}22` }
    : {};
  const wrapClass = contained ? "px-3 py-2 rounded-lg" : "py-1.5";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${wrapClass} transition-opacity`}
        style={wrapStyle}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className={wrapClass} style={wrapStyle}>
      {inner}
    </div>
  );
}

// ── Contact row ──────────────────────────────────────────────────────────────
function ContactRow({ icon, value, href }: { icon: React.ReactNode; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground truncate">{value}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">{content}</a>;
  return content;
}

// ── Drawer ───────────────────────────────────────────────────────────────────
export default function DetailsDrawer({ team, onClose }: DetailsDrawerProps) {
  return (
    <AnimatePresence>
      {team && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "hsl(0 0% 0% / 0.35)" }}
          />

          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-100 z-50 flex flex-col overflow-hidden"
            style={{
              background: "hsl(var(--background))",
              borderLeft: "1px solid hsl(var(--border) / 0.6)",
              boxShadow: "-8px 0 40px hsl(0 0% 0% / 0.3)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Team Details</p>
                <h2 className="text-base font-bold font-mono text-foreground">{team.teamName}</h2>
              </div>
              <div className="flex items-center gap-3">
                {team.totalScore !== undefined && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "hsl(var(--accent) / 0.1)", border: "1px solid hsl(var(--accent) / 0.25)" }}>
                    <Star className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: "hsl(var(--accent))" }}>
                      {team.totalScore}
                    </span>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 px-5 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.3)", background: "hsl(var(--muted) / 0.12)" }}>
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{team.participant.length}</span> members
              </span>
            </div>

            {/* Members */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {team.participant.map((p, i) => {
                const scores = p as typeof p & ParticipantScores;
                return (
                  <motion.div
                    key={p.participantId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "hsl(var(--muted) / 0.18)",
                      border: "1px solid hsl(var(--border) / 0.4)",
                    }}
                  >
                    {/* Member info */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                        style={{
                          background: `hsl(${210 + (i * 55) % 150}, 40%, 16%)`,
                          border: `1px solid hsl(${210 + (i * 55) % 150}, 40%, 26%)`,
                          color: `hsl(${210 + (i * 55) % 150}, 60%, 62%)`,
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + contacts */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <ContactRow icon={<Mail className="w-3 h-3" />} value={p.email} href={`mailto:${p.email}`} />
                        {p.phNumber && (
                          <ContactRow icon={<Phone className="w-3 h-3" />} value={p.phNumber} />
                        )}
                      </div>
                    </div>

                    {/* Source scores */}
                    <div className="flex flex-col gap-1.5 px-4 pb-3"
                      style={{ borderTop: "1px solid hsl(var(--border) / 0.2)", paddingTop: "10px" }}>
                      <SourceRow
                        source="github"
                        score={scores.githubScore}
                        href={p.githubUsername ? `https://github.com/${p.githubUsername}` : undefined}
                        username={p.githubUsername ? `@${p.githubUsername}` : undefined}
                      />
                      <SourceRow
                        source="linkedin"
                        score={scores.linkedinScore}
                        href={p.linkedInURL || undefined}
                        username={p.linkedInURL ? p.linkedInURL.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "") : undefined}
                      />
                      <SourceRow
                        source="resume"
                        score={scores.resumeScore}
                        href={p.resumeURL || undefined}
                        contained
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}