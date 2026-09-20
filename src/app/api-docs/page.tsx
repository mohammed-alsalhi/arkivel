import type { Metadata } from "next";
import {
  createPublicApiV1OpenApiSpec,
} from "@/lib/public-api-v1";
import { TRAIL_ROOTS } from "@/lib/trail";
import inventory from "@/lib/api-inventory.json";
import { requireModule } from "@/modules/enabled";
import { moduleForPath } from "@/modules/registry";
import {
  Chip,
  CodeBlock,
  DataTable,
  InlineCode,
  Page,
  PageHeader,
  Section,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "api reference",
  description: "the generated arkivel public api v1 reference.",
};

export default async function ApiDocsPage() {
  await requireModule("api");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const spec = createPublicApiV1OpenApiSpec(baseUrl);
  const operations = Object.entries(spec.paths).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).map(([method, operation]) => ({
      method: method.toUpperCase(),
      path,
      ...operation,
    }))
  );

  return (
    <Page
      trail={[TRAIL_ROOTS.reference, { label: "api reference" }]}
      width="wide"
    >
      <PageHeader
        kicker="reference"
        title="api reference"
        description={
          <>
            <InlineCode>{spec.info.title}</InlineCode>{" "}
            <InlineCode>{spec.info.version}</InlineCode>. {spec.info.description}
          </>
        }
      />

      <div className="space-y-8 text-[13px]">
        <Section title="schema">
          <p className="text-muted">
            this page is generated from the same OpenAPI document served at{" "}
            <a href="/api/v1/openapi.json"><InlineCode>/api/v1/openapi.json</InlineCode></a>.
            contract and client metadata are available at{" "}
            <a href="/api/v1/contract"><InlineCode>/api/v1/contract</InlineCode></a>{" "}
            and <a href="/api/v1/sdk"><InlineCode>/api/v1/sdk</InlineCode></a>.
          </p>
          <p className="font-semibold">server</p>
          <CodeBlock><code>{spec.servers[0].url}</code></CodeBlock>
          <p className="text-muted">
            OpenAPI <InlineCode>{spec.openapi}</InlineCode> · {operations.length} operations
          </p>
        </Section>

        <Section title="authentication">
          <p className="text-muted">
            the v1 endpoints below are public reads. every other route under <InlineCode>/api</InlineCode> is the
            same surface the interface uses, and it accepts a personal access token so scripts and other apps can do
            everything a signed-in user can, with that user&apos;s role (viewer, editor, admin). create tokens under{" "}
            <a href="/settings/tokens"><InlineCode>/settings/tokens</InlineCode></a>; each is shown once and can be
            revoked there or from the audit log.
          </p>
          <CodeBlock>
            <code>{`curl -H "Authorization: Bearer ark_…" ${spec.servers[0].url}/api/collections`}</code>
          </CodeBlock>
          <p className="text-muted">
            anonymous calls get <InlineCode>401</InlineCode>, insufficient roles <InlineCode>403</InlineCode>. browsers on
            another origin are refused until the deployment lists them in <InlineCode>ARKIVEL_API_CORS_ORIGINS</InlineCode>;
            cross-origin calls never carry a session cookie, only a token.
          </p>
        </Section>

        <Section title="full surface">
          <p className="text-muted">
            {inventory.length} routes and {inventory.reduce((sum, entry) => sum + entry.methods.length, 0)} operations,
            generated from the route handlers. routes owned by a disabled module answer <InlineCode>404</InlineCode>. shapes
            follow the interface and may change between minor versions; the v1 operations below are the frozen contract.
          </p>
          <DataTable className="text-[12px]">
            <caption className="ui-sr-only">every api route with its methods</caption>
            <thead>
              <tr>
                <th scope="col">route</th>
                <th scope="col">methods</th>
                <th scope="col">module</th>
                <th scope="col">summary</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((entry) => (
                <tr key={entry.route}>
                  <td><InlineCode className="break-all">{entry.route}</InlineCode></td>
                  <td>{entry.methods.map((m) => m.method).join(", ")}</td>
                  <td>{moduleForPath(entry.route.replace(/\{[^}]+\}/g, "x"))?.id ?? "core"}</td>
                  <td title={entry.methods.map((m) => m.summary).filter(Boolean).join(" · ") || undefined}>
                    {entry.methods.map((m) => m.summary).filter(Boolean)[0] ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Section>

        <Section title="v1 operations">
          <div className="divide-y divide-border">
            {operations.map((operation) => {
              const headingId = `operation-${operation.operationId}`;

              return (
                <article
                  aria-labelledby={headingId}
                  className="space-y-3 py-6 first:pt-2 last:pb-2"
                  key={operation.operationId}
                >
                  <header className="flex min-w-0 flex-wrap items-center gap-2">
                    <InlineCode className="font-semibold">{operation.method}</InlineCode>
                    <h3 id={headingId} className="min-w-0 font-semibold">
                      <InlineCode className="break-all">{operation.path}</InlineCode>
                    </h3>
                  </header>

                  <div className="flex flex-wrap gap-2">
                    {operation.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
                    <Chip className="font-mono">{operation["x-arkivel-auth"]}</Chip>
                  </div>

                  <p className="text-muted">{operation.summary}</p>

                  {operation.parameters.length > 0 ? (
                    <DataTable className="text-[12px]">
                      <caption className="pb-2 text-left font-semibold">parameters</caption>
                      <thead>
                        <tr>
                          <th scope="col">name</th>
                          <th scope="col">location</th>
                          <th scope="col">type</th>
                          <th scope="col">requirement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operation.parameters.map((parameter) => (
                          <tr key={`${parameter.in}-${parameter.name}`}>
                            <td><InlineCode>{parameter.name}</InlineCode></td>
                            <td>{parameter.in}</td>
                            <td>{parameter.schema.type}</td>
                            <td>{parameter.required ? "required" : "optional"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  ) : null}

                  <details>
                    <summary className="cursor-pointer font-semibold">
                      responses ({Object.keys(operation.responses).length})
                    </summary>
                    <div className="mt-3">
                      <DataTable className="text-[12px]">
                        <caption className="ui-sr-only">
                          responses for {operation.method} {operation.path}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">status</th>
                            <th scope="col">description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(operation.responses).map(([status, response]) => (
                            <tr key={status}>
                              <td><InlineCode>{status}</InlineCode></td>
                              <td>{response.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </Section>
      </div>
    </Page>
  );
}
