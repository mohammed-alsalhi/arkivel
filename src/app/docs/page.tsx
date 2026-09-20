import Link from "next/link";
import { Page, PageHeader, Section, CodeBlock } from "@/components/ui";
export const metadata = { title: "installation", description: "Install and operate an Arkivel instance." };
export default function DocsPage() {
  return <Page width="wide"><PageHeader title="installation" description="Run your own Arkivel with Node.js 24 and PostgreSQL." />
    <Section title="get started"><CodeBlock><code>{`git clone https://github.com/mohammed-alsalhi/arkivel.git
cd arkivel
npm ci
cp .env.example .env
# configure your database and public URL in .env
npm run db:deploy
npm run dev`}</code></CodeBlock></Section>
    <Section title="owner setup"><p>Registration is closed by default. Create the initial administrator with the operator setup command before opening registration. <a href="https://github.com/mohammed-alsalhi/arkivel/blob/main/docs/authentication.md">Owner setup and authentication guide</a>.</p></Section>
    <Section title="deployment"><p>Use the Docker image, a standalone Node.js server, or Vercel. Each instance needs its own database and configuration. Apply migrations before serving traffic; builds never migrate production.</p></Section>
    <Section title="documentation"><p><Link href="/help">user guide</Link> · <Link href="/api-docs">api reference</Link> · <a href="https://github.com/mohammed-alsalhi/arkivel/blob/main/docs/maintainer-guide.md">maintainer guide</a></p></Section>
  </Page>;
}
