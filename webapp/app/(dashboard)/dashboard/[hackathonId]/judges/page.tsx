"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Share2, Copy } from "lucide-react";
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

export default function JudgesPage() {
    const { hackathonId } = useParams<{ hackathonId: string }>();
    const [judges, setJudges] = useState<Judge[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [sharePopup, setSharePopup] = useState<string | null>(null); // stores judgeId

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

    const handleShare = (judgeId: string) => {
        const url = `${window.location.origin}/dashboard/${hackathonId}/judge/${judgeId}`;
        navigator.clipboard.writeText(url);
    };

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

                    <TableBody>
                        {judges.map((judge, i) => {
                            const isExpanded = expandedRows.has(judge.id);
                            const hue = (i * 55 + 210) % 360;

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
                                                onClick={() => setSharePopup(judge.id)}
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

            {/* Share popup */}
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

                                {/* URL display */}
                                <div
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                                    style={{
                                        background: "hsl(var(--muted) / 0.3)",
                                        border: "1px solid hsl(var(--border) / 0.5)",
                                    }}
                                >
                                    <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                                        {typeof window !== "undefined"
                                            ? `${window.location.origin}/dashboard/${hackathonId}/judge/${sharePopup}`
                                            : ""}
                                    </span>
                                </div>

                                {/* Actions */}
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