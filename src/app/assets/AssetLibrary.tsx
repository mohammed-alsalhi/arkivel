"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, CardGrid, EmptyState, LoadingState, Page, PageHeader, TabButton, Tabs } from "@/components/ui";
import { TRAIL_ROOTS } from "@/lib/trail";

type Asset = {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  size: number;
  createdAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadAssets(mime?: string) {
    setLoading(true);
    const url = `/api/assets${mime && mime !== "all" ? `?mime=${mime}` : ""}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setAssets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadAssets(filter === "all" ? undefined : filter); }, [filter]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/assets", { method: "POST", body: fd }).catch(() => {});
    }
    setUploading(false);
    loadAssets();
    e.target.value = "";
  }

  const filterOptions = [
    { value: "all", label: "all" },
    { value: "image/", label: "images" },
    { value: "application/pdf", label: "pdfs" },
    { value: "audio/", label: "audio" },
    { value: "video/", label: "video" },
  ];

  return (
    <Page trail={[TRAIL_ROOTS.library, { label: "assets" }]}>
      <PageHeader
        title="asset library"
        description="upload and manage images, pdfs, and other files."
        actions={
          <>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "uploading…" : "upload files"}
            </Button>
          </>
        }
      />

      <Tabs label="asset filters" className="mb-4">
        {filterOptions.map((opt) => (
          <TabButton
            key={opt.value}
            active={filter === opt.value}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </TabButton>
        ))}
      </Tabs>

      {loading && <LoadingState label="loading…" />}

      {!loading && assets.length === 0 && (
        <EmptyState
          title="no assets yet."
          actions={
            <Button onClick={() => fileInputRef.current?.click()}>
              upload your first file
            </Button>
          }
        />
      )}

      {/* Asset grid */}
      <CardGrid>
        {assets.map((asset) => (
          <Card
            key={asset.id}
            media={
              asset.mimeType.startsWith("image/") ? (
                <div className="aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <span className="text-2xl text-muted">{asset.mimeType.startsWith("application/pdf") ? "PDF" : "FILE"}</span>
                </div>
              )
            }
            title={<span className="block truncate" title={asset.filename}>{asset.filename}</span>}
            description={formatSize(asset.size)}
            meta={
              <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                open
              </a>
            }
          />
        ))}
      </CardGrid>
    </Page>
  );
}
