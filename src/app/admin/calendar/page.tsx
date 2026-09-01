import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { LinkButton, Page, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const admin = await isAdmin();
  if (!admin) redirect("/login");

  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = parseInt(yearParam ?? String(now.getFullYear()), 10);
  const month = parseInt(monthParam ?? String(now.getMonth()), 10);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  // Scheduled articles (publishAt in this month)
  const scheduled = await prisma.article.findMany({
    where: { publishAt: { gte: monthStart, lte: monthEnd } },
    select: { id: true, title: true, slug: true, publishAt: true, status: true },
    orderBy: { publishAt: "asc" },
  });

  // Recently published (createdAt in this month, status=published)
  const published = await prisma.article.findMany({
    where: {
      createdAt: { gte: monthStart, lte: monthEnd },
      status: "published",
      publishAt: null, // not already in scheduled
    },
    select: { id: true, title: true, slug: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Build day → articles map
  type DayEntry = { title: string; slug: string; type: "scheduled" | "published" };
  const byDay = new Map<number, DayEntry[]>();

  for (const a of scheduled) {
    const day = new Date(a.publishAt!).getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ title: a.title, slug: a.slug, type: "scheduled" });
  }
  for (const a of published) {
    const day = new Date(a.createdAt).getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ title: a.title, slug: a.slug, type: "published" });
  }

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const monthName = monthStart.toLocaleString("default", { month: "long", year: "numeric" });

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <Page>
      <PageHeader
        title="Content Calendar"
        actions={<LinkButton href="/admin">Admin</LinkButton>}
      />

      <div className="flex items-center justify-between mb-4">
        <LinkButton href={`/admin/calendar?year=${prevYear}&month=${prevMonth}`}>← Prev</LinkButton>
        <h2 className="text-lg font-medium">{monthName}</h2>
        <LinkButton href={`/admin/calendar?year=${nextYear}&month=${nextMonth}`}>Next →</LinkButton>
      </div>

      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[640px] border-l border-t border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="border-r border-b border-border px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
            {d}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="border-r border-b border-border min-h-[80px] bg-muted/10" />
        ))}

        {/* Day cells */}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const entries = byDay.get(day) || [];
          const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
          return (
            <div key={day} className={`border-r border-b border-border min-h-[80px] p-1.5 ${isToday ? "bg-accent-soft" : ""}`}>
              <span className={`text-xs font-medium ${isToday ? "text-accent" : "text-muted-foreground"}`}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {entries.map((e, ei) => (
                  <Link key={ei} href={`/articles/${e.slug}`}
                    className={`block text-[10px] truncate rounded px-1 py-0.5 hover:underline ${
                      e.type === "scheduled"
                        ? "bg-warning-soft text-warning"
                        : "bg-success-soft text-success"
                    }`}
                    title={e.title}
                  >
                    {e.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-warning-soft border border-warning-border" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success-soft border border-success-border" />
          Published
        </span>
      </div>
    </Page>
  );
}
