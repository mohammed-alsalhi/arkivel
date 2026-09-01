"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

type Source = { title: string; slug: string; excerpt: string };
type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources: Source[] };

const SUGGESTED_OPENERS = [
  "What are the main themes across all my articles?",
  "Summarise everything I know about",
  "What articles relate to",
  "What's the difference between",
  "Give me an overview of",
];

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: **bold**, `code`, headings, bullet lines
  const lines = text.split("\n");
  return (
    <div className="text-[14px] leading-relaxed text-foreground space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### "))
          return (
            <p key={i} className="font-semibold text-heading text-[13px] uppercase mt-3 mb-0.5">
              {line.slice(4)}
            </p>
          );
        if (line.startsWith("## "))
          return (
            <p key={i} className="font-bold text-heading text-[15px] mt-3">
              {line.slice(3)}
            </p>
          );
        if (line.startsWith("# "))
          return (
            <p key={i} className="font-bold text-heading text-[17px] mt-3">
              {line.slice(2)}
            </p>
          );
        if (line.startsWith("- ") || line.startsWith("* "))
          return (
            <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-accent">
              {renderInline(line.slice(2))}
            </p>
          );
        if (/^\d+\.\s/.test(line)) {
          const m = line.match(/^(\d+)\.\s(.*)/)!;
          return (
            <p key={i} className="pl-3">
              <span className="text-accent font-semibold mr-1.5">{m[1]}.</span>
              {renderInline(m[2])}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-heading">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-surface-hover px-1 rounded text-[12px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || streaming) return;
      setInput("");

      const userMsg: Message = { role: "user", content: q };
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg]);

      // Placeholder assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", sources: [] },
      ]);
      setStreaming(true);

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: q, history }),
        });

        if (!res.body) throw new Error("No body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop()!;

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;
            try {
              const event = JSON.parse(raw);
              if (event.type === "sources") {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last.role === "assistant") {
                    next[next.length - 1] = { ...last, sources: event.sources };
                  }
                  return next;
                });
              } else if (event.type === "token") {
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last.role === "assistant") {
                    next[next.length - 1] = {
                      ...last,
                      content: last.content + event.token,
                    };
                  }
                  return next;
                });
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.role === "assistant" && last.content === "") {
            next[next.length - 1] = {
              ...last,
              content: "Sorry, an error occurred. Please try again.",
            };
          }
          return next;
        });
        console.error(err);
      }

      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [input, messages, streaming]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-accent transition-colors text-[13px]">
            ← Wiki
          </Link>
          <span className="text-border">|</span>
          <span className="text-[15px] font-semibold text-heading">Ask my wiki</span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded border border-accent/20 ml-1">
            AI Oracle
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[12px] text-muted hover:text-foreground transition-colors"
          >
            Clear conversation
          </button>
        )}
      </header>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center h-full px-4 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-heading mb-2">Ask my wiki</h1>
            <p className="text-[14px] text-muted mb-8 leading-relaxed">
              Ask anything — I&apos;ll search your entire knowledge base and synthesise an answer from your articles.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_OPENERS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s + " "); inputRef.current?.focus(); }}
                  className="text-left px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 transition-colors text-[13px] text-foreground"
                >
                  {s}&hellip;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] bg-accent text-accent-foreground px-4 py-2.5 rounded rounded-tr-sm text-[14px]">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[95%] space-y-3">
                    {/* Sources */}
                    {msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {msg.sources.map((s) => (
                          <Link
                            key={s.slug}
                            href={`/articles/${s.slug}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border bg-surface rounded-full text-muted hover:text-accent hover:border-accent/40 transition-colors"
                            title={s.excerpt}
                          >
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* Answer */}
                    <div className="bg-surface border border-border rounded rounded-tl-sm px-4 py-3">
                      {msg.content ? (
                        <MarkdownText text={msg.content} />
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted text-[13px]">
                          <span className="inline-flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                          </span>
                          <span>Searching wiki&hellip;</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your wiki…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none border border-border rounded bg-background px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-50 leading-relaxed"
            style={{ minHeight: 42, maxHeight: 140 }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 140) + "px";
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="h-[42px] w-[42px] rounded bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 transition-colors shrink-0"
            title="Send (Enter)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="max-w-2xl mx-auto text-[11px] text-muted mt-1.5 pl-1">
          Enter to send · Shift+Enter for new line · Answers grounded in your wiki articles
        </p>
      </div>
    </div>
  );
}
