/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  ExternalLink, Plus, Minus,
  GitCompare, Pencil, SlidersHorizontal, Save, Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";

// ── Types ────────────────────────────────────────────────────────────────────
interface Participant {
  participantId: number;
  name: string;
  githubUsername: string;
  linkedInURL: string;
  resumeURL: string;
  phNumber: string;
  email: string;
  teamId: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  createdAt: string;
  hackathonId: string;
  participant: Participant[];
  totalScore?: number;
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
  onModify: () => void;
}

// ── Action button ────────────────────────────────────────────────────────────
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
    >
      {icon}{label}
    </button>
  );
}

// ── Sortable column header ───────────────────────────────────────────────────
function SortHeader({ column, label }: { column: any; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sorted === "asc" ? (
        <ChevronUp className="w-3 h-3" />
      ) : sorted === "desc" ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function TeamsTable({
  teams,
  allTeams,
  hasAnalysisRun,
  activeTab,
  onTabChange,
  selectedCount,
  unselectedCount,
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
}: TeamsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const addMode = activeTab === "unselected" && editMode;
  const removeMode = activeTab === "selected" && editMode;

  // Client-side search filter across team name + participant fields
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

  // ── Column definitions ─────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Team>[]>(() => {
    const cols: ColumnDef<Team>[] = [];

    if (compareMode) {
      cols.push({
        id: "compare",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const checked = checkedTeamIds.has(row.original.teamId);
          return (
            <Checkbox checked={checked} onChange={() => onToggleCheck(row.original.teamId)} />
          );
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
      accessorKey: "totalScore",
      header: ({ column }) => <SortHeader column={column} label="Score" />,
      cell: ({ row }) =>
        row.original.totalScore !== undefined ? (
          <span className="font-mono font-semibold">{row.original.totalScore}</span>
        ) : (
          <span className="text-muted-foreground/40 text-xs">—</span>
        ),
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
              <ExternalLink className="w-3 h-3" />
              Details
            </button>
            {removeMode && (
              <button
                onClick={() => onRemoveTeam(team.teamId)}
                className="w-6 h-6 rounded-md flex items-center justify-center border"
                style={{ border: "1px solid hsl(var(--destructive) / 0.4)", color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.05)" }}
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
            {addMode && (
              <button
                onClick={() => onAddTeam(team.teamId)}
                className="w-6 h-6 rounded-md flex items-center justify-center border"
                style={{ border: "1px solid hsl(var(--accent) / 0.4)", color: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.05)" }}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    });

    return cols;
  }, [compareMode, checkedTeamIds, expandedRows, removeMode, addMode]);

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
    <div className="flex-1 overflow-hidden flex flex-col">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
      >
        {/* Tabs — left side */}
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

        {/* Spacer pushes search + actions to the right */}
        <div className="flex-1" />

        {/* Search — small, right-aligned */}
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

        {/* Separator */}
        <div className="w-px h-4 shrink-0" style={{ background: "hsl(var(--border))" }} />

        {/* Action buttons — all 3 always shown after analysis */}
        {hasAnalysisRun && (
          <div className="flex items-center gap-1.5 shrink-0">
            <ActionBtn
              icon={<SlidersHorizontal className="w-3 h-3" />}
              label="Modify"
              onClick={onModify}
              disabled={editMode || compareMode}
            />
            <ActionBtn
              icon={<GitCompare className="w-3 h-3" />}
              label={compareMode ? "Exit Compare" : "Compare"}
              onClick={onCompare}
              active={compareMode}
              disabled={editMode}
            />
            {editMode ? (
              <ActionBtn
                icon={<Save className="w-3 h-3" />}
                label="Save"
                onClick={onSave}
                accent
              />
            ) : (
              <ActionBtn
                icon={<Pencil className="w-3 h-3" />}
                label="Edit"
                onClick={onEdit}
                disabled={compareMode}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
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

                    {/* Expanded sub-row */}
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
                                    className="flex items-center gap-5 py-1.5 text-xs"
                                    style={{
                                      borderBottom:
                                        i < row.original.participant.length - 1
                                          ? "1px solid hsl(var(--border) / 0.1)"
                                          : "none",
                                    }}
                                  >
                                    <span
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                      style={{
                                        background: `hsl(${(i * 70) % 360}, 55%, 20%)`,
                                        color: `hsl(${(i * 70) % 360}, 80%, 65%)`,
                                        border: `1px solid hsl(${(i * 70) % 360}, 60%, 30%)`,
                                      }}
                                    >
                                      {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="font-medium text-foreground w-32 shrink-0 truncate">{p.name}</span>
                                    <span className="text-muted-foreground/70 flex-1 truncate">{p.email}</span>
                                    {p.githubUsername && (
                                      <span className="text-muted-foreground/50 font-mono shrink-0">@{p.githubUsername}</span>
                                    )}
                                    <span className="text-muted-foreground/40 w-24 shrink-0 text-right">{p.phNumber}</span>
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-2 shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
      >
        <span className="text-xs text-muted-foreground">
          {filteredTeams.length} of {teams.length} team{teams.length !== 1 ? "s" : ""}
          {search && " matching"}
        </span>
        {compareMode && checkedTeamIds.size > 0 && (
          <span className="text-xs" style={{ color: "hsl(var(--accent))" }}>
            {checkedTeamIds.size} selected for comparison
          </span>
        )}
      </div>
    </div>
  );
}