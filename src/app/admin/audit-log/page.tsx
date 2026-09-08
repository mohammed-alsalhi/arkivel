"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, DataTable, EmptyState, Input, LinkButton, Page, PageHeader, Select } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

const TRAIL = [TRAIL_ROOTS.admin, { label: "audit log" }];

type AuditEntry = {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  severity: string;
  actorType: string;
  success: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "admin.failed_operation": "admin operation failed",
  "article.create": "page created",
  "article.delete": "page deleted",
  "article.restore": "page restored",
  "article.status_change": "status changed",
  "category.create": "space created",
  "category.delete": "space deleted",
  "export.create": "export created",
  "revision.revert": "revision reverted",
  "user.delete": "user deleted",
  "user.role_change": "role changed",
};

const ACTION_COLOURS: Record<string, string> = {
  "article.delete": "text-danger",
  "category.delete": "text-danger",
  "user.delete": "text-danger",
  "revision.revert": "text-warning",
  "user.role_change": "text-warning",
  "export.create": "text-warning",
  "admin.failed_operation": "text-danger",
  "article.create": "text-success",
  "category.create": "text-success",
};

const SEVERITY_COLOURS: Record<string, string> = {
  info: "text-muted",
  warning: "text-warning",
  high: "text-warning",
  critical: "text-danger",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback((nextPage = page) => {
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set("action", actionFilter);
    if (actorFilter) params.set("actor", actorFilter);
    if (targetFilter) params.set("target", targetFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (successFilter) params.set("success", successFilter);
    if (dateFromFilter) params.set("dateFrom", dateFromFilter);
    if (dateToFilter) params.set("dateTo", dateToFilter);
    params.set("page", String(nextPage));
    return params;
  }, [actionFilter, actorFilter, dateFromFilter, dateToFilter, page, severityFilter, successFilter, targetFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = buildParams();
    const res = await fetch(`/api/admin/audit-log?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  const exportHref = `/api/admin/audit-log?${new URLSearchParams({
    ...Object.fromEntries(buildParams(1)),
    download: "1",
    redaction: "standard",
  })}`;

  const hasFilters = Boolean(
    actionFilter || actorFilter || targetFilter || severityFilter || successFilter || dateFromFilter || dateToFilter,
  );

  const resetPage = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <Page trail={TRAIL}>
      <PageHeader title="audit log" description={`${total} entries total`} />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Select
          aria-label="filter by action"
          value={actionFilter}
          onChange={(e) => resetPage(setActionFilter)(e.target.value)}
        >
          <option value="">all actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Input
          aria-label="filter by actor"
          value={actorFilter}
          onChange={(e) => resetPage(setActorFilter)(e.target.value)}
          placeholder="actor"
        />
        <Input
          aria-label="filter by target"
          value={targetFilter}
          onChange={(e) => resetPage(setTargetFilter)(e.target.value)}
          placeholder="target"
        />
        <Select
          aria-label="filter by severity"
          value={severityFilter}
          onChange={(e) => resetPage(setSeverityFilter)(e.target.value)}
        >
          <option value="">all severities</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </Select>
        <Select
          aria-label="filter by outcome"
          value={successFilter}
          onChange={(e) => resetPage(setSuccessFilter)(e.target.value)}
        >
          <option value="">all outcomes</option>
          <option value="true">succeeded</option>
          <option value="false">failed</option>
        </Select>
        <Input
          aria-label="from date"
          type="date"
          value={dateFromFilter}
          onChange={(e) => resetPage(setDateFromFilter)(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            aria-label="to date"
            type="date"
            value={dateToFilter}
            onChange={(e) => resetPage(setDateToFilter)(e.target.value)}
            className="min-w-0 flex-1"
          />
          <LinkButton href={exportHref} prefetch={false} className="whitespace-nowrap">
            export
          </LinkButton>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-[13px] text-muted italic">loading…</p>
      ) : logs.length === 0 ? (
        <EmptyState
          title="no entries found"
          description={hasFilters ? "no entries match these filters." : "actions taken by administrators will appear here."}
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>time</th>
              <th>user</th>
              <th>action</th>
              <th>severity</th>
              <th>target</th>
              <th>details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <tr key={entry.id}>
                <td className="text-muted whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
                <td className="font-medium text-heading">
                  {entry.username ?? <span className="text-muted italic">system</span>}
                </td>
                <td className={`font-medium ${ACTION_COLOURS[entry.action] ?? "text-foreground"}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </td>
                <td className={`font-medium ${SEVERITY_COLOURS[entry.severity] ?? "text-muted"}`}>
                  {entry.success ? entry.severity : `${entry.severity} / failed`}
                </td>
                <td className="text-foreground">
                  <span className="text-muted text-[11px] mr-1">{entry.entityType}</span>
                  {entry.entityLabel ?? entry.entityId ?? "—"}
                </td>
                <td className="text-muted text-[11px]">
                  {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                    <details>
                      <summary className="cursor-pointer">view</summary>
                      <pre className="ui-code-block">{JSON.stringify(entry.metadata, null, 2)}</pre>
                    </details>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 mt-4">
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← prev
          </Button>
          <span className="text-[12px] text-muted">page {page} of {pages}</span>
          <Button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            next →
          </Button>
        </div>
      )}
    </Page>
  );
}
