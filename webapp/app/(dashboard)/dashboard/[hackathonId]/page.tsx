"use client";

<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
=======
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
>>>>>>> 63f55eaadc448ab38516833eddb3118509c2fa9e

interface PptSubmission {
  id: string;
  fileUrl: string;
  categories: string[];
  score?: number | null;
  team: { teamId: string; teamName: string };
}

interface Assignment {
  id: string;
  isPrimaryMatch: boolean;
  ppt: PptSubmission;
}

interface Judge {
  id: string;
  name: string;
  email: string;
  specialisations: string[];
  assignments: Assignment[];
}

<<<<<<< HEAD
export default function JudgesPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadJudges = async () => {
      try {
        const res = await fetch(`/api/judges?hackathonId=${hackathonId}`);
        const json = await res.json();
        if (json.success) setJudges(json.data);
=======
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

>>>>>>> 63f55eaadc448ab38516833eddb3118509c2fa9e
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
<<<<<<< HEAD
    if (hackathonId) loadJudges();
  }, [hackathonId]);
=======
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
>>>>>>> 63f55eaadc448ab38516833eddb3118509c2fa9e

  const toggleExpand = (id: string) =>
    setExpandedRows((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground animate-pulse">Loading judges...</p>
      </div>
    );
  }

  if (!judges.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-sm text-muted-foreground">No judges found for this hackathon.</p>
        <p className="text-xs text-muted-foreground/60">
          Add judges when creating the hackathon, or run PPT allocation first.
        </p>
      </div>
    );
  }

  const totalAssignments = judges.reduce((s, j) => s + j.assignments.length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div
        className="px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
      >
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
          Dashboard
        </p>
        <h1 className="text-xl font-bold text-foreground font-mono">Judge Assignments</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {judges.length} judge{judges.length !== 1 ? "s" : ""} &middot; {totalAssignments} PPTs assigned
        </p>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Specialisations</TableHead>
              <TableHead className="text-center w-20">PPTs</TableHead>
              <TableHead className="text-right w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>

<<<<<<< HEAD
          <TableBody>
            {judges.map((judge, i) => {
              const isExpanded = expandedRows.has(judge.id);
              const hue = (i * 55 + 210) % 360;
=======
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
>>>>>>> 63f55eaadc448ab38516833eddb3118509c2fa9e

              return (
                <React.Fragment key={judge.id}>
                  <TableRow
                    style={{ borderColor: "hsl(var(--border) / 0.2)" }}
                  >
                    {/* # */}
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(judge.id)}
                        className="flex items-center gap-2 group font-medium text-foreground text-left"
                      >
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.18 }}
                          className="inline-flex shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </motion.span>
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{
                            background: `hsl(${hue}, 40%, 16%)`,
                            border: `1px solid hsl(${hue}, 40%, 26%)`,
                            color: `hsl(${hue}, 60%, 62%)`,
                          }}
                        >
                          {judge.name.charAt(0).toUpperCase()}
                        </span>
                        {judge.name}
                      </button>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {judge.email}
                      </span>
                    </TableCell>

                    {/* Specialisations */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {judge.specialisations.length > 0 ? (
                          judge.specialisations.map((spec) => (
                            <span
                              key={spec}
                              className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: "hsl(var(--accent) / 0.1)",
                                border: "1px solid hsl(var(--accent) / 0.25)",
                                color: "hsl(var(--accent))",
                              }}
                            >
                              {spec}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* PPT count badge */}
                    <TableCell className="text-center">
                      <span
                        className="inline-block font-mono text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: judge.assignments.length > 0
                            ? "hsl(var(--accent) / 0.1)"
                            : "hsl(var(--muted) / 0.5)",
                          border: `1px solid ${judge.assignments.length > 0
                            ? "hsl(var(--accent) / 0.25)"
                            : "hsl(var(--border) / 0.3)"}`,
                          color: judge.assignments.length > 0
                            ? "hsl(var(--accent))"
                            : "hsl(var(--muted-foreground) / 0.4)",
                        }}
                      >
                        {judge.assignments.length}
                      </span>
                    </TableCell>

                    {/* Share */}
                    <TableCell className="text-right">
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => void 0}
                        className="gap-1.5 h-7 text-xs px-3"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* ── Expanded PPT assignments ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <tr
                        key={`${judge.id}-expanded`}
                        style={{
                          background: "hsl(var(--muted) / 0.08)",
                          borderBottom: "1px solid hsl(var(--border) / 0.15)",
                        }}
                      >
                        <td colSpan={6} className="px-10 py-0">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            {judge.assignments.length === 0 ? (
                              <p className="py-3 text-xs text-muted-foreground/50">
                                No PPTs assigned yet.
                              </p>
                            ) : (
                              <div className="py-2">
                                {judge.assignments.map((a, ai) => (
                                  <div
                                    key={a.id}
                                    className="flex items-center gap-4 py-2.5 text-xs"
                                    style={{
                                      borderBottom:
                                        ai < judge.assignments.length - 1
                                          ? "1px solid hsl(var(--border) / 0.1)"
                                          : "none",
                                    }}
                                  >
                                    {/* Team name */}
                                    <span className="font-medium text-foreground w-40 shrink-0 truncate">
                                      {a.ppt.team.teamName}
                                    </span>

                                    {/* Categories */}
                                    <div className="flex flex-wrap gap-1 flex-1">
                                      {a.ppt.categories.length > 0 ? (
                                        a.ppt.categories.map((cat) => (
                                          <span
                                            key={cat}
                                            className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{
                                              background: "hsl(var(--muted) / 0.5)",
                                              border: "1px solid hsl(var(--border) / 0.4)",
                                              color: "hsl(var(--muted-foreground))",
                                            }}
                                          >
                                            {cat}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-muted-foreground/40">No categories</span>
                                      )}
                                    </div>

                                    {/* Primary / Fallback badge */}
                                    <span
                                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                      style={{
                                        background: a.isPrimaryMatch
                                          ? "hsl(143, 60%, 50% / 0.1)"
                                          : "hsl(var(--muted) / 0.4)",
                                        border: `1px solid ${a.isPrimaryMatch
                                          ? "hsl(143, 60%, 50% / 0.3)"
                                          : "hsl(var(--border) / 0.3)"}`,
                                        color: a.isPrimaryMatch
                                          ? "hsl(143, 60%, 50%)"
                                          : "hsl(var(--muted-foreground))",
                                      }}
                                    >
                                      {a.isPrimaryMatch ? "Primary" : "Fallback"}
                                    </span>

                                    {/* PPT link */}
                                    {a.ppt.fileUrl && (
                                      <a
                                        href={a.ppt.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 text-[10px] underline underline-offset-2 transition-colors"
                                        style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}
                                        onMouseEnter={(e) => {
                                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--accent))";
                                        }}
                                        onMouseLeave={(e) => {
                                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground) / 0.6)";
                                        }}
                                      >
                                        View PPT ↗
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer ── */}
      <div
        className="px-4 py-2 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
      >
        <span className="text-xs text-muted-foreground">
          {judges.length} judge{judges.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-muted-foreground">
          {totalAssignments} total assignment{totalAssignments !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}