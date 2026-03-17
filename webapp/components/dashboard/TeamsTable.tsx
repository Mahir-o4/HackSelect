"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ScrollText } from "lucide-react";

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

interface TeamsTableProps {
  teams: Team[];
  onSelectTeam: (team: Team) => void;
  selectedTeamId?: string;
}

export default function TeamsTable({ teams, onSelectTeam, selectedTeamId }: TeamsTableProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium w-10 border-r border-border/20">#</th>
            <th className="text-left px-5 py-3 font-medium border-r border-border/20">Team Name</th>
            <th className="text-left px-5 py-3 font-medium border-r border-border/20">Participants</th>
            <th className="text-left px-5 py-3 font-medium border-r border-border/20">Total Score</th>
            <th className="text-left px-5 py-3 font-medium">Summary</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const isExpanded = expandedTeams.has(team.teamId);
            const isSelected = selectedTeamId === team.teamId;

            return (
              <React.Fragment key={team.teamId}>
                <tr
                  className={`border-b border-border/20 transition-colors ${
                    isSelected ? "bg-accent/5" : "hover:bg-muted/20"
                  }`}
                >
                  <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs border-r border-border/20">
                    {index + 1}
                  </td>

                  <td className="px-5 py-3.5 font-medium text-foreground border-r border-border/20">
                    <button
                      onClick={() => toggleExpand(team.teamId)}
                      className="flex items-center gap-2 group"
                    >
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </motion.span>
                      <span>{team.teamName}</span>
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-muted-foreground border-r border-border/20">
                    {team.participant.length}
                  </td>

                  <td className="px-5 py-3.5 font-mono border-r border-border/20">
                    {team.totalScore !== undefined ? (
                      <span className="text-foreground">{team.totalScore}</span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onSelectTeam(team)}
                      title="View summary"
                      className={`p-1.5 rounded-lg border transition-all ${
                        isSelected
                          ? "border-accent/60 bg-accent/10 text-foreground"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5"
                      }`}
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Collapsible participants row */}
                <AnimatePresence>
                  {isExpanded && (
                    <tr className="border-b border-border/10 bg-muted/10">
                      <td className="border-r border-border/20" />
                      <td colSpan={4} className="px-5 py-3">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul>
                            {team.participant.map((p) => (
                              <li
                                key={p.participantId}
                                className="flex items-center gap-4 text-xs py-2 border-b border-border/10 last:border-0"
                              >
                                <span className="font-medium text-foreground w-36 shrink-0 truncate">
                                  {p.name}
                                </span>
                                <span className="text-muted-foreground/70 truncate flex-1">
                                  {p.email}
                                </span>
                                <span className="text-muted-foreground/50 w-28 shrink-0">
                                  {p.phNumber}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}

          {teams.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground text-sm">
                No teams found for this hackathon.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}