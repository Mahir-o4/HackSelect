"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
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
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, ExternalLink, Tag, Search } from "lucide-react";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Team {
    teamId: string;
    teamName: string;
}

interface PptSubmission {
    id: string;
    fileUrl: string;
    categories: string[];
    score?: number | null;
    team: Team;
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

function SortHeader({ column, label }: { column: Column<Assignment, unknown>; label: string }) {
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

export default function PublicJudgePage() {
    const params = useParams();
    const judgeId = params.judgeId as string;

    const [judge, setJudge] = useState<Judge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!judgeId) return;
        fetch(`/api/judges/${judgeId}`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success) setJudge(json.data);
                else setError("Judge not found.");
            })
            .catch(() => setError("Could not load judge data."))
            .finally(() => setLoading(false));
    }, [judgeId]);

    const assignments = judge?.assignments ?? [];

    const filteredAssignments = useMemo(() => {
        if (!search.trim()) return assignments;
        const q = search.toLowerCase();
        return assignments.filter(
            (a) =>
                a.ppt.team.teamName.toLowerCase().includes(q) ||
                a.ppt.categories.some((c) => c.toLowerCase().includes(q))
        );
    }, [assignments, search]);

    const columns = useMemo<ColumnDef<Assignment>[]>(() => [
        {
            id: "index",
            header: "#",
            enableSorting: false,
            cell: ({ row }) => (
                <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                        background: `hsl(${(row.index * 55 + 210) % 360}, 40%, 16%)`,
                        color: `hsl(${(row.index * 55 + 210) % 360}, 60%, 62%)`,
                    }}
                >
                    {row.index + 1}
                </span>
            ),
        },
        {
            id: "team",
            accessorFn: (row) => row.ppt.team.teamName,
            header: ({ column }) => <SortHeader column={column} label="Team" />,
            cell: ({ row }) => (
                <span className="font-medium text-foreground">
                    {row.original.ppt.team.teamName}
                </span>
            ),
        },
        {
            id: "categories",
            header: "Categories",
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.ppt.categories.length > 0 ? (
                        row.original.ppt.categories.map((c) => (
                            <span
                                key={c}
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{
                                    background: "hsl(var(--muted) / 0.5)",
                                    color: "hsl(var(--muted-foreground))",
                                    border: "1px solid hsl(var(--border) / 0.4)",
                                }}
                            >
                                {c}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                </div>
            ),
        },
        {
            id: "match",
            accessorFn: (row) => row.isPrimaryMatch,
            header: ({ column }) => <SortHeader column={column} label="Match" />,
            cell: ({ row }) => (
                <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                        background: row.original.isPrimaryMatch
                            ? "hsl(var(--accent) / 0.1)"
                            : "hsl(var(--muted) / 0.4)",
                        border: `1px solid ${row.original.isPrimaryMatch
                            ? "hsl(var(--accent) / 0.3)"
                            : "hsl(var(--border) / 0.3)"}`,
                        color: row.original.isPrimaryMatch
                            ? "hsl(var(--accent))"
                            : "hsl(var(--muted-foreground))",
                    }}
                >
                    {row.original.isPrimaryMatch ? "Primary" : "Fallback"}
                </span>
            ),
        },
        {
            id: "score",
            accessorFn: (row) => row.ppt.score ?? -1,
            header: ({ column }) => <SortHeader column={column} label="Score" />,
            cell: ({ row }) => (
                row.original.ppt.score != null ? (
                    <div className="flex items-center justify-center gap-1">
                        <span
                            className="font-mono font-semibold text-sm"
                            style={{ color: "hsl(var(--accent))" }}
                        >
                            {row.original.ppt.score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/100</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                )
            ),
        },
        {
            id: "ppt",
            header: "PPT",
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button variant="ghost" size="sm" asChild>
                        <a
                            href={row.original.ppt.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 text-xs"
                        >
                            <FileText className="w-3 h-3" />
                            View PPT
                            <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </Button>
                </div>
            ),
        },
    ], []);

    const table = useReactTable({
        data: filteredAssignments,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full gap-3">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                    style={{ color: "hsl(var(--accent))" }}
                />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (error || !judge) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
            </div>
        );
    }

    const scoredCount = judge.assignments.filter(a => a.ppt.score != null).length;

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Header ── */}
            <div
                className="px-6 py-4 shrink-0"
                style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}
            >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                    Judge Portal
                </p>
                <h1 className="text-xl font-bold text-foreground font-mono">{judge.name}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{judge.email}</p>

                {judge.specialisations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {judge.specialisations.map((s) => (
                            <span
                                key={s}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{
                                    background: "hsl(var(--accent) / 0.1)",
                                    border: "1px solid hsl(var(--accent) / 0.25)",
                                    color: "hsl(var(--accent))",
                                }}
                            >
                                <Tag className="w-2.5 h-2.5" />
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Search ── */}
            <div
                className="px-4 py-2 shrink-0 flex items-center justify-between"
                style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
            >
                <span className="text-xs text-muted-foreground">
                    {filteredAssignments.length} of {judge.assignments.length} team{judge.assignments.length !== 1 ? "s" : ""}
                    {search && " matching"}
                </span>
                <div className="relative w-44">
                    <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                        style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teams..."
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
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                {judge.assignments.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">No teams assigned yet.</p>
                    </div>
                ) : table.getRowModel().rows.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">No teams match &ldquo;{search}&rdquo;</p>
                    </div>
                ) : (
                    <Table>
                        <TableCaption>
                            {judge.assignments.length} team{judge.assignments.length !== 1 ? "s" : ""} assigned &middot;{" "}
                            {scoredCount} scored
                        </TableCaption>

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
                            {table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.original.id}
                                    style={{ borderColor: "hsl(var(--border) / 0.2)" }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>

                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="text-xs text-muted-foreground">
                                    {judge.assignments.length} team{judge.assignments.length !== 1 ? "s" : ""} assigned
                                </TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                    {scoredCount} scored
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    </Table>
                )}
            </div>
        </div>
    );
}