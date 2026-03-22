"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, ExternalLink, Tag, Users } from "lucide-react";

interface Team {
    teamId: string;
    teamName: string;
}

interface PptSubmission {
    id: string;
    fileUrl: string;
    categories: string[];
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

export default function PublicJudgePage() {
    const { hackathonId, judgeId } = useParams<{ hackathonId: string; judgeId: string }>();
    const [judge, setJudge] = useState<Judge | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen gap-3">
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
            <div className="flex items-center justify-center h-screen">
                <p className="text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Judge Portal
                </p>
                <h1 className="text-2xl font-bold text-foreground">{judge.name}</h1>
                <p className="text-sm text-muted-foreground">{judge.email}</p>

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

            {/* Teams */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">
                        Assigned Teams
                        <span
                            className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                            style={{
                                background: "hsl(var(--accent) / 0.1)",
                                color: "hsl(var(--accent))",
                            }}
                        >
                            {judge.assignments.length}
                        </span>
                    </p>
                </div>

                {judge.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        No teams assigned yet.
                    </p>
                ) : (
                    judge.assignments.map((a, i) => (
                        <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-4 px-4 py-3 rounded-xl"
                            style={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border) / 0.5)",
                            }}
                        >
                            {/* Index */}
                            <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{
                                    background: `hsl(${(i * 55 + 210) % 360}, 40%, 16%)`,
                                    color: `hsl(${(i * 55 + 210) % 360}, 60%, 62%)`,
                                }}
                            >
                                {i + 1}
                            </span>

                            {/* Team info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {a.ppt.team.teamName}
                                </p>
                                {a.ppt.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {a.ppt.categories.map((c) => (
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
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Primary badge */}
                            {a.isPrimaryMatch && (
                                <span
                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                                    style={{
                                        background: "hsl(var(--accent) / 0.1)",
                                        border: "1px solid hsl(var(--accent) / 0.3)",
                                        color: "hsl(var(--accent))",
                                    }}
                                >
                                    Primary
                                </span>
                            )}

                            {/* PPT link */}
                            <a
                                href={a.ppt.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
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
                                <FileText className="w-3 h-3" />
                                View PPT
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}