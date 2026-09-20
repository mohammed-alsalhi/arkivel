import type { Metadata } from "next";
import Link from "next/link";
import { DocsText } from "@/components/DocsText";
import {
  InlineCode,
  LinkButton,
  Notice,
  Page,
  PageHeader,
  SectionPanel,
} from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { getEnabledModules } from "@/modules/enabled";
import { MODULES } from "@/modules/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "help",
  description: "a practical guide to the focused arkivel wiki.",
};

export default async function HelpPage() {
  const enabled = new Set(await getEnabledModules());
  const has = (id: (typeof MODULES)[number]["id"]) => enabled.has(id);
  // The "find" list composes from the registry: every enabled module with help copy adds a step.
  const moduleHelp = MODULES.filter((module) => enabled.has(module.id) && module.docs.help);

  return (
    <Page trail={[TRAIL_ROOTS.reference, { label: "help" }]}>
      <PageHeader
        kicker="reference"
        title="help"
        description="the shortest path through the retained arkivel wiki."
        actions={
          <>
            <LinkButton href="/features">features</LinkButton>
            {has("api") && <LinkButton href="/api-docs">api reference</LinkButton>}
          </>
        }
      />

      <div className="space-y-4 text-[13px]">
        <SectionPanel title="browse and search" bodyClassName="space-y-3">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              open <Link href="/">home</Link> for recently updated pages or{" "}
              <Link href="/articles">all pages</Link> for the complete index.
            </li>
            <li>
              press <InlineCode>⌘K</InlineCode> (<InlineCode>ctrl K</InlineCode> on windows and linux) or
              click the search field in the left rail to open the command palette: find pages, jump to
              any section, or toggle the theme and skin. the full <Link href="/search">search page</Link>{" "}
              accepts the same query and shows matching pages.
            </li>
            <li>
              browse the category tree from <Link href="/categories">categories</Link> or browse labels
              from <Link href="/tags">tags</Link>.
            </li>
            {moduleHelp.map((module) => (
              <li key={module.id}>
                <DocsText text={module.docs.help as string} />
              </li>
            ))}
          </ol>
        </SectionPanel>

        <SectionPanel title="write a page" bodyClassName="space-y-3">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <Link href="/login">log in</Link> with an administrator account when authentication is enabled.
            </li>
            <li>
              open <Link href="/articles/new">new page</Link>, add a title, and write. in folio the page is the editor:
              type <InlineCode>/</InlineCode> on an empty line for blocks and select text to format; the wiki
              skin shows a framed form with a toolbar. <InlineCode>⌘S</InlineCode> saves.
            </li>
            <li>
              use headings, lists, links, wiki links, tables, code blocks, and images as needed.
            </li>
            <li>
              choose one category, any useful tags, and a draft, review, or published status, then save.
            </li>
          </ol>
          <Notice>
            the editor keeps an in-browser draft while you work. saving an edit records the previous
            page as a revision.
          </Notice>
        </SectionPanel>

        <SectionPanel title="history, diff, and blame" bodyClassName="space-y-3">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              open a page&apos;s history at <InlineCode>/articles/:slug/history</InlineCode>.
            </li>
            <li>
              select an old and new revision, then compare them. the diff supports line and inline views.
            </li>
            <li>
              open <InlineCode>/articles/:slug/blame</InlineCode> to see which revision introduced each paragraph.
            </li>
          </ol>
        </SectionPanel>

        {has("import") && (
          <SectionPanel title="import" bodyClassName="space-y-3">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                as an administrator, open <Link href="/import">import</Link> and select one or more local files.
              </li>
              <li>
                use markdown (<InlineCode>.md</InlineCode>), text (<InlineCode>.txt</InlineCode>), html{" "}
                (<InlineCode>.html</InlineCode>), json (<InlineCode>.json</InlineCode>), or mediawiki xml{" "}
                (<InlineCode>.xml</InlineCode>). the form posts them to{" "}
                <InlineCode>/api/articles/import</InlineCode>.
              </li>
              <li>
                for notion, open <Link href="/import/notion">the notion importer</Link> and provide an
                integration token plus page id. it creates one draft page.
              </li>
              <li>
                for obsidian, open <Link href="/import/obsidian">the obsidian importer</Link> and upload
                one markdown file or a zipped vault. front matter and wiki links are preserved in draft pages.
              </li>
            </ol>
            <p className="text-muted">
              json may contain one article object or an array. a mediawiki xml export may create more than
              one page, so the results list can be longer than the uploaded file list.
            </p>
          </SectionPanel>
        )}

        {(has("assets") || has("export")) && (
          <SectionPanel title="assets and export" bodyClassName="space-y-3">
            <ul className="list-disc space-y-2 pl-5">
              {has("assets") && (
                <li>
                  use the <Link href="/assets">asset library</Link> to upload, filter, inspect, and reuse files.
                </li>
              )}
              {has("export") && (
                <li>
                  use <Link href="/export">export</Link> to download the whole wiki or one category as
                  markdown or a zip archive.
                </li>
              )}
            </ul>
          </SectionPanel>
        )}

        <SectionPanel title="accounts and admin" bodyClassName="space-y-3">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              create an account at <Link href="/register">register</Link> or return through{" "}
              <Link href="/login">log in</Link>.
            </li>
            <li>
              administrator sessions unlock page creation, editing, imports, assets, exports, and
              the focused <Link href="/admin">admin area</Link>.
            </li>
            <li>
              admin retains users, categories, tags, redirects, modules, import, maintenance, read-only mode,
              and audit-log controls.
            </li>
          </ul>
        </SectionPanel>

        {has("api") && (
          <SectionPanel title="api v1" bodyClassName="space-y-3">
            <p>
              the public read-only v1 endpoints expose published content for{" "}
              <InlineCode>/api/v1/articles</InlineCode>, <InlineCode>/api/v1/categories</InlineCode>,{" "}
              <InlineCode>/api/v1/tags</InlineCode>, and <InlineCode>/api/v1/search</InlineCode>.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                read the generated <Link href="/api-docs">api reference</Link> for parameters and responses.
              </li>
              <li>
                inspect the live <Link href="/api/v1/contract">contract</Link> or{" "}
                <Link href="/api/v1/openapi.json">openapi json</Link> for machine-readable details.
              </li>
              <li>
                use <Link href="/api/v1/sdk">client metadata</Link> for resource paths and request examples.
              </li>
            </ul>
          </SectionPanel>
        )}
      </div>
    </Page>
  );
}
