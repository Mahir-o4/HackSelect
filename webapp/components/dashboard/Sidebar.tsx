"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, LogOut, Zap, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";


interface Hackathon {
  id: string;
  name: string;
}

interface SidebarProps {
  hackathons: Hackathon[];
  onCreateHackathon?: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}

const Sidebar = ({ hackathons, onCreateHackathon, collapsed, onCollapsedChange }: SidebarProps) => {

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen shrink-0 overflow-visible bg-background"
      style={{ borderRight: "1px solid hsl(var(--border))" }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.4), transparent)" }}
      />

      {/* Floating expand/collapse tab — sits on the right edge */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-15 z-50 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 group"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 2px 8px hsl(0 0% 0% / 0.4)",
          color: "hsl(var(--muted-foreground))",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = "hsl(var(--accent))";
          btn.style.borderColor = "hsl(var(--accent))";
          btn.style.color = "hsl(var(--accent-foreground))";
          btn.style.boxShadow = "0 0 12px hsl(var(--accent) / 0.4)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = "hsl(var(--card))";
          btn.style.borderColor = "hsl(var(--border))";
          btn.style.color = "hsl(var(--muted-foreground))";
          btn.style.boxShadow = "0 2px 8px hsl(0 0% 0% / 0.4)";
        }}
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      {/* Header */}
      <div
        className="relative flex items-center h-16 px-3 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Logo mark */}
          <div
            className="relative shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "hsl(var(--accent) / 0.12)",
              border: "1px solid hsl(var(--accent) / 0.3)",
              boxShadow: "0 0 12px hsl(var(--accent) / 0.15)",
            }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <span
                  className="text-sm font-semibold whitespace-nowrap"
                  style={{ color: "hsl(var(--muted-foreground))", letterSpacing: "-0.01em" }}
                >
                  Welcome
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 gap-0.5">
        {/* Section label */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="px-2 pb-1.5 pt-0.5"
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "hsl(var(--muted-foreground) / 0.6)",
              }}
            >
              Hackathons
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hackathon links */}
        {hackathons.map((hackathon, i) => (
          <Link
            key={hackathon.name}
            href={`/dashboard/${hackathon.id}`}
            className={cn(
              "group relative flex items-center rounded-lg transition-all duration-150",
              collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
            )}
            style={{ color: "hsl(var(--muted-foreground))" }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "hsl(var(--muted))";
              el.style.color = "hsl(var(--foreground))";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "transparent";
              el.style.color = "hsl(var(--muted-foreground))";
            }}
          >
            {/* Color dot — hue cycles through accent-adjacent greens */}
            <div
              className="shrink-0 w-1.5 h-1.5 rounded-full"
              style={{
                background: `hsl(${93 + (i * 20) % 60}, 100%, ${50 + (i * 5) % 20}%)`,
                boxShadow: `0 0 6px hsl(${93 + (i * 20) % 60}, 100%, 50%, 0.5)`,
              }}
            />

            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="ml-2.5 text-sm truncate"
                  style={{ fontWeight: 450, letterSpacing: "-0.005em" }}
                >
                  {hackathon.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}

        {/* Divider */}
        {hackathons.length > 0 && (
          <div
            className="my-2 mx-2"
            style={{ height: "1px", background: "hsl(var(--border))" }}
          />
        )}

        {/* Create Hackathon */}
        <button
          onClick={onCreateHackathon}
          className={cn(
            "group flex items-center overflow-hidden rounded-lg transition-all duration-150",
            collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2 gap-2.5"
          )}
          style={{
            color: "hsl(var(--accent))",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            opacity: 0.75,
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "hsl(var(--accent) / 0.1)";
            btn.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "transparent";
            btn.style.opacity = "0.75";
          }}
        >
          <div
            className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
            style={{
              background: "hsl(var(--accent) / 0.15)",
              border: "1px solid hsl(var(--accent) / 0.3)",
            }}
          >
            <Plus className="w-3 h-3" />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ letterSpacing: "-0.005em", display: "block" }}
              >
                New Hackathon
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* ── Logout — pinned to bottom ── */}
      <div
        className="shrink-0 px-2 py-3"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}
      >

        {/* Stats page */}
        <Link
          href="/dashboard/stats"
          className={cn(
            "w-full flex items-center rounded-lg transition-all duration-150 mb-1",
            collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2 gap-2.5"
          )}
          style={{ color: "hsl(var(--muted-foreground))" }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "hsl(var(--muted))";
            el.style.color = "hsl(var(--foreground))";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.background = "transparent";
            el.style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ letterSpacing: "-0.005em", display: "block" }}
              >
                Stats
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          className={cn(
            "w-full flex items-center rounded-lg transition-all duration-150",
            collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2 gap-2.5"
          )}
          style={{
            color: "hsl(var(--muted-foreground))",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "hsl(var(--destructive) / 0.08)";
            btn.style.color = "hsl(var(--destructive))";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.background = "transparent";
            btn.style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                style={{ letterSpacing: "-0.005em", display: "block" }}
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

    </motion.aside>
  );
};

export default Sidebar;