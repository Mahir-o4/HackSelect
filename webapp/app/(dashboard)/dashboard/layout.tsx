"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import CreateHack from "@/components/dashboard/CreateHackModal";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

interface Hackathon {
  name: string;
  participants: string[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [open, setOpen] = useState(false);

  const createHackathon = (hackathon: Hackathon) => {
    setHackathons((prev) => [...prev, hackathon]);
  };

  return (
    <div className="flex h-screen">

      <Sidebar
        hackathons={hackathons}
        onCreateHackathon={() => setOpen(true)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardNavbar />

        <main className="flex-1 overflow-hidden flex flex-col pt-24">
          {children}
        </main>
      </div>

      <CreateHack
        open={open}
        onClose={() => setOpen(false)}
        onCreate={createHackathon}
      />
    </div>
  );
}