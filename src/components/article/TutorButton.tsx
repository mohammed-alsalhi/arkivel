"use client";

import { useState, useRef, useEffect } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

type Message = { role: "user" | "assistant"; content: string };

type Props = { articleId: string; articleTitle: string };

export default function TutorButton({ articleId, articleTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function start() {
    setStarted(true);
    setLoading(true);
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, messages: [] }),
    });
    if (res.ok) {
      const { reply } = await res.json();
      setMessages([{ role: "assistant", content: reply }]);
    }
    setLoading(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, messages: newMessages }),
    });
    if (res.ok) {
      const { reply } = await res.json();
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); if (!started) start(); }}
        className="ui-button"
        title="Study this article with an AI tutor"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
        Tutor me
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`AI tutor: ${articleTitle}`}
            className="relative z-10 w-full max-w-lg bg-background border border-border rounded shadow-2xl flex flex-col"
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
              <div>
                <p className="text-[11px] font-semibold uppercase text-accent">AI Tutor</p>
                <p className="text-[13px] font-medium text-heading truncate">{articleTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMessages([]); setStarted(false); start(); }}
                  className="ui-button"
                  title="Restart session"
                >
                  Restart
                </button>
                <button onClick={() => setOpen(false)} className="ui-icon-button" title="Close tutor">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {!started && (
                <div className="flex items-center justify-center h-32">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent text-accent-foreground rounded-br-none"
                        : "bg-surface border border-border text-foreground rounded-bl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && messages.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border px-3 py-2 rounded-lg rounded-bl-none flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-surface rounded-b-lg">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Answer or ask a question… (Enter to send)"
                  disabled={loading || !started}
                  rows={2}
                  className="flex-1 border border-border bg-background px-3 py-1.5 text-[13px] resize-none focus:border-accent focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim() || !started}
                  className="px-3 bg-accent text-accent-foreground rounded disabled:opacity-50 hover:bg-accent-hover transition-colors self-end py-1.5 text-[12px]"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
