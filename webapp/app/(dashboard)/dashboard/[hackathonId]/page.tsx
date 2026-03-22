"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";

import HackathonHeader from "@/components/dashboard/HackathonHeader";
import TeamsTable, { Team, TabType } from "@/components/dashboard/TeamsTable";
import SummaryDrawer from "@/components/dashboard/SummaryDrawer";
import ComparePanel from "@/components/dashboard/ComparePanel";
import AnalysisLoader from "@/components/dashboard/AnalysisLoader";
import { FilterModal, FieldsData } from "@/components/dashboard/FilterModal";
import ChatBot from "@/components/dashboard/ChatBot";
import { toast } from "sonner";

type AppState = "loading_teams" | "idle" | "filter" | "analysing" | "results" | "recluster" | "reselect";

export default function HackathonDashboardPage() {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const searchParams = useSearchParams();

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [hackathonName, setHackathonName] = useState("");
  const [appState, setAppState] = useState<AppState>("loading_teams");

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [editMode, setEditMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [checkedTeamIds, setCheckedTeamIds] = useState<Set<string>>(new Set());
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null);
  const [spotsLimit, setSpotsLimit] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFinalSaving, setIsFinalSaving] = useState(false);
  const [isAllocated, setIsAllocated] = useState(false);

  const router = useRouter();

  /* useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch teams
        const teamsRes = await fetch(`/api/teams?hackathonId=${hackathonId}`);
        const teamsJson = await teamsRes.json();
        if (teamsJson.success) {
          setAllTeams(teamsJson.data);
          const name = teamsJson.data?.[0]?.hackathon?.name;
          if (name) setHackathonName(name);
        }

        // After fetching teams, check hackathon saved status
        const hackRes = await fetch(`/api/hackathon/${hackathonId}`);
        const hackJson = await hackRes.json();
        if (hackJson.success && hackJson.data.saved) {
          setIsSaved(true);
        }
        

        // 2. Check if selection already exists
        const selRes = await fetch(`/api/teams/${hackathonId}/selected`);

        if (selRes.ok) {
          const selJson = await selRes.json();
          if (selJson.success && selJson.data.length > 0) {
            setSelectedTeamIds(new Set(selJson.data.map((t: { teamId: string }) => t.teamId)));
            setSpotsLimit(selJson.data.length);
            setActiveTab("selected");
            setAppState("results");
            return; // skip autorun check — selection already exists
          }
        }

        // 3. No selection yet — check autorun flag
        const autorun = searchParams.get("autorun") === "true";
        setAppState(autorun ? "analysing" : "idle");

      } catch (err) {
        console.error(err);
        setAppState("idle");
      }
    };
    if (hackathonId) fetchData();
  }, [hackathonId]);*/

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch teams
        const teamsRes = await fetch(`/api/teams?hackathonId=${hackathonId}`);
        const teamsJson = await teamsRes.json();
        if (teamsJson.success) {
          setAllTeams(teamsJson.data);
          const name = teamsJson.data?.[0]?.hackathon?.name;
          if (name) setHackathonName(name);
        }

        // Check hackathon saved status
        const hackRes = await fetch(`/api/hackathon/${hackathonId}`);
        const hackJson = await hackRes.json();
        if (hackJson.success && hackJson.data.saved) {
          setIsSaved(true);

          // Check if allocation has already been done
          const pptRes = await fetch(`/api/ppt-upload?hackathonId=${hackathonId}`);
          const pptJson = await pptRes.json();
          if (pptJson.success && pptJson.data.some((p: any) => p.assignment !== null)) {
            setIsAllocated(true);
          }
        }

        // 2. Check if selection already exists
        const selRes = await fetch(`/api/teams/${hackathonId}/selected`);
        if (selRes.ok) {
          const selJson = await selRes.json();
          if (selJson.success && selJson.data.length > 0) {
            setSelectedTeamIds(new Set(selJson.data.map((t: { teamId: string }) => t.teamId)));
            setSpotsLimit(selJson.data.length);
            setActiveTab("selected");
            setAppState("results");
            return;
          }
        }

        // 3. No selection yet — check autorun flag
        const autorun = searchParams.get("autorun") === "true";
        setAppState(autorun ? "analysing" : "idle");

      } catch (err) {
        console.error(err);
        setAppState("idle");
      }
    };

    if (hackathonId) fetchData();
  }, [hackathonId]);  // ← make sure this closing is here

  const handleFinalSave = async () => {
    setIsFinalSaving(true);
    try {
      const res = await fetch(`/api/hackathon/${hackathonId}/save`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to finalise.");
        return;
      }
      toast.success("Selection finalised — no further changes allowed.");
      setIsSaved(true);
      setEditMode(false);
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setIsFinalSaving(false);
    }
  };

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

  // Called when pipeline SSE completes
  const handleAnalysisComplete = async () => {
    try {
      const res = await fetch(`/api/teams?hackathonId=${hackathonId}`);
      const json = await res.json();
      if (json.success) setAllTeams(json.data);
    } catch (err) {
      console.error(err);
    }
    // Remove autorun from URL so refresh doesn't retrigger pipeline
    window.history.replaceState({}, "", `/dashboard/${hackathonId}`);
    setAppState("idle");
  };

  // Called when autoselect completes — sets real selected IDs from API
  /*const handleFilterNext = (data: FieldsData) => {
    setSelectedTeamIds(new Set(data.selectedTeamIds));
    setSpotsLimit(data.totalTeams);
    setActiveTab("selected");
    setAppState("results");
  };*/
  const handleFilterNext = async (data: FieldsData) => {
    setSelectedTeamIds(new Set(data.selectedTeamIds));
    setSpotsLimit(data.totalTeams);
    setActiveTab("selected");
    setAppState("results");
    try {
      const res = await fetch(`/api/teams?hackathonId=${hackathonId}`);
      const json = await res.json();
      if (json.success) setAllTeams(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExitCompare = () => {
    setCompareMode(false);
    setCheckedTeamIds(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:8000/teams/${hackathonId}/selection`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_team_ids: Array.from(selectedTeamIds),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.detail ?? "Failed to save selection.");
        return;
      }
      toast.success(`Selection saved — ${json.total_selected} teams selected.`);
      setEditMode(false);
    } catch {
      toast.error("Could not reach the pipeline server.");
    } finally {
      setIsSaving(false);
    }
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
        hackathonId={hackathonId}
        totalTeams={allTeams.length}
        spots={appState === "results" ? selectedTeamIds.size : undefined}
      />

      {/* Filter screen */}
      {appState === "filter" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="w-full max-w-md rounded-2xl"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border) / 0.6)",
              boxShadow: "0 20px 60px hsl(0 0% 0% / 0.3)",
            }}
          >
            <div className="px-6 pt-5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                Analysis Settings
              </p>
              <h2 className="text-lg font-bold text-foreground">Configure Filter</h2>
            </div>
            <FilterModal
              hackathonId={hackathonId}
              onNext={handleFilterNext}
              onBack={() => setAppState("idle")}
            />
          </div>
        </div>
      )}

      {/* Analysis loading — pipeline SSE */}
      {appState === "analysing" && (
        <div className="flex-1">
          <AnalysisLoader
            hackathonId={hackathonId}
            onComplete={handleAnalysisComplete}
          />
        </div>
      )}

      {/* Idle or Results: show TeamsTable */}
      {(appState === "idle" || appState === "results") && (
        <TeamsTable
          onModify={(type) => setAppState(type === "recluster" ? "recluster" : "reselect")}
          onSave={handleSave}
          isSaving={isSaving}
          totalSpotsLimit={spotsLimit}
          onAllocationDone={() => setIsAllocated(true)}
          isAllocated={isAllocated}
          onViewJudges={() => router.push(`/dashboard/${hackathonId}/judges`)}
          teams={tableTeams}
          allTeams={allTeams}
          hasAnalysisRun={appState === "results"}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
          }}
          selectedCount={selectedTeams.length}
          unselectedCount={unselectedTeams.length}
          onDetails={setDetailsTeam}
          editMode={editMode}
          onFinalSave={handleFinalSave}
          isFinalSaving={isFinalSaving}
          isSaved={isSaved}
          onEdit={() => {
            setEditMode(true)
            setIsSaving(false)
          }}
          onRemoveTeam={(id) =>
            setSelectedTeamIds((prev) => {
              const s = new Set(prev);
              s.delete(id);
              return s;
            })
          }
          onAddTeam={(id) =>
            setSelectedTeamIds((prev) => new Set([...prev, id]))
          }
          compareMode={compareMode}
          onCompare={() => {
            if (compareMode) handleExitCompare();
            else setCompareMode(true);
          }}
          checkedTeamIds={checkedTeamIds}
          onToggleCheck={(id) =>
            setCheckedTeamIds((prev) => {
              const s = new Set(prev);
              s.has(id) ? s.delete(id) : s.add(id);
              return s;
            })
          }
        />
      )}

      {/* Idle CTA */}
      {appState === "idle" && (
        <div
          className="px-6 py-4 shrink-0 flex items-center justify-between"
          style={{
            borderTop: "1px solid hsl(var(--border) / 0.4)",
            background: "hsl(var(--muted) / 0.1)",
          }}
        >
          <p className="text-xs text-muted-foreground">
            Run analysis to sort & score teams using ML
          </p>
          <button
            onClick={() => setAppState("filter")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 0 20px hsl(var(--accent) / 0.3)",
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Run Analysis
          </button>
        </div>
      )}

      {appState === "recluster" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.6)", boxShadow: "0 20px 60px hsl(0 0% 0% / 0.3)" }}>
            <div className="px-6 pt-5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Re-cluster</p>
              <h2 className="text-lg font-bold text-foreground">Data Sources</h2>
            </div>
            <FilterModal
              hackathonId={hackathonId}
              mode="recluster"
              onNext={handleFilterNext}
              onBack={() => setAppState("results")}
            />
          </div>
        </div>
      )}

      {appState === "reselect" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.6)", boxShadow: "0 20px 60px hsl(0 0% 0% / 0.3)" }}>
            <div className="px-6 pt-5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Re-select</p>
              <h2 className="text-lg font-bold text-foreground">Team Quota</h2>
            </div>
            <FilterModal
              hackathonId={hackathonId}
              mode="reselect"
              onNext={handleFilterNext}
              onBack={() => setAppState("results")}
            />
          </div>
        </div>
      )}

      <SummaryDrawer team={detailsTeam} onClose={() => setDetailsTeam(null)} />

      <AnimatePresence>
        {compareMode && (
          <ComparePanel teams={checkedTeams} onClose={handleExitCompare} />
        )}
      </AnimatePresence>

      {appState === "results" && <ChatBot hackathonId={hackathonId} />}
    </div>
  );
}