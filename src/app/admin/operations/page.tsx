"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardGrid,
  Chip,
  DataTable,
  EmptyState,
  LinkButton,
  LoadingState,
  Notice,
  Page,
  PageHeader,
  Section,
  StatCard,
  StatGrid,
} from "@/components/ui";
import {
  applyAcknowledgements,
  operationsDashboardContract,
  type OperationsAlert,
  type OperationsDashboardReport,
  type OperationsStatus,
} from "@/lib/operations-dashboard";
import { maintenanceRunbooks } from "@/lib/maintenance-tooling";

type OperationsPayload = OperationsDashboardReport & {
  instance?: {
    name: string;
    version: string;
  };
};

const ACK_STORAGE_KEY = operationsDashboardContract.alertAcknowledgements.storageKey;

export default function OperationsDashboardPage() {
  const [report, setReport] = useState<OperationsPayload | null>(null);
  const [acknowledgedKeys, setAcknowledgedKeys] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setAcknowledgedKeys(readAcknowledgements()));
    fetch("/api/admin/operations")
      .then((response) => {
        if (response.status === 401) {
          throw new Error("Admin access is required.");
        }
        if (!response.ok) {
          throw new Error("Operations report could not be loaded.");
        }
        return response.json();
      })
      .then((data: OperationsPayload) => {
        setReport(data);
        setLoading(false);
      })
      .catch((fetchError: Error) => {
        setError(fetchError.message);
        setLoading(false);
      });
  }, []);

  const alerts = useMemo(
    () => applyAcknowledgements(report?.alerts ?? [], acknowledgedKeys),
    [acknowledgedKeys, report?.alerts],
  );

  function acknowledge(alert: OperationsAlert) {
    const next = Array.from(new Set([...acknowledgedKeys, alert.acknowledgeKey]));
    setAcknowledgedKeys(next);
    localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
  }

  if (loading) {
    return <LoadingState label="Loading operations..." />;
  }

  if (error || !report) {
    return (
      <Page>
        <EmptyState
          title="Operations unavailable"
          description={error || "The operations report could not be loaded."}
          actions={<LinkButton href="/admin" variant="primary">Back to admin</LinkButton>}
        />
      </Page>
    );
  }

  const overall = report.metrics.find((metric) => metric.id === "overall");
  const openAlerts = alerts.filter((alert) => alert.status === "open");

  return (
    <Page width="wide">
      <PageHeader
        title="Operations"
        description={`${report.instance?.name ?? "Arkivel"} ${report.instance?.version ?? ""} production health, queues, diagnostics, and admin alerts.`}
        actions={
          <>
            <LinkButton href="/api/admin/operations?bundle=1">Diagnostic bundle</LinkButton>
            <LinkButton href="/admin/metrics">Metrics</LinkButton>
            <LinkButton href="/admin/webhooks">Webhooks</LinkButton>
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Overall"
          value={<StatusChip status={(overall?.status ?? "unknown") as OperationsStatus} />}
          detail={overall?.description}
        />
        <StatCard
          label="Open alerts"
          value={openAlerts.length}
          detail="Acknowledgements are stored locally for this admin browser."
        />
        <StatCard
          label="Services"
          value={report.services.length}
          detail="Database, Prisma, storage, AI, webhooks, search, and jobs."
        />
        <StatCard
          label="Generated"
          value={new Date(report.generatedAt).toLocaleTimeString()}
          detail={new Date(report.generatedAt).toLocaleDateString()}
        />
      </StatGrid>

      <Section title="Admin alerts">
        {alerts.length === 0 ? (
          <Notice>No operations alerts are open.</Notice>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                title={alert.title}
                description={alert.message}
                meta={alert.source}
              >
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "info"}>
                    {alert.severity}
                  </Chip>
                  <Chip tone={alert.status === "acknowledged" ? "success" : "default"}>
                    {alert.status}
                  </Chip>
                </div>
                {alert.status === "open" && (
                  <Button onClick={() => acknowledge(alert)} className="mt-3">
                    Acknowledge
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Service health">
        <CardGrid>
          {report.services.map((service) => (
            <Card
              key={service.id}
              title={service.title}
              description={service.message}
              meta={service.route ? <Link href={service.route}>Open related view</Link> : undefined}
            >
              <div className="mt-3">
                <StatusChip status={service.status} />
              </div>
              <ul className="mt-3 space-y-1 text-[12px] text-muted">
                {service.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section title="Queues and jobs">
        <DataTable>
          <thead>
            <tr>
              <th>Queue</th>
              <th>Processed 24h</th>
              <th>Pending</th>
              <th>Failed</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {report.queues.map((queue) => (
              <tr key={queue.id}>
                <td>
                  <div className="font-medium text-heading">{queue.title}</div>
                  <div className="text-[12px] text-muted">{queue.description}</div>
                </td>
                <td>{queue.processed24h}</td>
                <td>{queue.pending}</td>
                <td className={queue.failed > 0 ? "text-wiki-link-broken font-semibold" : ""}>{queue.failed}</td>
                <td>
                  <Link href={queue.route}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Section>

      <Section title="Slow pages">
        {report.slowPages.length === 0 ? (
          <Notice>No route slower than 750ms was recorded in the last 24 hours.</Notice>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Route</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              {report.slowPages.map((metric) => (
                <tr key={metric.id}>
                  <td className="font-mono text-[12px]">{metric.label}</td>
                  <td><StatusChip status={metric.status} /></td>
                  <td>{metric.value}</td>
                  <td className="text-muted">{metric.description}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>

      <Section title="Diagnostic bundle">
        <div className="grid gap-3 md:grid-cols-2">
          {report.bundle.sections.map((section) => (
            <Card
              key={section.id}
              title={section.label}
              description={section.notes}
              meta={section.included ? "Included" : "Excluded"}
            />
          ))}
        </div>
        <Notice className="mt-3">
          Redacted from bundles: {report.bundle.redactions.join(", ")}.
        </Notice>
      </Section>

      <Section title="Runbooks">
        <div className="flex flex-wrap gap-2">
          {maintenanceRunbooks.map((runbook) => (
            <Link key={runbook.id} href={runbook.href} className="ui-button">
              {runbook.label}
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  );
}

function StatusChip({ status }: { status: OperationsStatus }) {
  const tone = status === "healthy" ? "success" : status === "critical" ? "danger" : status === "degraded" ? "warning" : "info";
  return <Chip tone={tone}>{status}</Chip>;
}

function readAcknowledgements() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ACK_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
