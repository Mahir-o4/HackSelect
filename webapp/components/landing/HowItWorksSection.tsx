"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Brain, Trophy } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Collect developer data",
    icon: Database,
    description:
      "Import applicant profiles from GitHub, LinkedIn, and resumes. Our system pulls commits, repos, experience, and tech stacks automatically — no manual entry.",
    tags: ["GitHub", "LinkedIn", "Resumes", "Auto-import"],
  },
  {
    num: "02",
    title: "Analyze & score skills",
    icon: Brain,
    description:
      "Our engine evaluates coding activity, project complexity, and experience depth to generate a comprehensive skill score for every applicant across 40+ dimensions.",
    tags: ["40+ signals", "Skill scoring", "Seniority", "Tech stacks"],
  },
  {
    num: "03",
    title: "Shortlist & build teams",
    icon: Trophy,
    description:
      "Set your quotas and criteria. HackSelect automatically ranks and shortlists the best candidates into balanced, high-performing teams — ready to ship in minutes.",
    tags: ["Auto-balance", "Custom quotas", "Team export"],
  },
];

export default function HowItWorksSection() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-24 px-4 flex items-center justify-center"
    id="how-it-works">
      <div className="container max-w-6xl">

        {/* Header — matches ProblemSection style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-mono text-accent uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Three Steps to{" "}
            <span className="text-gradient-primary">Better</span>{" "}
            Teams
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform automatically evaluates developer profiles and builds
            balanced teams for hackathons in minutes.
          </p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col max-w-6xl mx-auto"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            const isLast = i === steps.length - 1;

            return (
              <div
                key={i}
                className="grid cursor-pointer"
                style={{ gridTemplateColumns: "56px 1fr" }}
                onClick={() => setActive(i)}
              >
                {/* Spine */}
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-full border shrink-0 transition-all duration-300 z-10"
                    style={{
                      width: isActive ? 18 : 14,
                      height: isActive ? 18 : 14,
                      marginTop: isActive ? 0 : 2,
                      background: isActive
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--background))",
                      borderColor: isActive
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--border))",
                    }}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 my-1.5 min-h-8 relative overflow-hidden bg-border">
                      <div
                        className="absolute top-0 left-0 w-full bg-foreground transition-all duration-500"
                        style={{
                          height: isActive ? "100%" : "0%",
                          transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="pb-10">
                  <div className="flex items-center gap-3 pb-4">
                    <span className="font-mono text-xl text-muted-foreground tracking-wide">
                      {step.num}
                      
                    </span>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center ">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <span
                      className="text-xl font-semibold text-foreground transition-colors duration-200"
                      style={{
                        color: isActive
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {step.title}
                    </span>
                  </div>

                  <div
                    className="overflow-hidden transition-all duration-500"
                    style={{
                      maxHeight: isActive ? 320 : 0,
                      opacity: isActive ? 1 : 0,
                      transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    

                    <p className="text-muted-foreground leading-relaxed mb-5">
                      {step.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {step.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[11px] px-3 py-1 rounded-full border border-border text-muted-foreground bg-secondary tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}