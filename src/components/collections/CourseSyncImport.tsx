"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DataTable, Field, Input } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { CourseSyncReport } from "@/modules/collections/course-sync";
import { api, describeFailure } from "./api";

/** Preview and apply the course scraper's existing metadata export. */
export function CourseSyncImport({ collectionId }: { collectionId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { addToast } = useToast();
  const [source, setSource] = useState<unknown>();
  const [report, setReport] = useState<CourseSyncReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function readFile(file?: File) {
    setSource(undefined);
    setReport(null);
    setError("");
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("Choose a JSON file smaller than 2 MB.");
      return;
    }
    setBusy(true);
    try {
      setSource(JSON.parse(await file.text()));
    } catch {
      setError("This file could not be read as JSON. Choose the course-sync export again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(dryRun: boolean) {
    if (busy || source === undefined || (!dryRun && !report?.dryRun)) return;
    setBusy(true);
    setError("");
    const result = await api<CourseSyncReport>(`/api/collections/${encodeURIComponent(collectionId)}/import-course-sync`, {
      method: "POST",
      body: { source, dryRun },
    });
    setBusy(false);
    if (!result.ok) {
      setReport(null);
      setError(describeFailure(result));
      return;
    }
    setReport(result.data);
    if (!dryRun) {
      addToast(`course data imported: ${result.data.created} new, ${result.data.updated} updated.`, "success");
      router.refresh();
    }
  }

  return (
    <>
      <Button onClick={() => dialog.current?.showModal()}>import course data</Button>
      <dialog
        ref={dialog}
        className="modal collections-import-dialog"
        aria-labelledby="course-import-title"
        onCancel={(event) => { if (busy) event.preventDefault(); }}
      >
        <div className="modal-header" id="course-import-title">import course data</div>
        <div className="modal-body grid gap-4">
          <p className="ui-muted">choose the course scraper’s google-tasks-input.json export, then review the changes before importing.</p>
          <Field label="course-sync file" htmlFor="course-import-file">
            <Input id="course-import-file" type="file" accept=".json,application/json" disabled={busy} onChange={(event) => void readFile(event.target.files?.[0])} />
          </Field>
          {error && <p className="ui-field-error" role="alert">{error}</p>}
          {report && (
            <section aria-label="import preview" className="grid gap-3">
              <p role="status" className="tabular-nums">
                {report.dryRun ? "preview" : "imported"}: {report.created} new · {report.updated} updated · {report.unchanged} unchanged · {report.skipped} skipped
                {report.coursesCreated > 0 && ` · ${report.coursesCreated} new courses`}
              </p>
              {report.warnings.length > 0 && <ul className="list-disc pl-5">{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
              {report.preview.length > 0 && (
                <DataTable>
                  <thead><tr><th scope="col">coursework</th><th scope="col">change</th></tr></thead>
                  <tbody>{report.preview.map((row) => (
                    <tr key={row.id}><td>{row.title}{row.reason && <p className="ui-muted">{row.reason}</p>}</td><td>{row.action}</td></tr>
                  ))}</tbody>
                </DataTable>
              )}
            </section>
          )}
        </div>
        <div className="modal-footer">
          <Button disabled={busy} onClick={() => dialog.current?.close()}>close</Button>
          {report?.dryRun ? (
            <Button variant="primary" disabled={busy || report.created + report.updated + report.coursesCreated === 0} onClick={() => void submit(false)}>
              {busy ? "importing…" : "import changes"}
            </Button>
          ) : (
            <Button variant="primary" disabled={busy || source === undefined} onClick={() => void submit(true)}>
              {busy ? "reading…" : "preview changes"}
            </Button>
          )}
        </div>
      </dialog>
    </>
  );
}
