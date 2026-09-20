import type { Metadata } from "next";
import Link from "next/link";
import { DocsText, splitFeature } from "@/components/DocsText";
import {
  FeatureItem,
  InlineCode,
  LinkButton,
  Page,
  PageHeader,
  SectionPanel,
} from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { getEnabledModules } from "@/modules/enabled";
import { MODULES } from "@/modules/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "features",
  description: "the focused arkivel wiki feature set.",
};

export default async function FeaturesPage() {
  const enabled = new Set(await getEnabledModules());
  // "find and connect" composes from the registry: each enabled module's feature lines follow the core's.
  const moduleFeatures = MODULES.filter((module) => enabled.has(module.id)).flatMap((module) =>
    module.docs.features.map((feature, index) => ({ key: `${module.id}-${index}`, ...splitFeature(feature) })),
  );

  return (
    <Page trail={[TRAIL_ROOTS.reference, { label: "features" }]}>
      <PageHeader
        kicker="reference"
        title="features"
        description="a focused wiki for writing, finding, connecting, and keeping durable pages."
        actions={
          <>
            <LinkButton href="/help">help</LinkButton>
            {enabled.has("api") && <LinkButton href="/api-docs">api reference</LinkButton>}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="write" bodyClassName="text-[13px]">
          <ul className="list-disc space-y-2 pl-5">
            <FeatureItem title="in-place editor">
              in folio the page is the editor: a big title, a property list, and a bare body with a{" "}
              <InlineCode>/</InlineCode> block menu and a selection toolbar for headings, lists, links,
              wiki links, tables, code blocks, and images. the wiki skin keeps a framed form with a toolbar.
            </FeatureItem>
            <FeatureItem title="page reader">
              read in the three-pane shell with navigation on the left and the local graph,
              outline, and backlinks on the right.
            </FeatureItem>
          </ul>
        </SectionPanel>

        <SectionPanel title="find and connect" bodyClassName="text-[13px]">
          <ul className="list-disc space-y-2 pl-5">
            <FeatureItem title="search">
              search page titles and content from the <InlineCode>⌘K</InlineCode> command palette or the full{" "}
              <Link href="/search">search page</Link>.
            </FeatureItem>
            <FeatureItem title="skins">
              choose the flat <em>folio</em> interface or the classic framed <em>wiki</em> skin in{" "}
              <Link href="/settings">settings</Link>, in light or dark mode.
            </FeatureItem>
            <FeatureItem title="categories and tags">
              organize pages in hierarchical <Link href="/categories">categories</Link> and browse
              reusable <Link href="/tags">tags</Link>.
            </FeatureItem>
            {moduleFeatures.map((feature) => (
              <FeatureItem key={feature.key} title={feature.title}>
                {feature.body && <DocsText text={feature.body} />}
              </FeatureItem>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel title="history" bodyClassName="text-[13px]">
          <ul className="list-disc space-y-2 pl-5">
            <FeatureItem title="revisions">
              every saved edit snapshots the previous page so its history remains inspectable.
            </FeatureItem>
            <FeatureItem title="diff">
              compare any saved revision with another revision or the current page in line or
              inline view.
            </FeatureItem>
            <FeatureItem title="blame">
              trace each paragraph to the revision, editor, date, and edit summary that introduced it.
            </FeatureItem>
          </ul>
        </SectionPanel>

        <SectionPanel title="access" bodyClassName="text-[13px]">
          <ul className="list-disc space-y-2 pl-5">
            <FeatureItem title="accounts and admin">
              account sessions protect write operations. administrators manage users, categories,
              tags, redirects, modules, imports, maintenance, read-only mode, and the audit log from{" "}
              <Link href="/admin">admin</Link>.
            </FeatureItem>
            <FeatureItem title="modules">
              optional features — graph, assets, import, export, api, feeds, share, media — are enabled per
              deployment with <InlineCode>ARKIVEL_MODULES</InlineCode> or from{" "}
              <Link href="/admin/modules">admin › modules</Link>.
            </FeatureItem>
          </ul>
        </SectionPanel>
      </div>
    </Page>
  );
}
