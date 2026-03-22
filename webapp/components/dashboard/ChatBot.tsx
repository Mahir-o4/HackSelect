"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ChatBotProps {
  hackathonId: string;
}

const PIPELINE_BASE = process.env.NEXT_PUBLIC_PIPELINE_URL ?? "http://localhost:8000";

const QUICK_PROMPTS = [
  "List all teams",
  "Who has the highest composite score?",
  "Which team has the most GitHub stars?",
  "Show hackathon ready participants",
];

function getSessionCookie(hackathonId: string): string | null {
  const key = `agent_session_${hackathonId}`;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${key}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function setSessionCookie(hackathonId: string, sessionId: string) {
  const key = `agent_session_${hackathonId}`;
  document.cookie = `${key}=${encodeURIComponent(sessionId)}; path=/; SameSite=Strict`;
}

function deleteSessionCookie(hackathonId: string) {
  const key = `agent_session_${hackathonId}`;
  document.cookie = `${key}=; path=/; max-age=0; SameSite=Strict`;
}

export default function ChatBot({ hackathonId }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = getSessionCookie(hackathonId);
    if (saved) setSessionId(saved);
  }, [hackathonId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;

    setInput("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${PIPELINE_BASE}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          hackathon_id: hackathonId,
          session_id: sessionId ?? null,
          message: value,
        }),
        signal: controller.signal,
      });

      if (res.status === 400) {
        deleteSessionCookie(hackathonId);
        setSessionId(null);
        setMessages([]);
        toast.error("Session expired — starting a fresh conversation.");
        return;
      }

      if (!res.ok) throw new Error("Failed to reach agent.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body.");

      let buffer = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === "meta") {
              setSessionId(event.session_id);
              setSessionCookie(hackathonId, event.session_id);
            }

            if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + event.data }
                    : m
                )
              );
            }

            if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: event.data, streaming: false }
                    : m
                )
              );
            }

            if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, streaming: false } : m
                )
              );
            }
          } catch {
            // malformed event — skip
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "Something went wrong. Please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, streaming: false } : m
        )
      );
    }
  };

  const handleClear = async () => {
    if (sessionId) {
      try {
        await fetch(`${PIPELINE_BASE}/agent/chat/${sessionId}`, { method: "DELETE" });
      } catch {
        // ignore
      }
      deleteSessionCookie(hackathonId);
    }
    setMessages([]);
    setSessionId(null);
    setInput("");
    toast.success("Conversation cleared.");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl w-[25vw] h-[70vh]"
            style={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border) / 0.6)",
              boxShadow: "0 20px 60px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "hsl(var(--accent) / 0.15)",
                    border: "1px solid hsl(var(--accent) / 0.3)",
                  }}
                >
                  <Bot className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">DevDraft AI</p>
                  <p className="text-[10px]">
                    {isStreaming ? (
                      <span style={{ color: "hsl(var(--accent))" }}>Thinking...</span>
                    ) : sessionId ? (
                      <span style={{ color: "hsl(143, 60%, 50%)" }}>Session active</span>
                    ) : (
                      <span className="text-muted-foreground">Ask me about your teams</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center h-full gap-4 text-center"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "hsl(var(--accent) / 0.1)",
                      border: "1px solid hsl(var(--accent) / 0.2)",
                    }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--accent))" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-foreground">How can I help?</p>
                    <p className="text-xs text-muted-foreground max-w-52 leading-relaxed">
                      {sessionId
                        ? "Your previous session is still active. Continue the conversation."
                        : "Ask me anything about the hackathon teams, scores, or selection."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="text-xs text-left px-3 py-2 rounded-xl transition-all"
                        style={{
                          border: "1px solid hsl(var(--border) / 0.5)",
                          color: "hsl(var(--muted-foreground))",
                          background: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--accent) / 0.3)";
                          (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.05)";
                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border) / 0.5)";
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))";
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mb-0.5"
                          style={{
                            background: "hsl(var(--accent) / 0.15)",
                            border: "1px solid hsl(var(--accent) / 0.3)",
                          }}
                        >
                          <Bot className="w-3 h-3" style={{ color: "hsl(var(--accent))" }} />
                        </div>
                      )}

                      <div
                        className="max-w-[80%] px-3 py-2 text-xs leading-relaxed"
                        style={{
                          background: msg.role === "user"
                            ? "hsl(var(--accent))"
                            : "hsl(var(--muted) / 0.5)",
                          color: msg.role === "user"
                            ? "hsl(var(--accent-foreground))"
                            : "hsl(var(--foreground))",
                          border: msg.role === "assistant"
                            ? "1px solid hsl(var(--border) / 0.3)"
                            : "none",
                          borderRadius: msg.role === "user"
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                        }}
                      >
                        {msg.content ? (
                          msg.role === "assistant" ? (
                            <MarkdownRenderer content={msg.content} />
                          ) : (
                            msg.content
                          )
                        ) : (
                          // Bouncing dots while waiting for first token
                          <motion.div className="flex gap-1 py-0.5">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1 h-1 rounded-full"
                                style={{ background: "hsl(var(--accent))" }}
                                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 shrink-0"
              style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: "hsl(var(--muted) / 0.3)",
                  border: "1px solid hsl(var(--border) / 0.5)",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? "Waiting for response..." : "Ask about teams..."}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  className="p-1 rounded-lg transition-all disabled:opacity-30"
                  style={{ color: "hsl(var(--accent))" }}
                  onMouseEnter={(e) => {
                    if (input.trim() && !isStreaming)
                      (e.currentTarget as HTMLElement).style.background = "hsl(var(--accent) / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
        style={{
          background: open ? "hsl(var(--muted))" : "hsl(var(--accent))",
          border: open ? "1px solid hsl(var(--border))" : "none",
          boxShadow: open
            ? "none"
            : "0 0 24px hsl(var(--accent) / 0.4), 0 4px 12px hsl(0 0% 0% / 0.3)",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Bot className="w-5 h-5 text-accent-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}