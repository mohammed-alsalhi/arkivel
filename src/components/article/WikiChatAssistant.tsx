"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Source = { title: string; slug: string };

export default function WikiChatAssistant({ articleTitle }: { articleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive slug from URL
  const articleSlug =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/^\/articles\//, "").split("/")[0]
      : "";

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, articleSlug, history: next.slice(-8) }),
      });
      const data = await res.json();
      const sources: Source[] = data.sources ?? [];
      let reply = data.reply ?? data.error ?? "Sorry, I couldn't get a response.";
      if (sources.length > 0) {
        reply +=
          "\n\n**Sources:** " +
          sources.map((s) => `[${s.title}](/articles/${s.slug})`).join(", ");
      }
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Request failed. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? "Close wiki assistant" : "Ask the wiki assistant"}
        className="fixed bottom-16 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-opacity hover:opacity-90"
        aria-label="Wiki chat assistant"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M17 2H3a1 1 0 00-1 1v11a1 1 0 001 1h3l3 3 3-3h5a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-28 left-3 right-3 z-40 flex max-h-[460px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl sm:left-auto sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <span className="min-w-0 truncate text-[12px] font-semibold text-foreground">
              Ask about: {articleTitle}
            </span>
            <button
              onClick={() => setMessages([])}
              title="Clear conversation"
              className="text-[10px] text-muted hover:text-foreground ml-2 shrink-0"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-[12px]">
            {messages.length === 0 && (
              <p className="text-muted text-center py-4">
                Ask a question about this article or the wiki.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-2.5 py-1.5 whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface border border-border text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-muted">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 p-2 border-t border-border bg-surface">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-accent"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded bg-accent text-accent-foreground disabled:opacity-40 hover:opacity-90"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
