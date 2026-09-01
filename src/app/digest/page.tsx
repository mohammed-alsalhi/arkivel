"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Page, PageHeader } from "@/components/ui";

type DigestArticle = { id: string; title: string; slug: string; excerpt: string | null };
type WatchedArticle = DigestArticle & { updatedAt: string; category: { name: string } | null };
type DYKFact = { fact: string; articleTitle: string; articleSlug: string };
type ArticleOfDay = DigestArticle & { coverImage: string | null; category: { name: string } | null };
type OnThisDay = DigestArticle & { createdAt: string };

type DigestData = {
  date: string;
  dueReviews: DigestArticle[];
  recentInWatched: WatchedArticle[];
  dykFacts: DYKFact[];
  articleOfDay: ArticleOfDay | null;
  writingPrompt: string | null;
  onThisDay: OnThisDay[];
  watchedCount: number;
};

function Section({ title, icon, children, empty }: { title: string; icon: React.ReactNode; children: React.ReactNode; empty?: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-hover border-b border-border">
        <span className="text-accent">{icon}</span>
        <h2 className="text-[13px] font-semibold text-heading">{title}</h2>
      </div>
      <div className="px-4 py-3">
        {children || (empty && <p className="text-[13px] text-muted">{empty}</p>)}
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function WatchIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}
function QuestionIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

export default function DigestPage() {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/digest/daily")
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(() => setError("Could not load digest. Are you signed in?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-1.5">
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-danger text-[13px] p-4">{error || "Failed to load"}</div>;
  }

  return (
    <Page>
      {/* Header */}
      <PageHeader title="Your Daily Digest" description={data.date} />

      {/* Article of the Day */}
      {data.articleOfDay && (
        <div className="border border-accent/30 rounded-lg p-5 bg-accent/5 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-accent">
            <StarIcon />
            Article of the Day
          </div>
          <h2 className="text-[1.2rem] font-semibold text-heading" style={{ fontFamily: "var(--font-serif)" }}>
            <Link href={`/articles/${data.articleOfDay.slug}`} className="hover:underline">
              {data.articleOfDay.title}
            </Link>
          </h2>
          {data.articleOfDay.category && (
            <p className="text-[11px] text-muted">{data.articleOfDay.category.name}</p>
          )}
          {data.articleOfDay.excerpt && (
            <p className="text-[13px] text-foreground leading-relaxed">{data.articleOfDay.excerpt}</p>
          )}
          <Link
            href={`/articles/${data.articleOfDay.slug}`}
            className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
          >
            Read article →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Review Queue */}
        <Section
          title={`Review Queue (${data.dueReviews.length} due)`}
          icon={<ClockIcon />}
          empty="Nothing due for review today."
        >
          {data.dueReviews.length > 0 && (
            <div className="space-y-1.5">
              {data.dueReviews.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <Link href={`/articles/${a.slug}`} className="text-[13px] hover:underline text-foreground truncate max-w-[70%]">
                    {a.title}
                  </Link>
                  <Link href="/review" className="text-[11px] text-accent hover:underline flex-shrink-0">
                    Review →
                  </Link>
                </div>
              ))}
              {data.dueReviews.length > 0 && (
                <Link href="/review" className="text-[12px] text-accent hover:underline block mt-2">
                  Start review session →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* Watched Categories Updates */}
        <Section
          title={`Watched Updates (${data.recentInWatched.length} new)`}
          icon={<WatchIcon />}
          empty={data.watchedCount === 0 ? "Watch categories to see updates here." : "No new articles in the last 7 days."}
        >
          {data.recentInWatched.length > 0 && (
            <div className="space-y-1.5">
              {data.recentInWatched.map((a) => (
                <div key={a.id}>
                  <Link href={`/articles/${a.slug}`} className="text-[13px] hover:underline text-foreground">
                    {a.title}
                  </Link>
                  <p className="text-[11px] text-muted">{a.category?.name} · {new Date(a.updatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Did You Know */}
      {data.dykFacts.length > 0 && (
        <Section title="Did You Know?" icon={<BulbIcon />}>
          <div className="space-y-3">
            {data.dykFacts.map((f, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-accent font-bold text-[13px] flex-shrink-0">{i + 1}.</span>
                <div>
                  <p className="text-[13px] text-foreground leading-relaxed">{f.fact}</p>
                  <Link href={`/articles/${f.articleSlug}`} className="text-[11px] text-muted hover:text-accent hover:underline">
                    Source: {f.articleTitle}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* On This Day */}
        {data.onThisDay.length > 0 && (
          <Section title="On This Day" icon={<CalendarIcon />}>
            <div className="space-y-2">
              {data.onThisDay.map((a) => (
                <div key={a.id}>
                  <Link href={`/articles/${a.slug}`} className="text-[13px] hover:underline text-foreground">
                    {a.title}
                  </Link>
                  <p className="text-[11px] text-muted">
                    Added {new Date(a.createdAt).getFullYear()}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Thinking Prompt */}
        {data.writingPrompt && (
          <Section title="Today's Question" icon={<QuestionIcon />}>
            <p className="text-[14px] text-foreground italic leading-relaxed">&ldquo;{data.writingPrompt}&rdquo;</p>
            <Link href="/articles/new" className="text-[12px] text-accent hover:underline block mt-3">
              Write an article on this →
            </Link>
          </Section>
        )}

        {/* Continue Reading */}
        <Section title="Explore" icon={<BookIcon />}>
          <div className="space-y-1.5 text-[13px]">
            <Link href="/review" className="block text-foreground hover:text-accent hover:underline">Review queue</Link>
            <Link href="/coverage" className="block text-foreground hover:text-accent hover:underline">Knowledge coverage map</Link>
            <Link href="/ask" className="block text-foreground hover:text-accent hover:underline">Ask my wiki</Link>
            <Link href="/articles/new" className="block text-foreground hover:text-accent hover:underline">Write a new article</Link>
          </div>
        </Section>
      </div>
    </Page>
  );
}
