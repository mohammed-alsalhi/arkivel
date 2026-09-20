"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAdmin } from "@/components/AdminContext";
import {
  Button,
  CardGrid,
  CardLink,
  InlineCode,
  Notice,
  Page,
  PageHeader,
  SectionPanel,
} from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";
import { plural } from "@/lib/utils";

const TRAIL = [TRAIL_ROOTS.library, { label: "import" }];

type ImportResult = {
  filename: string;
  success: boolean;
  title?: string;
  slug?: string;
  error?: string;
};

type ImportResponse = {
  error?: string;
  results?: ImportResult[];
};

const ACCEPTED_FILES = ".md,.markdown,.txt,.text,.html,.htm,.json,.xml";
const SUPPORTED_EXTENSIONS = new Set([
  "md",
  "markdown",
  "txt",
  "text",
  "html",
  "htm",
  "json",
  "xml",
]);

const FORMAT_LABELS: Record<string, string> = {
  htm: "html",
  html: "html",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  text: "text",
  txt: "text",
  xml: "mediawiki xml",
};

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export default function ImportForm() {
  const isAdmin = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isAdmin) {
    return (
      <Page trail={TRAIL}>
        <PageHeader title="import" />
        <Notice>
          <Link href="/login">log in as an administrator</Link> to import pages.
        </Notice>
      </Page>
    );
  }

  function addFiles(nextFiles: FileList | File[]) {
    const supported = Array.from(nextFiles).filter((file) =>
      SUPPORTED_EXTENSIONS.has(getExtension(file.name)),
    );

    setFiles((current) => [...current, ...supported]);
    setResults(null);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleImport() {
    if (files.length === 0) return;

    setImporting(true);
    setResults(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/articles/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as ImportResponse;

      if (!response.ok || !Array.isArray(payload.results)) {
        setResults([{
          filename: "upload",
          success: false,
          error: payload.error ?? "import failed. check the files and try again.",
        }]);
        return;
      }

      setResults(payload.results);
      setFiles([]);
    } catch {
      setResults([{ filename: "upload", success: false, error: "network error. please try again." }]);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Page trail={TRAIL}>
      <PageHeader
        title="import"
        description="bring local documents into arkivel, or continue with a dedicated notion or obsidian importer."
      />

      <SectionPanel title="local files" bodyClassName="space-y-4">
        <label
          htmlFor="article-import-files"
          className={
            "block cursor-pointer rounded border border-dashed p-8 text-center transition-colors " +
            (dragOver
              ? "border-foreground bg-surface-hover"
              : "border-border hover:bg-surface-hover")
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <span className="block text-[14px] text-foreground">
            drop files here or choose from your computer
          </span>
          <span className="mt-1 block text-[12px] text-muted">
            markdown, text, html, json, and mediawiki xml
          </span>
          <input
            ref={fileInputRef}
            id="article-import-files"
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            className="hidden"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>

        {files.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted">
              {plural(files.length, "file", "files")} ready
            </p>
            <ul className="divide-y divide-border border border-border text-[13px]">
              {files.map((file, index) => {
                const extension = getExtension(file.name);
                return (
                  <li
                    key={file.name + "-" + file.lastModified + "-" + index}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="mr-2 text-[11px] text-muted">
                        {FORMAT_LABELS[extension] ?? extension}
                      </span>
                      <span className="break-all">{file.name}</span>
                    </span>
                    <Button onClick={() => removeFile(index)}>remove</Button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleImport} disabled={importing}>
                {importing
                  ? "importing…"
                  : `import ${plural(files.length, "file", "files")}`}
              </Button>
              <Button onClick={() => setFiles([])} disabled={importing}>
                clear
              </Button>
            </div>
          </div>
        ) : null}
      </SectionPanel>

      {results ? (
        <SectionPanel title="results" bodyClassName="p-0">
          <ul className="divide-y divide-border text-[13px]" aria-live="polite">
            {results.map((result, index) => (
              <li
                key={result.filename + "-" + index}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <span>
                  <span className={result.success ? "text-success" : "text-danger"}>
                    {result.success ? "saved" : "failed"}
                  </span>{" "}
                  <span className="text-muted">{result.filename}</span>
                  {result.title ? <span> · {result.title}</span> : null}
                </span>
                {result.success && result.slug ? (
                  <Link href={"/articles/" + result.slug}>open page</Link>
                ) : (
                  <span className="text-[12px] text-danger">{result.error}</span>
                )}
              </li>
            ))}
          </ul>
        </SectionPanel>
      ) : null}

      <section className="mt-6" aria-labelledby="connected-imports-heading">
        <h2 id="connected-imports-heading" className="mb-3 text-[14px] font-semibold">
          connected sources
        </h2>
        <CardGrid>
          <CardLink
            href="/import/notion"
            title="notion"
            description="import one notion page with an integration token and page id."
            meta="creates a draft"
          />
          <CardLink
            href="/import/obsidian"
            title="obsidian"
            description="import a markdown note or zipped vault with front matter and wiki links."
            meta="creates drafts"
          />
        </CardGrid>
      </section>

      <Notice className="mt-6 text-[13px]">
        local uploads post to <InlineCode>/api/articles/import</InlineCode>. markdown can use a
        front-matter title; html uses its title or first heading; json accepts article objects or
        arrays; mediawiki xml can contain multiple pages.
      </Notice>
    </Page>
  );
}
