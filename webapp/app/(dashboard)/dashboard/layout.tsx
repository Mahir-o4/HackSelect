"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";

import CreateHack from "@/components/dashboard/CreateHack";

interface Hackathon {
  name: string;
  participants: string[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [open, setOpen] = useState(false);

  const createHackathon = (hackathon: Hackathon) => {
    setHackathons((prev) => [...prev, hackathon]);
  };

  return (
    <div className="flex h-screen">

      {/* Sidebar */}
      <Sidebar
        hackathons={hackathons}
        onCreateHackathon={() => setOpen(true)}
      />

      <div className="flex flex-col flex-1">

      

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-24">
          {children}
        </main>
      </div>

      {/* Popup */}
      <CreateHack
        open={open}
        onClose={() => setOpen(false)}
        onCreate={createHackathon}
      />

    </div>
  );
}