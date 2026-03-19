"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import CreateHack from "@/components/dashboard/CreateHackModal";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

interface Hackathon {
  id: string;
  name: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [open, setOpen] = useState(false);

  // Fetch existing hackathons on mount
  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const res = await fetch("/api/hackathon");
        const json = await res.json();
        if (json.success) setHackathons(json.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHackathons();
  }, []);

  const createHackathon = async (name: string, file: File | null) => {
    try {
      const res = await fetch("/api/hackathon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) return;

      const hackathonId: string = json.hackathonId;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("hackathonId", hackathonId);
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      setHackathons((prev) => [...prev, { id: hackathonId, name }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar hackathons={hackathons} onCreateHackathon={() => setOpen(true)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardNavbar />
        <main className="flex-1 overflow-hidden flex flex-col pt-24">{children}</main>
      </div>

      <CreateHack
        open={open}
        onClose={() => setOpen(false)}
        onCreate={createHackathon}
      />
    </div>
  );
}