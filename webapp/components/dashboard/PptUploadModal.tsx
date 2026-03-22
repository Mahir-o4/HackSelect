"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, FileText, X, CheckCircle2, Loader2, Play, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PIPELINE_BASE = process.env.NEXT_PUBLIC_PIPELINE_URL ?? "http://localhost:8000";

interface PptUploadModalProps {
  open: boolean;
  onClose: () => void;
  hackathonId: string;
}

type Step = 1 | 2 | 3;

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as Step[]).map((s) => (
        <div
          key={s}
          className="transition-all duration-300 rounded-full"
          style={{
            width: step === s ? 20 : 6,
            height: 6,
            background:
              step === s
                ? "hsl(var(--accent))"
                : s < step
                ? "hsl(var(--accent) / 0.4)"
                : "hsl(var(--muted))",
          }}
        />
      ))}
    </div>
  );
}

export default function PptUploadModal({ open, onClose, hackathonId }: PptUploadModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCSV = (f: File) => {
    setFile(f);
    setFileName(f.name);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRowCount(res.data.length),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleCSV(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("hackathonId", hackathonId);
      const res = await fetch("/api/ppt-upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Upload failed.");
        return;
      }
      toast.success(`Uploaded — ${json.totalUpserted} PPTs saved, ${json.totalSkipped} skipped.`);
      setStep(2);
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAllocation = async () => {
    setIsAllocating(true);
    try {
      const res = await fetch(`${PIPELINE_BASE}/ppt/run/${hackathonId}`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.detail;
        const msg = Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg).join(", ")
          : detail ?? "Allocation failed.";
        toast.error(msg);
        return;
      }
      toast.success("Allocation complete.");
      setStep(3);
    } catch {
      toast.error("Could not reach the pipeline server.");
    } finally {
      setIsAllocating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setFileName("");
    setRowCount(0);
    setIsUploading(false);
    setIsAllocating(false);
    onClose();
  };

  const handleGoToJudges = () => {
    router.push(`/dashboard/${hackathonId}/judges`);
    handleClose();
  };

  if (!open) return null;

  const STEP_META: Record<Step, { title: string; subtitle: string }> = {
    1: { title: "Upload PPTs",      subtitle: "Upload a CSV with team PPT links" },
    2: { title: "Run Allocation",   subtitle: "Automatically assign PPTs to judges" },
    3: { title: "Allocation Done",  subtitle: "PPTs have been assigned to judges" },
  };

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
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">
                {STEP_META[step].title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {STEP_META[step].subtitle}
              </p>
            </div>
            <StepDots step={step} />
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">

              {/* STEP 1 — Upload CSV */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {/* Format hint */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      CSV Format
                    </label>
                    <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg p-3">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono">teamId, pptUrl</span>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      PPT CSV File
                    </label>

                    {!file ? (
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
                    ) : (
                      <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg p-3">
                        <FileText className="w-4 h-4 text-accent shrink-0" />
                        <div className="flex flex-col text-sm min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate">{fileName}</span>
                          <span className="text-muted-foreground text-xs">{rowCount} rows detected</span>
                        </div>
                        <button
                          onClick={() => { setFile(null); setFileName(""); setRowCount(0); }}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isUploading && (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--accent))" }} />
                      <p className="text-sm text-muted-foreground">Uploading CSV...</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2 — Run Allocation */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  {/* Uploaded file chip */}
                  <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg p-3">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <div className="flex flex-col text-sm min-w-0 flex-1">
                      <span className="font-medium text-foreground truncate">{fileName}</span>
                      <span className="text-muted-foreground text-xs">{rowCount} rows uploaded</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "hsl(143, 60%, 50%)" }} />
                  </div>

                  {/* Info panel */}
                  <div
                    className="flex flex-col gap-3 p-4 rounded-xl"
                    style={{
                      background: "hsl(var(--muted) / 0.3)",
                      border: "1px solid hsl(var(--border) / 0.5)",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Auto Allocation
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The pipeline will classify each PPT by domain and assign them to judges
                      based on their specialisations. This may take a moment.
                    </p>
                  </div>

                  {isAllocating && (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--accent))" }} />
                      <p className="text-sm text-muted-foreground">Running allocation pipeline...</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Done */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  <div
                    className="flex flex-col gap-3 p-4 rounded-xl"
                    style={{
                      background: "hsl(var(--muted) / 0.3)",
                      border: "1px solid hsl(var(--border) / 0.5)",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Allocation Complete
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: "hsl(143, 60%, 50% / 0.12)",
                          border: "1px solid hsl(143, 60%, 50% / 0.3)",
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(143, 60%, 50%)" }} />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        PPTs have been classified and assigned to judges based on their specialisations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-muted/30 border border-border rounded-lg p-3">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "hsl(var(--accent))" }} />
                    <span className="text-xs text-muted-foreground">
                      Head to the{" "}
                      <span className="text-foreground font-medium">Judges page</span>{" "}
                      to review assignments and manage evaluation.
                    </span>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Footer ── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}
          >
            <Button variant="ghost" size="sm" onClick={handleClose}>
              {step === 3 ? "Close" : "Cancel"}
            </Button>

            {step === 1 && (
              <Button variant="hero" size="sm" disabled={!file || isUploading} onClick={handleUpload}>
                {isUploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading...</>
                ) : (
                  <><UploadCloud className="w-3.5 h-3.5" />Upload CSV</>
                )}
              </Button>
            )}

            {step === 2 && (
              <Button variant="hero" size="sm" disabled={isAllocating} onClick={handleRunAllocation}>
                {isAllocating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Allocating...</>
                ) : (
                  <><Play className="w-3.5 h-3.5" />Run Auto Allocation</>
                )}
              </Button>
            )}

            {step === 3 && (
              <Button variant="hero" size="sm" onClick={handleGoToJudges}>
                Judges Page
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}