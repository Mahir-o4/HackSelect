"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { ChevronDown, ChevronUp, ChevronsUpDown, Share2, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

function SortHeader({ column, label }: { column: Column<Judge, unknown>; label: string }) {
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

export default function JudgesPage() {
    const params = useParams();
    const hackathonId = params.hackathonId as string;

    const [judges, setJudges] = useState<Judge[]>([]);
    const [loading, setLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [search, setSearch] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sharePopup, setSharePopup] = useState<string | null>(null);

    useEffect(() => {
        const loadJudges = async () => {
            try {
                const res = await fetch(`/api/judges?hackathonId=${hackathonId}`);
                const json = await res.json();
                if (json.success) setJudges(json.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (hackathonId) loadJudges();
    }, [hackathonId]);

    const toggleExpand = (id: string) =>
        setExpandedRows((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });

    const filteredJudges = useMemo(() => {
        if (!search.trim()) return judges;
        const q = search.toLowerCase();
        return judges.filter(
            (j) =>
                j.name.toLowerCase().includes(q) ||
                j.email.toLowerCase().includes(q) ||
                j.specialisations.some((s) => s.toLowerCase().includes(q))
        );
    }, [judges, search]);

    const columns = useMemo<ColumnDef<Judge>[]>(() => [
        {
            id: "index",
            header: "#",
            enableSorting: false,
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {row.index + 1}
                </span>
            ),
        },
        {
            id: "name",
            accessorKey: "name",
            header: ({ column }) => <SortHeader column={column} label="Name" />,
            cell: ({ row }) => {
                const judge = row.original;
                const isExpanded = expandedRows.has(judge.id);
                const hue = (row.index * 55 + 210) % 360;
                return (
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
                );
            },
        },
        {
            id: "email",
            accessorKey: "email",
            header: ({ column }) => <SortHeader column={column} label="Email" />,
            cell: ({ row }) => (
                <span className="text-xs font-mono text-muted-foreground">{row.original.email}</span>
            ),
        },
        {
            id: "specialisations",
            header: "Specialisations",
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.specialisations.length > 0 ? (
                        row.original.specialisations.map((spec) => (
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
            ),
        },
        {
            id: "pptCount",
            accessorFn: (row) => row.assignments.length,
            header: ({ column }) => <SortHeader column={column} label="PPTs" />,
            cell: ({ row }) => (
                <span
                    className="inline-block font-mono text-xs px-2 py-0.5 rounded-full"
                    style={{
                        background: row.original.assignments.length > 0
                            ? "hsl(var(--accent) / 0.1)"
                            : "hsl(var(--muted) / 0.5)",
                        border: `1px solid ${row.original.assignments.length > 0
                            ? "hsl(var(--accent) / 0.25)"
                            : "hsl(var(--border) / 0.3)"}`,
                        color: row.original.assignments.length > 0
                            ? "hsl(var(--accent))"
                            : "hsl(var(--muted-foreground) / 0.4)",
                    }}
                >
                    {row.original.assignments.length}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSharePopup(row.original.id)}
                        className="text-xs h-6"
                    >
                        <Share2 className="w-3 h-3" />
                        Share
                    </Button>
                </div>
            ),
        },
    ], [expandedRows, toggleExpand]);

    const table = useReactTable({
        data: filteredJudges,
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

            {/* ── Search toolbar ── */}
            <div
                className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
            >
                <span className="text-xs text-muted-foreground">
                    {filteredJudges.length} of {judges.length} judge{judges.length !== 1 ? "s" : ""}
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
                        placeholder="Search judges..."
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
                                const judge = row.original;
                                const isExpanded = expandedRows.has(judge.id);

                                return (
                                    <React.Fragment key={judge.id}>
                                        <TableRow style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
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
                                                    <td colSpan={columns.length} className="px-10 py-0">
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
                                                                            <span className="font-medium text-foreground w-40 shrink-0 truncate">
                                                                                {a.ppt.team.teamName}
                                                                            </span>

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
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                    {search ? `No judges match "${search}"` : "No judges here."}
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
                    {judges.length} judge{judges.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                    {totalAssignments} total assignment{totalAssignments !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Share popup ── */}
            <AnimatePresence>
                {sharePopup && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            style={{ background: "hsl(0 0% 0% / 0.4)" }}
                            onClick={() => setSharePopup(null)}
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
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-base font-semibold text-foreground">Share Judge Link</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Send this link to the judge — they can view their assigned teams without logging in.
                                    </p>
                                </div>

                                <div
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                                    style={{
                                        background: "hsl(var(--muted) / 0.3)",
                                        border: "1px solid hsl(var(--border) / 0.5)",
                                    }}
                                >
                                    <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                                        {typeof window !== "undefined"
                                            ? `${window.location.origin}/dashboard/${hackathonId}/judges/${sharePopup}`
                                            : ""}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSharePopup(null)}
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
                                            const url = `${window.location.origin}/dashboard/${hackathonId}/judge/${sharePopup}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success("Link copied to clipboard!");
                                            setSharePopup(null);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                        style={{
                                            background: "hsl(var(--accent))",
                                            color: "hsl(var(--accent-foreground))",
                                            boxShadow: "0 0 16px hsl(var(--accent) / 0.3)",
                                        }}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}