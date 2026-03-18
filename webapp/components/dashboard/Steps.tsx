"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Create Hackathon" },
  { num: 2, label: "Select Fields" },
  { num: 3, label: "Run Analysis" },
];

interface StepsProps {
  num: number;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}

export const Steps = ({ num, children, open, onClose }: StepsProps) => {
  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "hsl(0 0% 0% / 0.55)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="w-[440px] bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.5), transparent)",
          }}
        />

        {/* Indicator */}
        <div className="flex justify-center px-6 pt-6 pb-5">
          <div className="flex items-center">
            {STEPS.map((step, i) => {
              const isDone = num > step.num;
              const isActive = num === step.num;
              const isLast = i === STEPS.length - 1;

              return (
                <div key={step.num} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Node */}
                    <motion.div
                      initial={false}
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                      className={cn(
                        "relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300",
                        isDone
                          ? "bg-accent text-accent-foreground"
                          : isActive
                          ? "bg-accent/15 border-2 border-accent text-accent"
                          : "bg-muted border border-border text-muted-foreground"
                      )}
                      style={
                        isActive
                          ? { boxShadow: "0 0 0 4px hsl(var(--accent) / 0.15), 0 0 12px hsl(var(--accent) / 0.25)" }
                          : {}
                      }
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : <span>{step.num}</span>}
                    </motion.div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-[10px] font-medium whitespace-nowrap transition-colors duration-300",
                        isActive ? "text-accent" : isDone ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector */}
                  {!isLast && (
                    <div className="relative w-14 h-px mx-2 mb-5">
                      <div className="absolute inset-0 rounded-full bg-border" />
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: "hsl(var(--accent))" }}
                        initial={false}
                        animate={{ width: isDone ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={num}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};