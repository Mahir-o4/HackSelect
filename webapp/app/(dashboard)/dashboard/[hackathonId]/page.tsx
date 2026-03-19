"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";

import HackathonHeader from "@/components/dashboard/HackathonHeader";
import TeamsTable, { Team, TabType } from "@/components/dashboard/TeamsTable";
import DetailsDrawer from "@/components/dashboard/DetailsDrawer";
import ComparePanel from "@/components/dashboard/ComparePanel";
import AnalysisLoader from "@/components/dashboard/AnalysisLoader";
import { FilterModal } from "@/components/dashboard/FilterModal";

type AppState = "loading_teams" | "idle" | "filter" | "analysing" | "results";

export default function HackathonDashboardPage() {
  const { hackathonId } = useParams<{ hackathonId: string }>();

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [hackathonName, setHackathonName] = useState("");
  const [appState, setAppState] = useState<AppState>("loading_teams");

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [editMode, setEditMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [checkedTeamIds, setCheckedTeamIds] = useState<Set<string>>(new Set());
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/teams?hackathonId=${hackathonId}`);
        const json = await res.json();
        if (json.success) {
          setAllTeams(json.data);
          const name = json.data?.[0]?.hackathon?.name;
          if (name) setHackathonName(name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAppState("idle");
      }
    };
    if (hackathonId) fetchData();
  }, [hackathonId]);

  const selectedTeams = allTeams.filter((t) => selectedTeamIds.has(t.teamId));
  const unselectedTeams = allTeams.filter((t) => !selectedTeamIds.has(t.teamId));
  const checkedTeams = allTeams.filter((t) => checkedTeamIds.has(t.teamId));
  const totalParticipants = allTeams.reduce((sum, t) => sum + t.participant.length, 0);

  const tableTeams =
    appState !== "results"
      ? allTeams
      : activeTab === "selected"
      ? selectedTeams
      : activeTab === "unselected"
      ? unselectedTeams
      : allTeams;

  const handleAnalysisComplete = () => {
    const half = Math.ceil(allTeams.length / 2);
    setSelectedTeamIds(new Set(allTeams.slice(0, half).map((t) => t.teamId)));
    setActiveTab("selected");
    setAppState("results");
  };

  const handleExitCompare = () => {
    setCompareMode(false);
    setCheckedTeamIds(new Set());
  };

  if (appState === "loading_teams") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground animate-pulse">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <HackathonHeader
        hackathonName={hackathonName || hackathonId}
        totalParticipants={totalParticipants}
        totalTeams={allTeams.length}
        hackathonId={hackathonId}
        spots={appState === "results" ? selectedTeamIds.size : undefined}
      />

      {/* Filter screen */}
      {appState === "filter" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.6)", boxShadow: "0 20px 60px hsl(0 0% 0% / 0.3)" }}>
            <div className="px-6 pt-5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Analysis Settings</p>
              <h2 className="text-lg font-bold text-foreground">Configure Filter</h2>
            </div>
            <FilterModal onNext={() => setAppState("analysing")} onBack={() => setAppState("idle")} />
          </div>
        </div>
      )}

      {/* Analysis loading */}
      {appState === "analysing" && (
        <div className="flex-1">
          <AnalysisLoader onComplete={handleAnalysisComplete} />
        </div>
      )}

      {/* Idle or Results: show TeamsTable (which contains its own tab bar) */}
      {(appState === "idle" || appState === "results") && (
        <TeamsTable
          teams={tableTeams}
          allTeams={allTeams}
          hasAnalysisRun={appState === "results"}
          activeTab={activeTab}
          onTabChange={(tab) => { setActiveTab(tab); setEditMode(false); }}
          selectedCount={selectedTeams.length}
          unselectedCount={unselectedTeams.length}
          onDetails={setDetailsTeam}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onSave={() => setEditMode(false)}
          onRemoveTeam={(id) => setSelectedTeamIds((prev) => { const s = new Set(prev); s.delete(id); return s; })}
          onAddTeam={(id) => setSelectedTeamIds((prev) => new Set([...prev, id]))}
          compareMode={compareMode}
          onCompare={() => { if (compareMode) handleExitCompare(); else setCompareMode(true); }}
          checkedTeamIds={checkedTeamIds}
          onToggleCheck={(id) => setCheckedTeamIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; })}
          onModify={() => setAppState("filter")}
        />
      )}

      {/* Idle CTA */}
      {appState === "idle" && (
        <div className="px-6 py-4 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.4)", background: "hsl(var(--muted) / 0.1)" }}>
          <p className="text-xs text-muted-foreground">Run analysis to sort & score teams using ML</p>
          <button onClick={() => setAppState("filter")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", boxShadow: "0 0 20px hsl(var(--accent) / 0.3)" }}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Run Analysis
          </button>
        </div>
      )}

      <DetailsDrawer team={detailsTeam} onClose={() => setDetailsTeam(null)} />

      <AnimatePresence>
        {compareMode && <ComparePanel teams={checkedTeams} onClose={handleExitCompare} />}
      </AnimatePresence>
    </div>
  );
}