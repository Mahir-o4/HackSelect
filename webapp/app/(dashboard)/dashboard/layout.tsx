"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import CreateHack from "@/components/dashboard/CreateHackModal";

interface Hackathon {
  id: string;
  name: string;
}

// At the top of layout.tsx, add this interface
interface Judge {
  name: string;
  email: string;
  specialisations: string[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  const createHackathon = async (name: string, file: File | null, judges: Judge[]) => {
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

      if (judges.length > 0) {
        await fetch("/api/judges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hackathonId,
            judges: judges.map((j) => ({
              name: j.name,
              email: j.email,
              specialisations: j.specialisations, // ← not domains
            })),
          }),
        });
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
    <div className="flex h-screen relative">
      <Sidebar
        hackathons={hackathons}
        onCreateHackathon={() => setOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-1.5">
          <span className="text-base font-bold text-foreground">Dev</span>
          <span className="text-base font-bold" style={{ color: "hsl(var(--accent))" }}>Draft</span>
        </div>
        <main className="flex-1 overflow-hidden flex flex-col">
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