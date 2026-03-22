/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/refs */
"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, FileText, Cpu, CheckCircle2, AlertCircle } from "lucide-react";

// Stage → icon + label mapping
const STAGE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  init: { icon: <Cpu className="w-4 h-4" />, label: "Initializing pipeline" },
  github: { icon: <Github className="w-4 h-4" />, label: "Fetching GitHub profiles" },
  resume: { icon: <FileText className="w-4 h-4" />, label: "Parsing resumes" },
  scoring: { icon: <Cpu className="w-4 h-4" />, label: "Computing scores" },
  features: { icon: <Cpu className="w-4 h-4" />, label: "Building feature vectors" },
  persistence: { icon: <Cpu className="w-4 h-4" />, label: "Saving to database" },
  complete: { icon: <CheckCircle2 className="w-4 h-4" />, label: "Pipeline complete" },
};

interface SSEEvent {
  stage: string;
  status: "in_progress" | "done" | "error";
  message: string;
}

interface StageEntry {
  stage: string;
  status: "in_progress" | "done" | "error";
  message: string;
}

interface AnalysisLoaderProps {
  hackathonId: string;
  onComplete: () => void;
}

export default function AnalysisLoader({ hackathonId, onComplete }: AnalysisLoaderProps) {
  const [stages, setStages] = useState<StageEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {

    const controller = new AbortController();

    const runPipeline = async () => {
      try {
        const res = await fetch(`http://localhost:8000/pipeline/run/${hackathonId}`, {
          method: "POST",
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setError("Failed to start pipeline.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE lines come as "data: {...}\n\n"
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // keep incomplete last line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            try {
              const event: SSEEvent = JSON.parse(trimmed.slice(5).trim());

              setStages((prev) => {
                const existing = prev.findIndex((s) => s.stage === event.stage);
                if (existing !== -1) {
                  const updated = [...prev];
                  updated[existing] = { stage: event.stage, status: event.status, message: event.message };
                  return updated;
                }
                return [...prev, { stage: event.stage, status: event.status, message: event.message }];
              });

              const ORDERED_STAGES = ["init", "github", "resume", "scoring", "features", "persistence", "complete"];
              const stageIndex = ORDERED_STAGES.indexOf(event.stage);
              if (event.status === "done" && stageIndex !== -1) {
                setProgress(Math.round(((stageIndex + 1) / ORDERED_STAGES.length) * 100));
              }

              if (event.stage === "complete" && event.status === "done") {
                setTimeout(() => onCompleteRef.current(), 600);
                return;
              }

              if (event.status === "error") {
                setError(event.message);
                return;
              }
            } catch {
              // malformed line — skip
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError("Connection to pipeline lost. Please try again.");
        }
      }
    };

    runPipeline();

    return () => controller.abort();
  }, [hackathonId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full gap-8 px-10"
    >
      {/* Pulsing orb */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-24 h-24 rounded-full"
          style={{ background: "hsl(var(--accent))" }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="absolute w-16 h-16 rounded-full"
          style={{ background: "hsl(var(--accent))" }}
        />
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: "hsl(var(--accent) / 0.15)",
            border: "1px solid hsl(var(--accent) / 0.4)",
          }}
        >
          <Cpu className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-medium">
              {error ? "Pipeline failed" : "Analysing teams..."}
            </span>
            <span className="text-xs font-mono" style={{ color: error ? "hsl(var(--destructive))" : "hsl(var(--accent))" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: error
                  ? "hsl(var(--destructive))"
                  : "linear-gradient(90deg, hsl(var(--accent) / 0.7), hsl(var(--accent)))",
                boxShadow: error ? "none" : "0 0 8px hsl(var(--accent) / 0.6)",
              }}
              animate={{ width: error ? "100%" : `${Math.max(progress, 3)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Live SSE event list */}
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {stages.map((entry, i) => {
              const cfg = STAGE_CONFIG[entry.stage] ?? {
                icon: <Cpu className="w-4 h-4" />,
                label: entry.stage,
              };
              const isDone = entry.status === "done";
              const isActive = entry.status === "in_progress";
              const isError = entry.status === "error";

              return (
                <motion.div
                  key={entry.stage}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon badge */}
                    <motion.div
                      animate={isActive ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                      transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: isError
                          ? "hsl(var(--destructive) / 0.15)"
                          : isDone
                            ? "hsl(var(--accent) / 0.15)"
                            : isActive
                              ? "hsl(var(--accent) / 0.08)"
                              : "hsl(var(--muted) / 0.5)",
                        border: `1px solid ${isError
                          ? "hsl(var(--destructive) / 0.4)"
                          : isDone
                            ? "hsl(var(--accent) / 0.4)"
                            : isActive
                              ? "hsl(var(--accent) / 0.25)"
                              : "hsl(var(--border))"
                          }`,
                        color: isError
                          ? "hsl(var(--destructive))"
                          : isDone
                            ? "hsl(var(--accent))"
                            : isActive
                              ? "hsl(var(--accent) / 0.8)"
                              : "hsl(var(--muted-foreground) / 0.5)",
                      }}
                    >
                      {isError ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                      ) : (
                        <span>{cfg.icon}</span>
                      )}
                    </motion.div>

                    {/* Stage label */}
                    <span
                      className="text-xs font-medium transition-colors duration-300"
                      style={{
                        color: isError
                          ? "hsl(var(--destructive))"
                          : isDone
                            ? "hsl(var(--foreground))"
                            : isActive
                              ? "hsl(var(--foreground) / 0.8)"
                              : "hsl(var(--muted-foreground) / 0.5)",
                      }}
                    >
                      {cfg.label}
                      {isActive && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          {" "}...
                        </motion.span>
                      )}
                    </span>
                  </div>

                  {/* SSE message — shown as subtitle under the stage */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] pl-9 leading-relaxed"
                    style={{
                      color: isError
                        ? "hsl(var(--destructive) / 0.8)"
                        : "hsl(var(--muted-foreground) / 0.6)",
                    }}
                  >
                    {entry.message}
                  </motion.p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Error retry hint */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-center"
            style={{ color: "hsl(var(--destructive) / 0.8)" }}
          >
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}