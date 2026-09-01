"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, LinkButton, Page, PageHeader } from "@/components/ui";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  article?: { title: string; slug: string } | null;
}

const GRADE_LABELS: Record<number, string> = {
  0: "Blackout",
  1: "Wrong",
  2: "Hard",
  3: "Ok",
  4: "Good",
  5: "Easy",
};

const GRADE_COLORS: Record<number, string> = {
  0: "bg-danger-soft text-danger border border-danger",
  1: "bg-danger-soft text-danger border border-danger-border",
  2: "bg-warning-soft text-warning border border-warning-border",
  3: "bg-warning-soft text-warning border border-warning-border",
  4: "bg-success-soft text-success border border-success-border",
  5: "bg-success-soft text-success border border-success",
};

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flashcards")
      .then((r) => r.json())
      .then(({ cards: c, total: t }) => { setCards(c); setTotal(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function grade(g: number) {
    const card = cards[current];
    await fetch(`/api/flashcards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: g }),
    });
    const next = current + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setCurrent(next);
      setRevealed(false);
    }
  }

  if (loading) return <div className="p-8 text-muted">Loading flashcards…</div>;

  if (cards.length === 0) {
    return (
      <Page className="max-w-lg mx-auto">
        <PageHeader title="Flashcards" />
        <EmptyState
          description={<>No cards due today. Total: {total}</>}
          actions={<LinkButton href="/">Back to wiki</LinkButton>}
        />
      </Page>
    );
  }

  if (done) {
    return (
      <Page className="max-w-lg mx-auto">
        <PageHeader title="Session complete!" />
        <EmptyState
          description={<>You reviewed {cards.length} cards.</>}
          actions={<LinkButton href="/">Back to wiki</LinkButton>}
        />
      </Page>
    );
  }

  const card = cards[current];

  return (
    <Page className="max-w-lg mx-auto">
      <PageHeader
        title="Flashcards"
        actions={<span className="text-sm text-muted">{current + 1} / {cards.length} due</span>}
      />

      {/* Card */}
      <div
        className="border border-border rounded-lg p-6 min-h-[160px] cursor-pointer bg-surface hover:bg-surface-hover transition-colors"
        onClick={() => setRevealed(true)}
      >
        <div className="text-xs text-muted uppercase mb-3">Question</div>
        <div className="text-base">{card.front}</div>

        {revealed && (
          <>
            <hr className="my-4 border-border" />
            <div className="text-xs text-muted uppercase mb-3">Answer</div>
            <div className="text-base">{card.back}</div>
            {card.article && (
              <Link href={`/articles/${card.article.slug}`} className="text-xs text-accent hover:underline mt-3 block">
                From: {card.article.title}
              </Link>
            )}
          </>
        )}

        {!revealed && (
          <div className="mt-6 text-xs text-muted text-center">Click to reveal answer</div>
        )}
      </div>

      {/* Grade buttons */}
      {revealed && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((g) => (
            <button
              key={g}
              onClick={() => grade(g)}
              className={`py-2 pointer-coarse:py-3 rounded text-xs font-medium ${GRADE_COLORS[g]} hover:opacity-90`}
            >
              {GRADE_LABELS[g]}
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}
