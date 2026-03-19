"use client";

import { LogOut } from "lucide-react";
import { Button } from "../ui/button";

export default function DashboardNavbar() {
  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="w-[50vw] flex items-center justify-between h-16 px-4 border rounded-2xl border-border/70 bg-background/70 backdrop-blur-sm">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">Hack</span>
          <span className="text-lg font-bold text-accent">Select</span>
        </div>

        {/* Logout */}
        <Button variant="hero" size="sm">
          <span className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </span>
        </Button>
      </div>
    </nav>
  );
}
