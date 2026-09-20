import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import RedirectsManager from "./RedirectsManager";
import { Page, PageHeader } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

export const dynamic = "force-dynamic";

const TRAIL = [TRAIL_ROOTS.admin, { label: "redirects" }];

export default async function AdminRedirectsPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/login");

  const redirects = await prisma.redirect.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <Page trail={TRAIL}>
      <PageHeader
        title="redirects"
        description="redirects are created automatically when an article slug is renamed. you can also add manual redirects here."
      />

      <RedirectsManager initialRedirects={redirects} />
    </Page>
  );
}
