/* eslint-disable react-hooks/set-state-in-effect */
//THIS COMPONENT IS NOT USED - NOT FINAL CODE
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SendHorizonal, GitCompare, User, Sparkles } from "lucide-react";

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

interface Team {
  teamId: string;
  teamName: string;
  createdAt: string;
  hackathonId: string;
  participant: Participant[];
  totalScore?: number;
}

interface Message {
  id: string;
  role: "user" | "system";
  content: string;
}

interface TeamSummaryPanelProps {
  team: Team | null;
  onClose: () => void;
}

function ParticipantBubble({ participant }: { participant: Participant }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-accent" />
      </div>
      <div className="flex-1 bg-muted/30 border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{participant.name}</p>
        <p className="text-xs text-muted-foreground">{participant.email}</p>
        <p className="text-xs text-muted-foreground">{participant.phNumber}</p>
      </div>
    </div>
  );
}

export default function TeamSummaryPanel({ team, onClose }: TeamSummaryPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when team changes
  useEffect(() => {
    setMessages([]);
    setHasStarted(false);
    setInput("");
  }, [team?.teamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const value = text ?? input.trim();
    if (!value || !team) return;

    if (!hasStarted) setHasStarted(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    // Placeholder system response (swap with real AI call later)
    const systemMsg: Message = {
      id: crypto.randomUUID(),
      role: "system",
      content: `Here's a summary of **${team.teamName}**: the team has ${team.participant.length} member${team.participant.length !== 1 ? "s" : ""}${team.totalScore !== undefined ? ` with a total score of ${team.totalScore}` : ""}. Members include ${team.participant.map((p) => p.name).join(", ")}.`,
    };

    setMessages((prev) => [...prev, userMsg, systemMsg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <AnimatePresence>
      {team && (
        <motion.aside
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 h-full w-95 bg-background border-l border-border/60 shadow-2xl z-40 flex flex-col overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-3">
              {/* Compare badge */}
              <button
                title="Compare teams"
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-all"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-mono">{team.teamName}</p>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {!hasStarted ? (
              /* Hero empty state */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center justify-center h-full gap-5 text-center pb-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground">
                    Gather a summary about this team
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-52 leading-relaxed">
                    Ask anything about {team.teamName} — members, scores, or a quick overview.
                  </p>
                </div>

                {/* Participant list as chips */}
                <div className="flex flex-wrap gap-2 justify-center max-w-64">
                  {team.participant.map((p) => (
                    <ParticipantBubble key={p.participantId} participant={p} />
                  ))}
                </div>

                {/* Quick prompts */}
                <div className="flex flex-col gap-2 w-full max-w-64">
                  {[
                    "Summarise this team",
                    "List all members",
                    "What's the team score?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-xs text-left px-3 py-2 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground hover:border-accent/30 hover:bg-accent/5 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Chat messages */
              <>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-br-sm"
                          : "bg-muted/40 border border-border/30 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* ── Input bar ── */}
          <div className="px-4 py-3 border-t border-border/40 shrink-0">
            <div className="flex items-center gap-2 bg-muted/30 border border-border/40 rounded-xl px-3 py-2 focus-within:border-accent/40 focus-within:bg-accent/5 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this team..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <SendHorizonal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}