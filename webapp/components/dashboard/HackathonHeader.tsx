"use client";

interface HackathonHeaderProps {
  hackathonName: string;
  totalParticipants: number;
  totalTeams: number;
  spots?: number;
}

export default function HackathonHeader({
  hackathonName,
  totalParticipants,
  totalTeams,
  spots,
}: HackathonHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-border/40">
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
  );
}