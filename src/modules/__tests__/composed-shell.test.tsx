import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/articles",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

import ArticleRightSidebar from "@/components/ArticleRightSidebar";
import Sidebar from "@/components/layout/Sidebar";
import { EnabledModulesProvider } from "@/modules/client";
import type { ModuleId } from "@/modules/types";

function sidebar(modules: ModuleId[]) {
  return renderToStaticMarkup(
    <EnabledModulesProvider modules={modules}>
      <Sidebar brandName="Arkivel" logoMark="/brand/arkivel-logo.svg" categories={[]} />
    </EnabledModulesProvider>,
  );
}

describe("shell composed from the module registry", () => {
  it("lists a module's sidebar entry only while the module is enabled", () => {
    const withGraph = sidebar(["graph", "assets"]);
    expect(withGraph).toContain('href="/graph"');
    expect(withGraph).toContain(">graph</span>");

    const withoutGraph = sidebar(["assets"]);
    expect(withoutGraph).not.toContain('href="/graph"');
    expect(withoutGraph).not.toContain(">graph</span>");
    // The core rows stay, in their order, with the same classes and icons.
    expect(withoutGraph).toContain(">all pages</span>");
    expect(withoutGraph).toContain(">tags</span>");
    expect(withoutGraph.indexOf('href="/articles"')).toBeLessThan(withoutGraph.indexOf('href="/tags"'));
    expect(withoutGraph).toContain("wiki-sidebar-link-icon");
  });

  it("drops the context rail's graph tab when the graph module is disabled", () => {
    const html = renderToStaticMarkup(
      <EnabledModulesProvider modules={["assets"]}>
        <ArticleRightSidebar slug="home" backlinks={[]} />
      </EnabledModulesProvider>,
    );

    expect(html).not.toContain(">graph</button>");
    expect(html).toContain(">outline</button>");
    expect(html).toContain('id="article-context-outline-tab" role="tab" aria-selected="true"');
  });
});
