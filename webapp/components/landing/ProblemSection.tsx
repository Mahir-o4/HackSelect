/* eslint-disable react/no-unescaped-entities */
"use client";
import { motion } from "framer-motion";
import { Clock, ShieldAlert, Users } from "lucide-react";

const problems = [
  {
    num: "01",
    icon: Clock,
    title: "Time-Consuming",
    description:
      "Manually reviewing hundreds of applications takes days. Organizers waste hours on spreadsheets instead of running a great event.",
  },
  {
    num: "02",
    icon: ShieldAlert,
    title: "Bias-Prone",
    description:
      "Subjective evaluations lead to inconsistent decisions. Great developers get overlooked while less qualified ones slip through.",
  },
  {
    num: "03",
    icon: Users,
    title: "Poor Team Balance",
    description:
      "Without data-driven selection, teams end up unbalanced — too many beginners, not enough diversity in skills to ship anything.",
  },
];

const ProblemSection = () => (
  <section className="py-24 px-4 flex items-center justify-center">
    <div className="container max-w-6xl">

      {/* Header — unchanged */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <p className="text-sm font-mono text-accent uppercase tracking-widest mb-3">The Problem</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Manual Screening is Broken
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Hackathon organizers still rely on gut feelings and spreadsheets to select participants. It doesn't scale.
        </p>
      </motion.div>

      {/* Stat rows */}
      <div className="flex flex-col gap-3">
        {problems.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="grid items-center gap-1 rounded-2xl border border-border bg-background p-7 hover:border-border transition-colors duration-300 group"
          >
            <div className="flex items-center gap-5">
              <span
                className="font-mono text-xl text-primary tracking-wide mb-3 shrink-0"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {item.num}
              </span>
              <div className="w-px h-12 bg-border shrink-0" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <span className="text-xl font-semibold text-foreground transition-colors duration-200">
                    {item.title}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed ">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  </section>
);

export default ProblemSection;