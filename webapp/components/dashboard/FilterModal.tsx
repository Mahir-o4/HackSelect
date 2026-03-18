"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, FileText, Users } from "lucide-react";
import { NumberSpinner } from "@/components/ui/numberspinner";
import { Checkbox } from "@/components/ui/checkbox";

export interface FieldsData {
  sources: { github: boolean; linkedin: boolean; resume: boolean };
  totalTeams: number;
  quotas: { beginner: number; intermediate: number; expert: number };
}

// --- Row that wraps Checkbox + icon + text ---
const CheckRow = ({
  checked,
  onChange,
  icon,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
    style={{
      background: checked ? "hsl(var(--accent) / 0.08)" : "transparent",
      border: `1px solid ${checked ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border))"}`,
    }}
  >
    {/* Checkbox component */}
    <Checkbox checked={checked} onChange={onChange} />

    {/* Icon */}
    <div
      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
      style={{
        background: checked ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted))",
        color: checked ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {icon}
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <div
        className="text-sm font-medium"
        style={{ color: checked ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
      >
        {label}
      </div>
      <div className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        {description}
      </div>
    </div>
  </button>
);

// --- Section label with rule ---
const Section = ({
  label,
  pill,
  children,
}: {
  label: string;
  pill?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-semibold whitespace-nowrap"
        style={{
          color: "hsl(var(--muted-foreground))",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
      {pill}
    </div>
    {children}
  </div>
);

interface Props {
  onNext: (data: FieldsData) => void;
}

export const FilterModal = ({ onNext }: Props) => {
  const [sources, setSources] = useState({ github: true, linkedin: false, resume: false });
  const [totalTeams, setTotalTeams] = useState(20);
  const [quotas, setQuotas] = useState({ beginner: 8, intermediate: 8, expert: 4 });

  const quotaTotal = quotas.beginner + quotas.intermediate + quotas.expert;
  const quotaOver = quotaTotal > totalTeams;
  const canProceed = Object.values(sources).some(Boolean) && totalTeams > 0 && !quotaOver;

  const updateQuota = (key: keyof typeof quotas, val: number) =>
    setQuotas((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5" style={{ maxHeight: "55vh" }}>

        {/* Data Sources */}
        <Section label="Data Sources">
          <CheckRow
            checked={sources.github}
            onChange={(v) => setSources((s) => ({ ...s, github: v }))}
            icon={<Github className="w-3.5 h-3.5" />}
            label="GitHub"
            description="Analyze repositories, commits & contributions"
          />
          <CheckRow
            checked={sources.linkedin}
            onChange={(v) => setSources((s) => ({ ...s, linkedin: v }))}
            icon={<Linkedin className="w-3.5 h-3.5" />}
            label="LinkedIn"
            description="Pull experience, education & endorsements"
          />
          <CheckRow
            checked={sources.resume}
            onChange={(v) => setSources((s) => ({ ...s, resume: v }))}
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Resume"
            description="Parse uploaded PDF / DOCX resumes"
          />
        </Section>

        {/* Team Limit */}
        <Section label="Team Limit">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            >
              <Users className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
            <span className="flex-1 text-sm" style={{ color: "hsl(var(--foreground))" }}>
              Total teams allowed
            </span>
            <div style={{ width: "96px" }}>
              <NumberSpinner value={totalTeams} onChange={setTotalTeams} min={1} />
            </div>
          </div>
        </Section>

        {/* Skill Quotas */}
        <Section
          label="Skill Quotas"
          pill={
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: quotaOver ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--accent) / 0.1)",
                color: quotaOver ? "hsl(var(--destructive))" : "hsl(var(--accent))",
                border: `1px solid ${quotaOver ? "hsl(var(--destructive) / 0.3)" : "hsl(var(--accent) / 0.25)"}`,
              }}
            >
              {quotaTotal} / {totalTeams}
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            <NumberSpinner label="Beginner" value={quotas.beginner} onChange={(v) => updateQuota("beginner", v)} />
            <NumberSpinner label="Intermediate" value={quotas.intermediate} onChange={(v) => updateQuota("intermediate", v)} />
            <NumberSpinner label="Expert" value={quotas.expert} onChange={(v) => updateQuota("expert", v)} accent />
          </div>

          {/* Quota bar */}
          <div className="rounded-lg overflow-hidden h-1.5 flex" style={{ background: "hsl(var(--muted))" }}>
            {totalTeams > 0 && (
              <>
                <motion.div animate={{ width: `${Math.min(100, (quotas.beginner / totalTeams) * 100)}%` }} transition={{ duration: 0.25 }} style={{ background: "hsl(200, 80%, 55%)", height: "100%" }} />
                <motion.div animate={{ width: `${Math.min(100, (quotas.intermediate / totalTeams) * 100)}%` }} transition={{ duration: 0.25 }} style={{ background: "hsl(45, 90%, 55%)", height: "100%" }} />
                <motion.div animate={{ width: `${Math.min(100, (quotas.expert / totalTeams) * 100)}%` }} transition={{ duration: 0.25 }} style={{ background: "hsl(var(--accent))", height: "100%" }} />
              </>
            )}
          </div>

          <div className="flex gap-4">
            {[
              { label: "Beginner", color: "hsl(200, 80%, 55%)" },
              { label: "Intermediate", color: "hsl(45, 90%, 55%)" },
              { label: "Expert", color: "hsl(var(--accent))" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
              </div>
            ))}
          </div>

          {quotaOver && (
            <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
              ⚠ Quota total ({quotaTotal}) exceeds team limit ({totalTeams})
            </p>
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <button
          disabled={!canProceed}
          onClick={() => canProceed && onNext({ sources, totalTeams, quotas })}
          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            background: canProceed ? "hsl(var(--accent))" : "hsl(var(--muted))",
            color: canProceed ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
            cursor: canProceed ? "pointer" : "not-allowed",
            letterSpacing: "-0.01em",
            boxShadow: canProceed ? "0 0 20px hsl(var(--accent) / 0.25)" : "none",
          }}
        >
          Run Analysis →
        </button>
      </div>
    </div>
  );
};