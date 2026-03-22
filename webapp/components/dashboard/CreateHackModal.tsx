/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Plus, X, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Judge {
  name: string;
  email: string;
  specialisations: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, file: File | null, judges: Judge[]) => Promise<void>;
}

const DOMAINS = [
  "AI/ML", "Web Development", "IoT & Embedded Systems", "Data Science",
  "Cybersecurity", "Blockchain", "Mobile Development", "Cloud & DevOps",
  "Robotics", "Game Development", "Healthcare Tech", "EdTech",
  "FinTech", "Sustainability & CleanTech", "Social Impact", "AR/VR",
];

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2].map((s) => (
        <div
          key={s}
          className="transition-all duration-300 rounded-full"
          style={{
            width: step === s ? 20 : 6,
            height: 6,
            background: step === s
              ? "hsl(var(--accent))"
              : "hsl(var(--muted))",
          }}
        />
      ))}
    </div>
  );
}

function DomainSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (domains: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (domain: string) => {
    onChange(
      selected.includes(domain)
        ? selected.filter((d) => d !== domain)
        : [...selected, domain]
    );
  };

  const remove = (domain: string) => onChange(selected.filter((d) => d !== domain));

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {/* Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
          style={{ color: selected.length === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
        >
          <span>
            {selected.length === 0
              ? "Select domains..."
              : `${selected.length} domain${selected.length > 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown
            className="w-3.5 h-3.5 text-muted-foreground shrink-0"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.6)",
                boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4)",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                {DOMAINS.map((domain) => {
                  const isSelected = selected.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggle(domain)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-left transition-all"
                      style={{
                        background: isSelected ? "hsl(var(--accent) / 0.1)" : "transparent",
                        color: isSelected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.5)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: isSelected ? "hsl(var(--accent))" : "transparent",
                          border: isSelected
                            ? "1.5px solid hsl(var(--accent))"
                            : "1.5px solid hsl(var(--muted-foreground) / 0.4)",
                        }}
                      >
                        {isSelected && (
                          <svg className="w-2 h-2" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="hsl(var(--accent-foreground))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium">{domain}</span>
                      {isSelected && (
                        <span
                          className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: "hsl(var(--accent) / 0.15)",
                            color: "hsl(var(--accent))",
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((domain) => (
            <span
              key={domain}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "hsl(var(--accent) / 0.1)",
                border: "1px solid hsl(var(--accent) / 0.25)",
                color: "hsl(var(--accent))",
              }}
            >
              {domain}
              <button
                type="button"
                onClick={() => remove(domain)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateHack({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Step 2
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgeForm, setJudgeForm] = useState<Judge>({ name: "", email: "", specialisations: [] });
  const [loading, setLoading] = useState(false);

  const handleCSV = (f: File) => {
    setFile(f);
    setFileName(f.name);
    Papa.parse(f, {
      complete: (result) => {
        const names = result.data.map((row: any) => row[0]).filter(Boolean);
        setParticipants(names);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleCSV(e.dataTransfer.files[0]);
  };

  const addJudge = () => {
    if (!judgeForm.name || !judgeForm.email) return;
    setJudges((prev) => [...prev, judgeForm]);
    setJudgeForm({ name: "", email: "", specialisations: [] });
  };

  const removeJudge = (i: number) => setJudges((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!name) return;
    setLoading(true);
    await onCreate(name, file, judges);
    setStep(1);
    setName("");
    setFile(null);
    setParticipants([]);
    setFileName("");
    setJudges([]);
    setJudgeForm({ name: "", email: "", specialisations: [] });
    setLoading(false);
    onClose();
  };

  const handleClose = () => {
    setStep(1);
    setName("");
    setFile(null);
    setParticipants([]);
    setFileName("");
    setJudges([]);
    setJudgeForm({ name: "", email: "", specialisations: [] });
    onClose();
  };

  const canGoNext = !!name;
  const canSubmit = !!name && !loading;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[500px] bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {step === 1 ? "Create Hackathon" : "Add Judges"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === 1
                  ? "Name your hackathon and upload participants"
                  : "Add judges and their areas of specialisation"}
              </p>
            </div>
            <StepDots step={step} />
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hackathon Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DevDraft AI 2026"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </div>

                  {/* CSV Drop */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Participants CSV{" "}
                      <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInput.current?.click()}
                      className="cursor-pointer border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition"
                    >
                      <UploadCloud className="w-6 h-6 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Click to upload</span>{" "}
                        or drag & drop
                      </div>
                      <p className="text-xs text-muted-foreground">CSV files only</p>
                      <input
                        ref={fileInput}
                        type="file"
                        accept=".csv"
                        hidden
                        onChange={(e) => e.target.files && handleCSV(e.target.files[0])}
                      />
                    </div>
                  </div>

                  {/* File preview */}
                  {fileName && (
                    <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg p-3">
                      <FileText className="w-4 h-4 text-accent shrink-0" />
                      <div className="flex flex-col text-sm min-w-0">
                        <span className="font-medium text-foreground truncate">{fileName}</span>
                        <span className="text-muted-foreground text-xs">
                          {participants.length} participants loaded
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {/* Judge form */}
                  <div
                    className="flex flex-col gap-3 p-4 rounded-xl"
                    style={{
                      background: "hsl(var(--muted) / 0.3)",
                      border: "1px solid hsl(var(--border) / 0.5)",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      New Judge
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Full name"
                        value={judgeForm.name}
                        onChange={(e) => setJudgeForm((j) => ({ ...j, name: e.target.value }))}
                        className="border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <input
                        placeholder="Email"
                        type="email"
                        value={judgeForm.email}
                        onChange={(e) => setJudgeForm((j) => ({ ...j, email: e.target.value }))}
                        className="border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                    <DomainSelect
                      selected={judgeForm.specialisations}
                      onChange={(v) => setJudgeForm((j) => ({ ...j, specialisations: v }))}
                    />
                    <button
                      onClick={addJudge}
                      disabled={!judgeForm.name || !judgeForm.email}
                      className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "hsl(var(--accent) / 0.1)",
                        border: "1px solid hsl(var(--accent) / 0.3)",
                        color: "hsl(var(--accent))",
                      }}
                      onMouseEnter={(e) => {
                        if (judgeForm.name && judgeForm.email)
                          (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.1)";
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Judge
                    </button>
                  </div>

                  {/* Judge list */}
                  {judges.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {judges.length} Judge{judges.length > 1 ? "s" : ""} Added
                      </p>
                      {judges.map((j, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                          style={{
                            background: "hsl(var(--muted) / 0.2)",
                            border: "1px solid hsl(var(--border) / 0.4)",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                            style={{
                              background: `hsl(${(i * 55 + 210) % 360}, 40%, 16%)`,
                              border: `1px solid hsl(${(i * 55 + 210) % 360}, 40%, 26%)`,
                              color: `hsl(${(i * 55 + 210) % 360}, 60%, 62%)`,
                            }}
                          >
                            {j.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{j.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{j.email}</p>
                            {j.specialisations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {j.specialisations.map((s) => (
                                  <span
                                    key={s}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                    style={{
                                      background: "hsl(var(--accent) / 0.1)",
                                      border: "1px solid hsl(var(--accent) / 0.25)",
                                      color: "hsl(var(--accent))",
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeJudge(i)}
                            className="shrink-0 p-1 rounded-md transition-colors"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "hsl(var(--destructive) / 0.1)";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--destructive))";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {judges.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-1">
                      No judges added yet — you can also add them later
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}
          >
            {step === 1 ? (
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}

            {step === 1 ? (
              <Button variant="hero" size="sm" disabled={!canGoNext} onClick={() => setStep(2)}>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button variant="hero" size="sm" disabled={!canSubmit} onClick={handleSubmit}>
                {loading ? "Creating..." : "Create Hackathon"}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}