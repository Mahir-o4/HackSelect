"use client";
import { motion } from "framer-motion";
import { Settings, SlidersHorizontal, CheckCircle2 } from "lucide-react";

const ForOrganizersSection = () => (
  <section className="py-24 px-4 flex items-center justify-center">
    <div className="container max-w-6xl">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-mono text-accent uppercase tracking-widest mb-3">For Organizers</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Quota-Based Team Selection
          </h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Define exactly what your hackathon needs. Set quotas by skill domain — AI, Web3, Fullstack, Design — and let DevDraft fill your teams with the right mix of talent.
          </p>

          <div className="space-y-5">
            {[
              { icon: SlidersHorizontal, text: "Set custom selection fields and criteria per hackathon" },
              { icon: Settings, text: "Define team size, skill distribution, and experience quotas" },
              { icon: CheckCircle2, text: "Auto-shortlist candidates based on scores and availability" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="w-4 h-4 text-accent" />
                </div>
                <p className="text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-elevated p-6"
        >
          {/* Mock dashboard UI */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="font-mono text-sm text-muted-foreground">Team Quota Dashboard</span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-accent font-mono">Live</span>
            </div>
            {[
              { field: "AI / ML", quota: 12, filled: 10 },
              { field: "Fullstack", quota: 20, filled: 18 },
              { field: "Web3", quota: 8, filled: 5 },
              { field: "Design", quota: 6, filled: 6 },
            ].map((row) => (
              <div key={row.field} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{row.field}</span>
                  <span className="text-muted-foreground font-mono">{row.filled}/{row.quota}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(row.filled / row.quota) * 100}%`,
                      background: row.filled >= row.quota ? "hsl(108, 46%, 33%)" : "hsl(96, 52%, 54%)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ForOrganizersSection;
