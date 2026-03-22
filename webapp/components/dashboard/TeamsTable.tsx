/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Column,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import PptUploadModal from "@/components/dashboard/PptUploadModal";
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  Plus, Minus, UserPlus,
  GitCompare, Pencil, SlidersHorizontal, Save, Search, FileText, Upload,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";

interface Participant {
  participantId: number;
  name: string;
  githubUsername: string;
  linkedInURL: string;
  resumeURL: string;
  phNumber: string;
  email: string;
  teamId: string;
  memberScore?: {
    cI?: number;
    gI?: number;
    rI?: number;
  };
}

export interface Team {
  teamId: string;
  teamName: string;
  createdAt: string;
  hackathonId: string;
  participant: Participant[];
  totalScore?: number;
  teamResult?: {
    teamScore: number;
    selected: boolean;
    level: string;
  } | null;
}

export type TabType = "all" | "selected" | "unselected";

interface TeamsTableProps {
  teams: Team[];
  allTeams: Team[];
  hasAnalysisRun: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  selectedCount: number;
  unselectedCount: number;
  totalSpotsLimit: number;
  onDetails: (team: Team) => void;
  editMode: boolean;
  onEdit: () => void;
  onSave: () => void;
  onRemoveTeam: (teamId: string) => void;
  onAddTeam: (teamId: string) => void;
  compareMode: boolean;
  onCompare: () => void;
  checkedTeamIds: Set<string>;
  onToggleCheck: (teamId: string) => void;
  isSaving?: boolean;
  onFinalSave: () => void;
  isFinalSaving?: boolean;
  onModify: (type: "recluster" | "reselect") => void;
  isSaved?: boolean;
  isAllocated?: boolean;
  onViewJudges?: () => void;
  onAllocationDone?: () => void;
}

function SortHeader({ column, label }: { column: Column<Team, unknown>; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sorted === "asc" ? <ChevronUp className="w-3 h-3" />
        : sorted === "desc" ? <ChevronDown className="w-3 h-3" />
          : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  );
}

export default function TeamsTable({
  teams,
  allTeams,
  hasAnalysisRun,
  activeTab,
  onTabChange,
  selectedCount,
  unselectedCount,
  totalSpotsLimit,
  onDetails,
  editMode,
  onEdit,
  onSave,
  onRemoveTeam,
  onAddTeam,
  compareMode,
  onCompare,
  checkedTeamIds,
  onToggleCheck,
  onModify,
  isSaving = false,
  onFinalSave,
  isFinalSaving = false,
  isSaved = false,
  isAllocated = false,
  onViewJudges,
  onAllocationDone
}: TeamsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [modifyOpen, setModifyOpen] = useState(false);
  const [showFinalSaveDialog, setShowFinalSaveDialog] = useState(false);
  const [showPptUpload, setShowPptUpload] = useState(false);
  const modifyRef = useRef<HTMLDivElement>(null);

  const isOnSelectedTab = activeTab === "selected";
  const isOnUnselectedTab = activeTab === "unselected";
  const removeMode = editMode && isOnSelectedTab;
  const addMode = editMode && isOnUnselectedTab;
  const isAtLimit = selectedCount >= totalSpotsLimit;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modifyRef.current && !modifyRef.current.contains(e.target as Node)) {
        setModifyOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.teamName.toLowerCase().includes(q) ||
        t.participant.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q) ||
            (p.githubUsername || "").toLowerCase().includes(q)
        )
    );
  }, [teams, search]);

  const toggleExpand = (id: string) =>
    setExpandedRows((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const handleAddTeam = (teamId: string) => {
    if (isAtLimit) {
      toast.error(`Team limit reached — max ${totalSpotsLimit} teams allowed.`);
      return;
    }
    onAddTeam(teamId);
  };

  const handleEditClick = () => {
    onTabChange("selected");
    onEdit();
  };

  const columns = useMemo<ColumnDef<Team>[]>(() => {
    const cols: ColumnDef<Team>[] = [];

    if (compareMode) {
      cols.push({
        id: "compare",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const checked = checkedTeamIds.has(row.original.teamId);
          return <Checkbox checked={checked} onChange={() => onToggleCheck(row.original.teamId)} />;
        },
      });
    }

    cols.push({
      id: "index",
      header: "#",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{row.index + 1}</span>
      ),
    });

    cols.push({
      id: "teamName",
      accessorKey: "teamName",
      header: ({ column }) => <SortHeader column={column} label="Team Name" />,
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.teamId);
        return (
          <button
            onClick={() => toggleExpand(row.original.teamId)}
            className="flex items-center gap-2 group font-medium text-foreground text-left"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              className="inline-flex shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.span>
            {row.original.teamName}
          </button>
        );
      },
    });

    cols.push({
      id: "participantCount",
      accessorFn: (row) => row.participant.length,
      header: ({ column }) => <SortHeader column={column} label="Members" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.participant.length}</span>
      ),
    });

    cols.push({
      id: "totalScore",
      accessorFn: (row) => row.teamResult?.teamScore,
      header: ({ column }) => <SortHeader column={column} label="Score" />,
      cell: ({ row }) => {
        const score = row.original.teamResult?.teamScore;
        const level = row.original.teamResult?.level;

        const levelColor =
          level === "Advanced" ? "hsl(var(--accent))"
            : level === "Intermediate" ? "hsl(45, 90%, 55%)"
              : level === "Beginner" ? "hsl(200, 80%, 55%)"
                : "hsl(var(--muted-foreground))";

        return (
          <div className="flex items-center gap-2">
            {score !== undefined && score !== null ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold">{(score * 100).toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            ) : (
              <span className="text-muted-foreground/40 text-xs">—</span>
            )}
            {level && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  color: levelColor,
                  background: `${levelColor.replace(")", " / 0.1)").replace("hsl(", "hsl(")}`,
                  border: `1px solid ${levelColor.replace(")", " / 0.3)").replace("hsl(", "hsl(")}`,
                }}
              >
                {level}
              </span>
            )}
          </div>
        );
      },
    });

    cols.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDetails(team)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all"
              style={{ border: "1px solid hsl(var(--border) / 0.5)", color: "hsl(var(--muted-foreground))" }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "hsl(var(--foreground))";
                b.style.borderColor = "hsl(var(--accent) / 0.4)";
                b.style.background = "hsl(var(--accent) / 0.05)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "hsl(var(--muted-foreground))";
                b.style.borderColor = "hsl(var(--border) / 0.5)";
                b.style.background = "";
              }}
            >
              <FileText className="w-3 h-3" />
              Summary
            </button>

            {removeMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveTeam(team.teamId)}
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Minus className="w-3 h-3" />
              </Button>
            )}

            {addMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddTeam(team.teamId)}
                disabled={isAtLimit}
                className="h-6 w-6 transition-colors hover:bg-green-500/10"
                style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}
                onMouseEnter={(e) => {
                  if (!isAtLimit) {
                    (e.currentTarget as HTMLElement).style.color = "hsl(143, 40%, 55%)";
                    (e.currentTarget as HTMLElement).style.background = "hsl(143, 30%, 55% / 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground) / 0.4)";
                  (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      },
    });

    return cols;
  }, [compareMode, checkedTeamIds, expandedRows, removeMode, addMode, isAtLimit]);

  function ActionBtn({
    icon, label, onClick, active, accent, disabled,
  }: {
    icon: React.ReactNode; label: string; onClick: () => void;
    active?: boolean; accent?: boolean; disabled?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: accent ? "hsl(var(--accent))" : active ? "hsl(var(--accent) / 0.12)" : "transparent",
          color: accent ? "hsl(var(--accent-foreground))" : active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
          borderColor: accent ? "transparent" : active ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border) / 0.6)",
          boxShadow: accent ? "0 0 12px hsl(var(--accent) / 0.3)" : "none",
        }}
        onMouseEnter={(e) => {
          if (disabled || accent) return;
          (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
          (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
        }}
        onMouseLeave={(e) => {
          if (disabled || accent) return;
          (e.currentTarget as HTMLElement).style.color = active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))";
          (e.currentTarget as HTMLElement).style.borderColor = active ? "hsl(var(--accent) / 0.4)" : "hsl(var(--border) / 0.6)";
        }}
      >
        {icon}{label}
      </button>
    );
  }

  const table = useReactTable({
    data: filteredTeams,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const tabs = [
    { key: "selected" as TabType, label: "Selected", count: selectedCount },
    { key: "unselected" as TabType, label: "Unselected", count: unselectedCount },
    { key: "all" as TabType, label: "All", count: allTeams.length },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── Toolbar ── */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 shrink-0">
            {tabs.map((tab) => {
              if (!hasAnalysisRun && tab.key !== "all") return null;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-150"
                  style={{
                    color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    background: isActive ? "hsl(var(--muted) / 0.6)" : "transparent",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                      style={{
                        background: isActive ? "hsl(var(--accent) / 0.15)" : "hsl(var(--muted) / 0.4)",
                        color: isActive ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.6)",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-44 shrink-0">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
              style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-7 pl-7 pr-2.5 text-xs rounded-md focus:outline-none transition-colors"
              style={{
                background: "transparent",
                border: "1px solid hsl(var(--border) / 0.6)",
                color: "hsl(var(--foreground))",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(var(--accent) / 0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border) / 0.6)")}
            />
          </div>

          <div className="w-px h-4 shrink-0" style={{ background: "hsl(var(--border))" }} />

          {/* Action buttons */}
          {isSaved ? (
            <div className="flex items-center gap-1.5">
              {/* Upload PPT */}
              <button
                onClick={() => setShowPptUpload(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                  borderColor: "transparent",
                  boxShadow: "0 0 12px hsl(var(--accent) / 0.3)",
                }}
              >
                <Upload className="w-3 h-3" />
                Upload PPT
              </button>

              {/* Judges button — only after allocation */}
              {isAllocated && (
                <button
                  onClick={onViewJudges}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150"
                  style={{
                    background: "transparent",
                    border: "1px solid hsl(var(--border) / 0.6)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                    (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.6)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Users className="w-3 h-3" />
                  Judges
                </button>
              )}

              <PptUploadModal
                open={showPptUpload}
                onClose={() => setShowPptUpload(false)}
                hackathonId={teams[0]?.hackathonId ?? ""}
                onAllocationDone={() => {
                  setShowPptUpload(false);
                  onAllocationDone?.();
                }}
              />
            </div>
          ) : !editMode ? (
            <>
              {/* ── Modify dropdown ── */}
              <div ref={modifyRef} className="relative">
                <ActionBtn
                  icon={<SlidersHorizontal className="w-3 h-3" />}
                  label="Modify"
                  onClick={() => setModifyOpen((v) => !v)}
                  disabled={compareMode}
                  active={modifyOpen}
                />
                <AnimatePresence>
                  {modifyOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 z-50 flex flex-col overflow-hidden rounded-xl"
                      style={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border) / 0.6)",
                        boxShadow: "0 8px 32px hsl(0 0% 0% / 0.3)",
                        minWidth: "160px",
                      }}
                    >
                      {[
                        {
                          type: "recluster" as const,
                          label: "Re-cluster",
                          description: "Re-run data source scoring",
                          icon: <GitCompare className="w-3.5 h-3.5" />,
                        },
                        {
                          type: "reselect" as const,
                          label: "Re-selection",
                          description: "Adjust team quota & levels",
                          icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
                        },
                      ].map((opt, i) => (
                        <button
                          key={opt.type}
                          onClick={() => {
                            setModifyOpen(false);
                            onModify(opt.type);
                          }}
                          className="flex items-start gap-3 px-3.5 py-3 text-left transition-colors duration-100"
                          style={{
                            borderBottom: i === 0 ? "1px solid hsl(var(--border) / 0.4)" : "none",
                            color: "hsl(var(--muted-foreground))",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.4)";
                            (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                          }}
                        >
                          <span className="mt-0.5 shrink-0" style={{ color: "hsl(var(--accent))" }}>
                            {opt.icon}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-foreground">{opt.label}</p>
                            <p className="text-[10px] mt-0.5">{opt.description}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <ActionBtn
                icon={<GitCompare className="w-3 h-3" />}
                label={compareMode ? "Exit Compare" : "Compare"}
                onClick={onCompare}
                active={compareMode}
              />
              <ActionBtn
                icon={<Pencil className="w-3 h-3" />}
                label="Edit"
                onClick={handleEditClick}
                disabled={compareMode}
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: isAtLimit ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--accent) / 0.1)",
                    color: isAtLimit ? "hsl(var(--destructive))" : "hsl(var(--accent))",
                    border: `1px solid ${isAtLimit ? "hsl(var(--destructive) / 0.3)" : "hsl(var(--accent) / 0.3)"}`,
                  }}
                >
                  {selectedCount}/{totalSpotsLimit} teams
                </span>

                <ActionBtn
                  icon={
                    isSaving ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 rounded-full border border-current border-t-transparent"
                      />
                    ) : (
                      <Save className="w-3 h-3" />
                    )
                  }
                  label={isSaving ? "Saving..." : "Save Draft"}
                  onClick={onSave}
                  disabled={isSaving || isFinalSaving}
                />

                <ActionBtn
                  icon={
                    isFinalSaving ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 rounded-full border border-current border-t-transparent"
                      />
                    ) : (
                      <Save className="w-3 h-3" />
                    )
                  }
                  label={isFinalSaving ? "Saving..." : "Save"}
                  onClick={() => setShowFinalSaveDialog(true)}
                  accent
                  disabled={isSaving || isFinalSaving}
                />
              </div>

              {/* ── Final Save Confirmation Dialog ── */}
              <AnimatePresence>
                {showFinalSaveDialog && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-40"
                      style={{ background: "hsl(0 0% 0% / 0.5)" }}
                      onClick={() => setShowFinalSaveDialog(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                      <div
                        className="pointer-events-auto w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
                        style={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border) / 0.6)",
                          boxShadow: "0 24px 64px hsl(0 0% 0% / 0.5)",
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: "hsl(var(--destructive) / 0.1)",
                            border: "1px solid hsl(var(--destructive) / 0.3)",
                          }}
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="hsl(var(--destructive))"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </div>

                        <div className="flex flex-col gap-1">
                          <h3 className="text-base font-semibold text-foreground">
                            Finalise team selection?
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            You <span className="font-medium text-foreground">cannot change</span> the
                            selected teams after this. This action is final and cannot be undone.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setShowFinalSaveDialog(false)}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                            style={{
                              background: "transparent",
                              border: "1px solid hsl(var(--border) / 0.6)",
                              color: "hsl(var(--muted-foreground))",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.6)";
                              (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setShowFinalSaveDialog(false);
                              onFinalSave();
                            }}
                            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                            style={{
                              background: "hsl(var(--destructive))",
                              color: "hsl(var(--destructive-foreground))",
                              border: "1px solid transparent",
                              boxShadow: "0 0 16px hsl(var(--destructive) / 0.3)",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity = "0.9";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity = "1";
                            }}
                          >
                            Confirm & Save
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* ── Edit mode banner ── */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="shrink-0 flex items-center justify-between px-4 py-2"
              style={{
                background: isOnUnselectedTab ? "hsl(var(--accent) / 0.06)" : "hsl(var(--muted) / 0.3)",
                borderBottom: "1px solid hsl(var(--border) / 0.4)",
              }}
            >
              {isOnSelectedTab && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Remove teams from selection, or add more from unselected.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTabChange("unselected")}
                    className="h-6 gap-1.5 text-xs transition-colors hover:bg-green-500/15"
                    style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "hsl(143, 40%, 55%)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground) / 0.5)";
                    }}
                  >
                    <UserPlus className="w-3 h-3" />
                    Add teams
                  </Button>
                </>
              )}
              {isOnUnselectedTab && (
                <>
                  <p className="text-xs" style={{ color: isAtLimit ? "hsl(var(--destructive))" : "hsl(var(--accent))" }}>
                    {isAtLimit
                      ? `Limit reached — remove a team from Selected to add more.`
                      : `Click + to add teams. ${totalSpotsLimit - selectedCount} spot${totalSpotsLimit - selectedCount !== 1 ? "s" : ""} remaining.`}
                  </p>
                  <button
                    onClick={() => onTabChange("selected")}
                    className="text-xs underline"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    ← Back to selected
                  </button>
                </>
              )}
              {activeTab === "all" && (
                <p className="text-xs text-muted-foreground">
                  Switch to Selected or Unselected tab to edit.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent"
                  style={{ borderColor: "hsl(var(--border) / 0.4)" }}
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedRows.has(row.original.teamId);
                  const isChecked = compareMode && checkedTeamIds.has(row.original.teamId);

                  return (
                    <React.Fragment key={row.original.teamId}>
                      <TableRow
                        data-state={isChecked ? "selected" : undefined}
                        style={{ borderColor: "hsl(var(--border) / 0.2)" }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>

                      <AnimatePresence>
                        {isExpanded && (
                          <tr
                            key={`${row.original.teamId}-expanded`}
                            style={{
                              background: "hsl(var(--muted) / 0.08)",
                              borderBottom: "1px solid hsl(var(--border) / 0.15)",
                            }}
                          >
                            <td colSpan={columns.length} className="px-10 py-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="py-2">
                                  {row.original.participant.map((p, i) => (
                                    <div
                                      key={p.participantId}
                                      className="flex items-start gap-4 py-2.5 text-xs"
                                      style={{
                                        borderBottom:
                                          i < row.original.participant.length - 1
                                            ? "1px solid hsl(var(--border) / 0.1)"
                                            : "none",
                                      }}
                                    >
                                      {/* Avatar */}
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                                        style={{
                                          background: `hsl(${(i * 70) % 360}, 55%, 20%)`,
                                          color: `hsl(${(i * 70) % 360}, 80%, 65%)`,
                                          border: `1px solid hsl(${(i * 70) % 360}, 60%, 30%)`,
                                        }}
                                      >
                                        {p.name.charAt(0).toUpperCase()}
                                      </span>

                                      {/* Name + email + phone */}
                                      <div className="flex flex-col gap-0.5 w-36 shrink-0">
                                        <span className="font-medium text-foreground truncate">{p.name}</span>
                                        <span className="text-muted-foreground/60 truncate">{p.email}</span>
                                        {p.phNumber && (
                                          <span className="text-muted-foreground/40 truncate">{p.phNumber}</span>
                                        )}
                                      </div>

                                      {/* Links */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {p.githubUsername && (
                                          <a
                                            href={`https://github.com/${p.githubUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
                                            style={{
                                              background: "hsl(220, 15%, 11%)",
                                              border: "1px solid hsl(220, 20%, 20%)",
                                              color: "hsl(220, 15%, 65%)",
                                            }}
                                            onMouseEnter={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(220, 15%, 85%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(220, 20%, 35%)";
                                            }}
                                            onMouseLeave={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(220, 15%, 65%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(220, 20%, 20%)";
                                            }}
                                          >
                                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                            </svg>
                                            <span className="font-mono">@{p.githubUsername}</span>
                                          </a>
                                        )}

                                        {p.linkedInURL && (
                                          <a
                                            href={p.linkedInURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
                                            style={{
                                              background: "hsl(210, 40%, 10%)",
                                              border: "1px solid hsl(210, 40%, 20%)",
                                              color: "hsl(210, 70%, 58%)",
                                            }}
                                            onMouseEnter={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(210, 70%, 75%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(210, 40%, 35%)";
                                            }}
                                            onMouseLeave={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(210, 70%, 58%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(210, 40%, 20%)";
                                            }}
                                          >
                                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                            </svg>
                                            <span>LinkedIn</span>
                                          </a>
                                        )}

                                        {p.resumeURL && (
                                          <a
                                            href={p.resumeURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
                                            style={{
                                              background: "hsl(270, 30%, 10%)",
                                              border: "1px solid hsl(270, 30%, 20%)",
                                              color: "hsl(270, 50%, 65%)",
                                            }}
                                            onMouseEnter={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(270, 50%, 80%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(270, 30%, 35%)";
                                            }}
                                            onMouseLeave={(e) => {
                                              (e.currentTarget as HTMLElement).style.color = "hsl(270, 50%, 65%)";
                                              (e.currentTarget as HTMLElement).style.borderColor = "hsl(270, 30%, 20%)";
                                            }}
                                          >
                                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                              <polyline points="14 2 14 8 20 8" />
                                              <line x1="16" y1="13" x2="8" y2="13" />
                                              <line x1="16" y1="17" x2="8" y2="17" />
                                              <polyline points="10 9 9 9 8 9" />
                                            </svg>
                                            <span>Resume</span>
                                          </a>
                                        )}
                                      </div>

                                      {/* Personal score */}
                                      <div className="ml-auto shrink-0 flex items-center gap-1.5">
                                        {p.memberScore?.gI !== undefined || p.memberScore?.rI !== undefined ? (
                                          <div className="flex items-center gap-1.5">
                                            {p.memberScore?.gI !== undefined && (
                                              <div
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                                                style={{
                                                  background: "hsl(220, 15%, 11%)",
                                                  border: "1px solid hsl(220, 20%, 20%)",
                                                }}
                                              >
                                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="hsl(220, 15%, 65%)">
                                                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                                </svg>
                                                <span className="font-mono text-[10px]" style={{ color: "hsl(220, 15%, 65%)" }}>
                                                  {((p.memberScore.gI ?? 0) * 100).toFixed(0)}
                                                </span>
                                              </div>
                                            )}
                                            {p.memberScore?.rI !== undefined && (
                                              <div
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                                                style={{
                                                  background: "hsl(270, 30%, 10%)",
                                                  border: "1px solid hsl(270, 30%, 20%)",
                                                }}
                                              >
                                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="hsl(270, 50%, 65%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                  <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                                <span className="font-mono text-[10px]" style={{ color: "hsl(270, 50%, 65%)" }}>
                                                  {((p.memberScore.rI ?? 0) * 100).toFixed(0)}
                                                </span>
                                              </div>
                                            )}
                                            {p.memberScore?.cI !== undefined && (
                                              <div
                                                className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                                                style={{
                                                  background: "hsl(var(--accent) / 0.15)",
                                                  border: "1px solid hsl(var(--accent) / 0.4)",
                                                }}
                                              >
                                                <span
                                                  className="font-mono text-[10px] font-semibold"
                                                  style={{ color: "hsl(var(--accent))" }}
                                                >
                                                  {((p.memberScore.cI ?? 0) * 100).toFixed(0)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/30 font-mono">no score</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    {search ? `No teams match "${search}"` : "No teams here."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 py-2 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
        >
          <span className="text-xs text-muted-foreground">
            {filteredTeams.length} of {teams.length} team{teams.length !== 1 ? "s" : ""}
            {search && " matching"}
          </span>
          <div className="flex items-center gap-3">
            {editMode && (
              <span
                className="text-xs font-mono"
                style={{
                  color: isAtLimit ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))",
                }}
              >
                {isAtLimit
                  ? "Team limit reached"
                  : `${totalSpotsLimit - selectedCount} spot${totalSpotsLimit - selectedCount !== 1 ? "s" : ""} remaining`}
              </span>
            )}
            {compareMode && checkedTeamIds.size > 0 && (
              <span className="text-xs" style={{ color: "hsl(var(--accent))" }}>
                {checkedTeamIds.size} selected for comparison
              </span>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider >
  );
}