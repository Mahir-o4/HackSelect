"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import HackathonHeader from "@/components/dashboard/HackathonHeader";
import TeamsTable, { Team } from "@/components/dashboard/TeamsTable";
import TeamSummaryPanel from "@/components/dashboard/TeamSummaryPanel";

export default function HackathonDashboardPage() {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [hackathonName, setHackathonName] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsRes = await fetch(`/api/teams?hackathonId=${hackathonId}`);
        const teamsJson = await teamsRes.json();
        if (teamsJson.success) {
          setTeams(teamsJson.data);
          const name = teamsJson.data?.[0]?.hackathon?.name;
          if (name) setHackathonName(name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (hackathonId) fetchData();
  }, [hackathonId]);

  const totalParticipants = teams.reduce(
    (sum, team) => sum + team.participant.length,
    0
  );

  const handleSelectTeam = (team: Team) => {
    // toggle off if same team clicked again
    setSelectedTeam((prev) => (prev?.teamId === team.teamId ? null : team));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground animate-pulse">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <HackathonHeader
        hackathonName={hackathonName || hackathonId}
        totalParticipants={totalParticipants}
        totalTeams={teams.length}
      />
      <div className="flex-1 overflow-hidden flex">
        <TeamsTable
          teams={teams}
          onSelectTeam={handleSelectTeam}
          selectedTeamId={selectedTeam?.teamId}
        />
      </div>

      {/* Separate chat-style summary panel */}
      <TeamSummaryPanel
        team={selectedTeam}
        onClose={() => setSelectedTeam(null)}
      />
    </div>
  );
}