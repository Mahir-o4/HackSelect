"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Hackathon {
  name: string;
}

interface SidebarProps {
  hackathons: Hackathon[];
  onCreateHackathon?: () => void;
}

const Sidebar = ({ hackathons, onCreateHackathon }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 220 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-screen border-r border-border/60 bg-background/80 backdrop-blur-sm shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-border/40">

        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="text-accent text-xs font-bold">H</span>
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-1 text-sm font-bold"
              >
                <span>Hack</span>
                <span className="text-accent">Select</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-muted"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Hackathons */}
      <nav className="flex flex-col flex-1 p-3 gap-1">

        {!collapsed && (
          <div className="text-xs text-muted-foreground px-3 pb-2">
            Hackathons
          </div>
        )}

        {hackathons.map((hackathon) => (
          <Link
            key={hackathon.name}
            href={`/dashboard/${hackathon.name}`}
            className={cn(
              "flex items-center px-3 py-2 rounded-xl text-sm hover:bg-muted",
              collapsed && "justify-center"
            )}
          >
            {!collapsed ? hackathon.name : <span className="text-xs">H</span>}
          </Link>
        ))}

        {/* Create Hackathon */}
        <button
          onClick={onCreateHackathon}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-muted mt-2",
            collapsed && "justify-center"
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>Create Hackathon</span>}
        </button>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/40">
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-muted",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;