import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { EmptyState, Page, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Glossary" };
export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const terms = await prisma.glossaryTerm.findMany({ orderBy: { term: "asc" } });

  // Group by first letter
  const groups: Record<string, typeof terms> = {};
  for (const t of terms) {
    const letter = t.term[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(t);
  }

  const letters = Object.keys(groups).sort();

  return (
    <Page>
      <PageHeader title="Glossary" />

      {terms.length === 0 ? (
        <EmptyState title="No glossary terms defined yet." />
      ) : (
        <>
          {/* Letter index */}
          <div className="flex flex-wrap gap-1">
            {letters.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="h-6 w-6 pointer-coarse:h-10 pointer-coarse:w-10 flex items-center justify-center text-[12px] font-bold border border-border rounded hover:bg-surface-hover text-accent"
              >
                {l}
              </a>
            ))}
          </div>

          {letters.map((letter) => (
            <Section key={letter} id={`letter-${letter}`} title={letter}>
              <dl className="space-y-3">
                {groups[letter].map((t) => (
                  <div key={t.id} className="pl-2">
                    <dt className="font-semibold text-[13px] text-heading">
                      {t.term}
                      {t.aliases.length > 0 && (
                        <span className="ml-2 text-[11px] text-muted font-normal">
                          also: {t.aliases.join(", ")}
                        </span>
                      )}
                    </dt>
                    <dd className="text-[13px] text-foreground mt-0.5 ml-3">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          ))}
        </>
      )}
    </Page>
  );
}
