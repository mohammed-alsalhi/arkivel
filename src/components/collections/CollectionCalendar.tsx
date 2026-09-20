"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import type { ItemDTO } from "@/modules/collections/model";
import { propertyValue, type PropertyDefinition } from "@/modules/collections/properties";

/** Local calendar dates never pass through UTC, so deadlines cannot shift a day. */
export function calendarDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function calendarDays(month: string): Date[] {
  const [year, number] = month.split("-").map(Number);
  const first = new Date(year, number - 1, 1);
  const count = new Date(year, number, 0).getDate();
  const length = Math.ceil((first.getDay() + count) / 7) * 7;
  return Array.from({ length }, (_, index) => new Date(year, number - 1, index - first.getDay() + 1));
}

type Props = { items: ItemDTO[]; property: PropertyDefinition; slug: string; canEdit: boolean; onNew: (day: string) => void };

export function CollectionCalendar({ items, property, slug, canEdit, onNew }: Props) {
  const [month, setMonth] = useState(() => calendarDay(new Date()).slice(0, 7));
  const today = calendarDay(new Date());
  const days = calendarDays(month);
  const byDay = new Map<string, ItemDTO[]>();
  const undated: ItemDTO[] = [];
  for (const item of items) {
    const value = propertyValue(item, property);
    if (typeof value !== "string" || !value) {
      undated.push(item);
      continue;
    }
    const entries = byDay.get(value) ?? [];
    entries.push(item);
    byDay.set(value, entries);
  }
  const shift = (amount: number) => {
    const [year, number] = month.split("-").map(Number);
    setMonth(calendarDay(new Date(year, number - 1 + amount, 1)).slice(0, 7));
  };
  const itemLink = (item: ItemDTO) => (
    <Link
      key={item.id}
      className="collections-calendar-item"
      href={`/collections/${encodeURIComponent(slug)}/items/${encodeURIComponent(item.id)}`}
    >
      {item.title}
    </Link>
  );
  return (
    <section className="collections-calendar" aria-label={`calendar by ${property.name}`}>
      <div className="collections-calendar-toolbar">
        <h2>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
        <div>
          <Button aria-label="previous month" onClick={() => shift(-1)}>
            ←
          </Button>
          <Button onClick={() => setMonth(today.slice(0, 7))}>today</Button>
          <Button aria-label="next month" onClick={() => shift(1)}>
            →
          </Button>
          <input
            type="month"
            aria-label="calendar month"
            value={month}
            onChange={(event) => {
              if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value);
            }}
          />
        </div>
      </div>
      <div className="collections-calendar-scroll">
        <div className="collections-calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="collections-calendar-weekday">
              {day}
            </div>
          ))}
          {days.map((date) => {
            const day = calendarDay(date);
            return (
              <section
                key={day}
                className={`collections-calendar-day${day.slice(0, 7) !== month ? " collections-calendar-outside" : ""}`}
                aria-label={date.toLocaleDateString("en-US", { dateStyle: "full" })}
              >
                <header>
                  <time dateTime={day} aria-current={day === today ? "date" : undefined}>
                    {date.getDate()}
                  </time>
                  {canEdit && (
                    <Button aria-label={`add item on ${day}`} onClick={() => onNew(day)}>
                      +
                    </Button>
                  )}
                </header>
                {(byDay.get(day) ?? []).map(itemLink)}
              </section>
            );
          })}
        </div>
      </div>
      {undated.length > 0 && (
        <div className="collections-calendar-undated">
          <h3>
            No {property.name} <span className="collections-count">{undated.length}</span>
          </h3>
          <div>{undated.map(itemLink)}</div>
        </div>
      )}
    </section>
  );
}
