"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import CreateHack from "@/components/dashboard/CreateHackModal";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

interface Hackathon {
  id: string;
  name: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchHackathons = async () => {
      try {
        const res = await fetch("/api/hackathon");
        const json = await res.json();
        if (json.success) setHackathons(json.data.map((h: any) => ({ id: h.id, name: h.name })));
      } catch (err) {
        console.error(err);
      }
    };
    fetchHackathons();
  }, []);

  const createHackathon = async (name: string, file: File | null) => {
    try {
      // 1. Create hackathon
      const res = await fetch("/api/hackathon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) return;

      const hackathonId: string = json.hackathonId;

      // 2. Upload CSV
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("hackathonId", hackathonId);
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      // 3. Update sidebar
      setHackathons((prev) => [...prev, { id: hackathonId, name }]);

      // 4. Redirect — autorun=true triggers pipeline on arrival
      router.push(`/dashboard/${hackathonId}?autorun=true`);
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