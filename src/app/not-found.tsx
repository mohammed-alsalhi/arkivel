import Link from "next/link";
import { Notice, Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

export default function NotFound() {
  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "not found" }]}>
      <PageHeader title="page not found" />

      <Notice>
        <p>
          there is currently no page with this name. you can{" "}
          <Link href="/articles/new">create this page</Link>, or{" "}
          <Link href="/search">search the wiki</Link> for an existing page.
        </p>
      </Notice>
    </Page>
  );
}
