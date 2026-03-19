"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, FileText, Linkedin, Cpu, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: <Github className="w-4 h-4" />, label: "Fetching GitHub profiles", duration: 2500 },
  { icon: <FileText className="w-4 h-4" />, label: "Parsing resumes", duration: 2500 },
  { icon: <Linkedin className="w-4 h-4" />, label: "Scanning LinkedIn data", duration: 2000 },
  { icon: <Cpu className="w-4 h-4" />, label: "Running ML scoring model", duration: 3000 },
];

interface AnalysisLoaderProps {
  onComplete: () => void;
}

export default function AnalysisLoader({ onComplete }: AnalysisLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  const TOTAL_DURATION = 10000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);

      // Advance steps
      let accumulated = 0;
      for (let i = 0; i < STEPS.length; i++) {
        accumulated += STEPS[i].duration;
        if (elapsed >= accumulated && !doneSteps.includes(i)) {
          setDoneSteps((prev) => [...prev, i]);
          setCurrentStep(Math.min(i + 1, STEPS.length - 1));
        }
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 400);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

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
            <span className="text-xs text-muted-foreground font-medium">Analysing teams...</span>
            <span className="text-xs font-mono" style={{ color: "hsl(var(--accent))" }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "hsl(var(--muted))" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(var(--accent) / 0.7), hsl(var(--accent)))",
                width: `${progress}%`,
                boxShadow: "0 0 8px hsl(var(--accent) / 0.6)",
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="flex flex-col gap-2.5">
          <AnimatePresence>
            {STEPS.map((step, i) => {
              const isDone = doneSteps.includes(i);
              const isActive = currentStep === i && !isDone;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: isDone
                        ? "hsl(var(--accent) / 0.15)"
                        : isActive
                        ? "hsl(var(--accent) / 0.08)"
                        : "hsl(var(--muted) / 0.5)",
                      border: `1px solid ${
                        isDone
                          ? "hsl(var(--accent) / 0.4)"
                          : isActive
                          ? "hsl(var(--accent) / 0.25)"
                          : "hsl(var(--border))"
                      }`,
                      color: isDone
                        ? "hsl(var(--accent))"
                        : isActive
                        ? "hsl(var(--accent) / 0.8)"
                        : "hsl(var(--muted-foreground) / 0.5)",
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <span
                    className="text-xs transition-colors duration-300"
                    style={{
                      color: isDone
                        ? "hsl(var(--foreground))"
                        : isActive
                        ? "hsl(var(--foreground) / 0.8)"
                        : "hsl(var(--muted-foreground) / 0.5)",
                    }}
                  >
                    {step.label}
                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {" "}...
                      </motion.span>
                    )}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}