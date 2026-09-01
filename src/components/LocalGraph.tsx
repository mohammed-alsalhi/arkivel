"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";

type GraphNode = { id: string; title: string; slug: string };
type GraphEdge = { source: string; target: string; type: string };

type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export default function LocalGraph({ slug }: { slug: string }) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/graph?center=${encodeURIComponent(slug)}&depth=2`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const nodes = data.nodes;
    if (nodes.length === 0) return;

    // Simple force-like layout: center node at center, others in a circle
    const centerIdx = nodes.findIndex((n) => n.slug === slug);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;

    const positions: Record<string, { x: number; y: number }> = {};
    if (centerIdx !== -1) {
      positions[nodes[centerIdx].id] = { x: cx, y: cy };
    }
    const others = nodes.filter((_, i) => i !== centerIdx);
    others.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
      positions[node.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });

    // Draw edges — canvas can't resolve CSS variables, so read them off the root element
    const rootStyle = getComputedStyle(document.documentElement);
    const themeColor = (name: string) => rootStyle.getPropertyValue(name).trim();
    ctx.strokeStyle = themeColor("--color-border-light");
    ctx.lineWidth = 1;
    for (const edge of data.edges) {
      const from = positions[edge.source];
      const to = positions[edge.target];
      if (!from || !to) continue;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const isCenter = node.slug === slug;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isCenter ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = themeColor(isCenter ? "--color-accent" : "--color-muted");
      ctx.fill();
    }
  }, [data, slug]);

  if (loading) {
    return <div className="text-[11px] text-muted py-2">Loading graph…</div>;
  }

  if (!data || data.nodes.length <= 1) {
    return <EmptyState description="No connections found." />;
  }

  const others = data.nodes.filter((n) => n.slug !== slug);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={220}
        height={180}
        className="w-full rounded border border-border"
      />
      <div className="space-y-1">
        {others.slice(0, 8).map((n) => (
          <Link
            key={n.id}
            href={`/articles/${n.slug}`}
            className="block text-[11px] text-muted hover:text-foreground truncate"
          >
            {n.title}
          </Link>
        ))}
        {others.length > 8 && (
          <Link href={`/graph?center=${slug}`} className="text-[11px] text-accent hover:underline">
            View full graph ({data.nodes.length} nodes)
          </Link>
        )}
      </div>
      <Link href={`/graph?center=${slug}`} className="block text-[10px] text-muted hover:text-foreground">
        Open in graph viewer →
      </Link>
    </div>
  );
}
