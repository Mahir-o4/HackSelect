"use client";
import { motion } from "framer-motion";
import { GitBranch, FileText, Linkedin, Users, BarChart3 } from "lucide-react";

const FeaturesSection = () => (
  <section className="py-24 px-4 flex items-center justify-center"
  id="features">
    <div className="container max-w-6xl">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <p className="text-sm font-mono text-accent uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          Everything you need to select smarter
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          A complete toolkit for evaluating hackathon applicants with data, not guesswork.
        </p>
      </motion.div>

      {/* Bento grid: 1 — 3 — 1 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="grid grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border"
      >

        {/* ROW 1 — full width: GitHub */}
        <div className="col-span-3 bg-background hover:bg-muted/40 transition-colors duration-200 p-8 group flex gap-16 items-start">
          <div className="flex-1">
            <p className="font-mono text-xl text-primary tracking-wide mb-3">01</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
                <GitBranch className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">GitHub activity analysis</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Evaluate repositories, commit frequency, languages, and open-source contributions for a complete coding profile.
            </p>
          </div>
          <div className="flex-1 self-center flex flex-col gap-3">
            {[
              { label: "Commits", pct: 94 },
              { label: "Repositories", pct: 72 },
              { label: "Languages", pct: 61 },
              { label: "Open source", pct: 48 },
            ].map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground mb-1.5">
                  <span>{label}</span><span>{pct}</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 2 — three equal columns */}

        <div className="bg-background hover:bg-muted/40 transition-colors duration-200 p-7 group">
          <p className="font-mono text-xl text-primary tracking-wide mb-3">02</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
              <FileText className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">Resume parsing</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Extract skills, education, and project experience from uploaded resumes using intelligent parsing.
          </p>
        </div>

        <div className="bg-background hover:bg-muted/40 transition-colors duration-200 p-7 group">
          <p className="font-mono text-xl text-primary tracking-wide mb-3">03</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
              <Linkedin className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">LinkedIn insights</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pull professional experience, endorsements, and project history from LinkedIn profiles.
          </p>
        </div>

        <div className="bg-background hover:bg-muted/40 transition-colors duration-200 p-7 group">
          <p className="font-mono text-xl text-primary tracking-wide mb-3">04</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
              <Users className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">Team compatibility scoring</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Match candidates into balanced teams based on complementary skill sets and experience levels.
          </p>
        </div>

        {/* ROW 3 — full width: Smart ranking */}
        <div className="col-span-3 bg-background hover:bg-muted/40 transition-colors duration-200 p-8 group flex gap-16 items-start">
          <div className="flex-1">
            <p className="font-mono text-xl text-primary tracking-wide mb-3">05</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-[10px] border border-border group-hover:border-foreground/20 transition-colors flex items-center justify-center shrink-0">
                <BarChart3 className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-foreground transition-colors duration-200">Smart ranking system</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Multi-factor scoring algorithm that categorizes applicants as Beginner, Intermediate, or Expert.
            </p>
          </div>
          <div className="flex-1 self-center flex flex-col gap-2.5">
            {[
              { label: "Expert", pct: 28, opacity: "opacity-90" },
              { label: "Intermediate", pct: 53, opacity: "opacity-50" },
              { label: "Beginner", pct: 19, opacity: "opacity-25" },
            ].map(({ label, pct, opacity }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-muted-foreground w-20 shrink-0">{label}</span>
                <div className="flex-1 h-7 bg-muted rounded-md border border-border overflow-hidden relative">
                  <div
                    className={`absolute inset-y-0 left-0 bg-foreground ${opacity} rounded-md flex items-center pl-2.5`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="font-mono text-[11px] text-background">{pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;