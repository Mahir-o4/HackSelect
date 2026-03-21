"use client";

import { useState, useRef, useCallback } from "react";
import { Github, FileText, Users, ArrowLeft, Check, Loader2 } from "lucide-react";
import { NumberSpinner } from "@/components/ui/numberspinner";
import { toast } from "sonner";

export interface FieldsData {
  sources: { github: boolean; resume: boolean };
  totalTeams: number;
  quotas: { beginner: number; intermediate: number; expert: number };
  selectedTeamIds: string[];
}

interface Props {
  hackathonId: string;
  mode?: "full" | "recluster" | "reselect";
  onNext: (data: FieldsData) => void;
  onBack?: () => void;
}

const CheckRow = ({
  checked, onChange, icon, label, description,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  icon: React.ReactNode; label: string; description: string;
}) => (
  <div
    role="checkbox"
    aria-checked={checked}
    tabIndex={0}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") onChange(!checked); }}
    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer select-none"
    style={{
      background: checked ? "hsl(var(--accent) / 0.08)" : "transparent",
      border: `1px solid ${checked ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border))"}`,
    }}
  >
    <div
      className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
      style={{
        background: checked ? "hsl(var(--accent))" : "transparent",
        border: checked ? "1.5px solid hsl(var(--accent))" : "1.5px solid hsl(var(--muted-foreground) / 0.4)",
      }}
    >
      {checked && <Check className="w-2.5 h-2.5" style={{ color: "hsl(var(--accent-foreground))" }} />}
    </div>
    <div
      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
      style={{
        background: checked ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
        color: checked ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium" style={{ color: checked ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
        {label}
      </div>
      <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {description}
      </div>
    </div>
  </div>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-semibold whitespace-nowrap"
        style={{ color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
    </div>
    {children}
  </div>
);

function QuotaSlider({ thumbA, thumbB, onChangeA, onChangeB }: {
  thumbA: number; thumbB: number;
  onChangeA: (v: number) => void; onChangeB: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const snap = (raw: number, min: number, max: number) =>
    Math.round(Math.min(max, Math.max(min, raw)) / 10) * 10;

  const pctFromEvent = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  const startDrag = useCallback((thumb: "A" | "B") => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const move = (ev: MouseEvent | TouchEvent) => {
      const x = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const pct = pctFromEvent(x);
      if (thumb === "A") onChangeA(snap(pct, 0, thumbB - 10));
      else onChangeB(snap(pct, thumbA + 10, 100));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  }, [thumbA, thumbB, onChangeA, onChangeB]);

  const C = {
    beginner: "hsl(200, 80%, 55%)",
    intermediate: "hsl(45, 90%, 55%)",
    expert: "hsl(var(--accent))",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-xs font-semibold">
        <span style={{ color: C.beginner }}>Beginner</span>
        <span style={{ color: C.intermediate }}>Intermediate</span>
        <span style={{ color: C.expert }}>Expert</span>
      </div>
      <div ref={trackRef} className="relative h-3 rounded-full select-none" style={{ background: "hsl(var(--muted))" }}>
        <div className="absolute inset-y-0 rounded-l-full" style={{ left: 0, width: `${thumbA}%`, background: C.beginner }} />
        <div className="absolute inset-y-0" style={{ left: `${thumbA}%`, width: `${thumbB - thumbA}%`, background: C.intermediate }} />
        <div className="absolute inset-y-0 rounded-r-full" style={{ left: `${thumbB}%`, right: 0, background: C.expert }} />
        <div
          onMouseDown={startDrag("A")} onTouchStart={startDrag("A")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-grab active:cursor-grabbing z-10"
          style={{
            left: `${thumbA}%`,
            background: "hsl(var(--background))",
            border: `2.5px solid ${C.beginner}`,
            boxShadow: `0 0 0 3px hsl(200 80% 55% / 0.2), 0 2px 8px hsl(0 0% 0% / 0.5)`,
          }}
        />
        <div
          onMouseDown={startDrag("B")} onTouchStart={startDrag("B")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full cursor-grab active:cursor-grabbing z-10"
          style={{
            left: `${thumbB}%`,
            background: "hsl(var(--background))",
            border: `2.5px solid ${C.intermediate}`,
            boxShadow: `0 0 0 3px hsl(45 90% 55% / 0.2), 0 2px 8px hsl(0 0% 0% / 0.5)`,
          }}
        />
      </div>
      <div className="flex justify-between">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
          <div key={v} className="flex flex-col items-center gap-0.5">
            <div className="w-px h-1.5" style={{ background: "hsl(var(--border))" }} />
            <span className="text-[8px] font-mono" style={{ color: "hsl(var(--muted-foreground) / 0.45)" }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-mono font-semibold">
        <span style={{ color: C.beginner }}>{thumbA}%</span>
        <span style={{ color: C.intermediate }}>{thumbB - thumbA}%</span>
        <span style={{ color: C.expert }}>{100 - thumbB}%</span>
      </div>
    </div>
  );
}

export const FilterModal = ({ hackathonId, mode = "full", onNext, onBack }: Props) => {
  // recluster → start at step 1, reselect → start at step 2, full → start at step 1
  const [step, setStep] = useState<1 | 2>(mode === "reselect" ? 2 : 1);

  const [sources, setSources] = useState({ github: true, resume: false });
  const [clustering, setClustering] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const [totalTeams, setTotalTeams] = useState(20);
  const [thumbA, setThumbA] = useState(30);
  const [thumbB, setThumbB] = useState(70);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [autoSelectError, setAutoSelectError] = useState<string | null>(null);

  const PIPELINE_BASE = process.env.NEXT_PUBLIC_PIPELINE_URL ?? "http://localhost:8000";

  const beginnerPct = thumbA;
  const intermediatePct = thumbB - thumbA;
  const expertPct = 100 - thumbB;

  const beginnerCount = Math.floor((beginnerPct / 100) * totalTeams);
  const intermediateCount = Math.floor((intermediatePct / 100) * totalTeams);
  const expertCount = totalTeams - beginnerCount - intermediateCount; // remainder goes to expert

  const quotas = {
    beginner: beginnerCount,
    intermediate: intermediateCount,
    expert: expertCount,
  };

  console.log(quotas)

  const getClusterPayload = () => {
    const both = sources.github && sources.resume;
    const githubOnly = sources.github && !sources.resume;
    const resumeOnly = !sources.github && sources.resume;
    return {
      filter_mode: both ? "both" : githubOnly ? "github" : "resume",
      weights: {
        github: both ? 0.7 : githubOnly ? 1.0 : 0.0,
        resume: both ? 0.3 : resumeOnly ? 1.0 : 0.0,
      },
    };
  };

  const handleStartClustering = async () => {
    setClustering(true);
    setClusterError(null);
    try {
      const payload = getClusterPayload();
      const res = await fetch(`${PIPELINE_BASE}/teams/cluster/${hackathonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setClusterError(json?.detail ?? "Clustering failed. Please try again.");
        return;
      }
      // recluster mode → done after clustering, no autoselect
      if (mode === "recluster") {
        toast.success("Re-clustering complete! Run Re-selection to update team scores.", {
          duration: 5000,
          description: "Go to Modify → Re-selection to apply the new cluster results.",
        });
        onBack?.();
        return;
      }
      setStep(2);
    } catch {
      setClusterError("Could not reach the pipeline server.");
    } finally {
      setClustering(false);
    }
  };

  const handleAutoSelect = async () => {
    setAutoSelecting(true);
    setAutoSelectError(null);
    try {
      const res = await fetch(`${PIPELINE_BASE}/teams/${hackathonId}/autoselect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_teams: totalTeams,
          beginner_pct: beginnerPct / 100,
          intermediate_pct: intermediatePct / 100,
          advanced_pct: expertPct / 100,
        }),
      });

      console.log(res.body)
      const json = await res.json();
      if (!res.ok) {
        setAutoSelectError(json?.detail ?? "Auto-select failed. Please try again.");
        return;
      }
      onNext({
        sources,
        totalTeams,
        quotas,
        selectedTeamIds: json.selected.map((t: { teamId: string }) => t.teamId),
      });
    } catch {
      setAutoSelectError("Could not reach the pipeline server.");
    } finally {
      setAutoSelecting(false);
    }
  };

  const canCluster = sources.github || sources.resume;

  return (
    <div className="flex flex-col gap-5 px-6 py-5">

      {/* ── STEP 1: Data Sources — shown in full + recluster mode ── */}
      {step === 1 && (
        <>
          <Section label="Data Sources">
            <div className="flex flex-col gap-2">
              <CheckRow
                checked={sources.github}
                onChange={(v) => setSources((s) => ({ ...s, github: v }))}
                icon={<Github className="w-3.5 h-3.5" />}
                label="GitHub"
                description="Analyze repositories, commits & contributions"
              />
              <CheckRow
                checked={sources.resume}
                onChange={(v) => setSources((s) => ({ ...s, resume: v }))}
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Resume"
                description="Parse uploaded PDF / DOCX resumes"
              />
            </div>
          </Section>

          {/* Weight preview */}
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <span className="text-xs text-muted-foreground flex-1">Scoring weights</span>
            <span className="text-xs font-mono" style={{ color: "hsl(200, 80%, 55%)" }}>
              GH {sources.github && sources.resume ? "0.7" : sources.github ? "1.0" : "0.0"}
            </span>
            <span className="text-muted-foreground/30 text-xs">·</span>
            <span className="text-xs font-mono" style={{ color: "hsl(270, 50%, 65%)" }}>
              RS {sources.github && sources.resume ? "0.3" : sources.resume ? "1.0" : "0.0"}
            </span>
          </div>

          {clusterError && (
            <p className="text-xs px-1" style={{ color: "hsl(var(--destructive))" }}>{clusterError}</p>
          )}

          <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
                style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border) / 0.6)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"; }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : <div />}

            <button
              disabled={!canCluster || clustering}
              onClick={handleStartClustering}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: canCluster && !clustering ? "hsl(var(--accent))" : "hsl(var(--muted))",
                color: canCluster && !clustering ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
                cursor: canCluster && !clustering ? "pointer" : "not-allowed",
                boxShadow: canCluster && !clustering ? "0 0 20px hsl(var(--accent) / 0.25)" : "none",
              }}
            >
              {clustering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {clustering
                ? "Clustering..."
                : mode === "recluster"
                  ? "Re-cluster →"
                  : "Start Clustering →"
              }
            </button>
          </div>
        </>
      )}

      {/* ── STEP 2: Team Limit + Skill Distribution — shown in full + reselect mode ── */}
      {step === 2 && (
        <>
          <Section label="Team Limit">
            <div
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
              style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
              >
                <Users className="w-3 h-3" style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <span className="flex-1 text-sm" style={{ color: "hsl(var(--foreground))" }}>
                Total teams to select
              </span>
              <div style={{ width: "96px" }}>
                <NumberSpinner value={totalTeams} onChange={setTotalTeams} min={1} />
              </div>
            </div>
          </Section>

          <Section label="Skill Distribution">
            <div
              className="px-4 py-4 rounded-xl"
              style={{ background: "hsl(var(--muted) / 0.4)", border: "1px solid hsl(var(--border))" }}
            >
              <QuotaSlider thumbA={thumbA} thumbB={thumbB} onChangeA={setThumbA} onChangeB={setThumbB} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Beginner", count: quotas.beginner, color: "hsl(200, 80%, 55%)" },
                { label: "Intermediate", count: quotas.intermediate, color: "hsl(45, 90%, 55%)" },
                { label: "Expert", count: quotas.expert, color: "hsl(var(--accent))" },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-lg"
                  style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.5)" }}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {label}
                  </span>
                  <span className="text-xl font-bold font-mono" style={{ color }}>{count}</span>
                  <span className="text-[9px] text-muted-foreground">teams</span>
                </div>
              ))}
            </div>
          </Section>

          <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {/* Back button — goes to step 1 for full mode, back to results for reselect mode */}
            <button
              onClick={() => mode === "reselect" ? onBack?.() : setStep(1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
              style={{ color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border) / 0.6)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"; }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <div className="flex flex-col items-end gap-1">
              {autoSelectError && (
                <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>{autoSelectError}</p>
              )}
              <button
                disabled={autoSelecting}
                onClick={handleAutoSelect}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: autoSelecting ? "hsl(var(--muted))" : "hsl(var(--accent))",
                  color: autoSelecting ? "hsl(var(--muted-foreground))" : "hsl(var(--accent-foreground))",
                  cursor: autoSelecting ? "not-allowed" : "pointer",
                  boxShadow: autoSelecting ? "none" : "0 0 20px hsl(var(--accent) / 0.25)",
                }}
              >
                {autoSelecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {autoSelecting
                  ? "Selecting..."
                  : mode === "reselect"
                    ? "Re-select →"
                    : "Auto Select →"
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};