"use client";

import { useState } from "react";
import EmptyHackathons from "@/components/dashboard/DefaultPage";
import CreateHack from "@/components/dashboard/CreateHackModal";

interface Hackathon {
  name: string;
  participants: string[];
}

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);

  const createHackathon = (hackathon: Hackathon) => {
    setHackathons((prev) => [...prev, hackathon]);
  };

  return (
    <>
      {/* Default empty state */}
      {hackathons.length === 0 && (
        <EmptyHackathons onClick={() => setOpen(true)} />
      )}

      {/* Popup */}
      <CreateHack
        open={open}
        onClose={() => setOpen(false)}
        onCreate={createHackathon}
      />
    </>
  );
}