"use client";

import { useEffect, useState, useRef } from "react";
import { EmptyState } from "@/components/ui";

type Todo = { id: string; text: string; done: boolean; sortOrder: number };

export default function ArticleTodoList({
  articleId,
  isAdmin,
}: {
  articleId: string;
  isAdmin: boolean;
}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/articles/${articleId}/todos`);
    if (res.ok) setTodos(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(todo: Todo) {
    const res = await fetch(`/api/articles/${articleId}/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    if (res.ok) {
      const updated: Todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  }

  async function addTodo() {
    if (!newText.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/articles/${articleId}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText }),
    });
    if (res.ok) {
      const todo: Todo = await res.json();
      setTodos((prev) => [...prev, todo]);
      setNewText("");
      inputRef.current?.focus();
    }
    setAdding(false);
  }

  async function deleteTodo(id: string) {
    const res = await fetch(`/api/articles/${articleId}/todos/${id}`, { method: "DELETE" });
    if (res.ok) setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) return null;
  if (!isAdmin && todos.length === 0) return null;

  const done = todos.filter((t) => t.done).length;

  return (
    <div className="mt-4 border border-border rounded p-3 text-[12px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-heading text-[13px]">Article checklist</span>
        {todos.length > 0 && (
          <span className="text-muted opacity-70">
            {done}/{todos.length} done
          </span>
        )}
      </div>

      {todos.length === 0 && (
        <EmptyState className="mb-2" description="No tasks yet." />
      )}

      <ul className="space-y-1 mb-2">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggle(todo)}
              className="accent-[var(--color-accent)] shrink-0"
            />
            <span className={`flex-1 leading-tight ${todo.done ? "line-through opacity-50" : ""}`}>
              {todo.text}
            </span>
            {isAdmin && (
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-opacity ml-1"
                title="Delete task"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <div className="flex items-center gap-1 mt-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a task…"
            className="flex-1 text-[12px] bg-transparent border border-border rounded px-2 py-0.5 outline-none focus:border-[var(--color-accent)] text-foreground placeholder:text-muted"
          />
          <button
            onClick={addTodo}
            disabled={adding || !newText.trim()}
            className="h-6 pointer-coarse:h-9 px-2 text-[11px] border border-border rounded text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
