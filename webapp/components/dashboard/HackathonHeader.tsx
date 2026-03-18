"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HackathonHeaderProps {
  hackathonName: string;
  totalParticipants: number;
  totalTeams: number;
  hackathonId: string;
  spots?: number;
}

export default function HackathonHeader({
  hackathonName,
  totalParticipants,
  totalTeams,
  hackathonId,
  spots,
}: HackathonHeaderProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendMail = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathonId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send emails");
        return;
      }

      toast.success(`Emails sent to ${data.sent} participants`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
          Dashboard
        </p>
        <h1 className="text-xl font-bold text-foreground font-mono">
          {hackathonName}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {totalParticipants} participants &middot; {totalTeams} teams
          {spots !== undefined && <> &middot; {spots} spots</>}
        </p>
      </div>

      <button
        onClick={handleSendMail}
        disabled
        //disabled={isSending}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Mail className="w-3.5 h-3.5" />
        )}
        {isSending ? "Sending..." : "Send Mail"}
      </button>
    </div>
  );
}