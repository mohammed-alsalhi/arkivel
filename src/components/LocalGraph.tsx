"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type GraphNode = { id: string; title: string; slug: string };
type GraphEdge = { source: string; target: string; type: string };
type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

function shortLabel(title: string) {
  const trimmed = title.trim();
  return trimmed.length > 16 ? `${trimmed.slice(0, 15)}…` : trimmed;
}

export default function LocalGraph({ slug }: { slug: string }) {
  const [result, setResult] = useState<{ slug: string; data: GraphData | null } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loading = result?.slug !== slug;
  const data = result?.slug === slug ? result.data : null;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/graph?center=${encodeURIComponent(slug)}&depth=2`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((nextData) => {
        setResult({ slug, data: nextData });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ slug, data: null });
      });

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!data || !canvas) return;

    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = Math.max(240, Math.round(canvas.clientWidth));
      const height = Math.max(300, Math.round(canvas.clientHeight));
      const density = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      context.clearRect(0, 0, width, height);

      const center = data.nodes.find((node) => node.slug === slug) ?? data.nodes[0];
      if (!center) return;

      const surrounding = data.nodes.filter((node) => node.id !== center.id).slice(0, 6);
      const visibleNodes = [center, ...surrounding];
      const centerX = width / 2;
      const centerY = height / 2;
      const radiusX = Math.min(width * 0.34, 145);
      const radiusY = Math.min(height * 0.34, 175);
      const positions = new Map<string, { x: number; y: number; angle: number }>();
      positions.set(center.id, { x: centerX, y: centerY, angle: 0 });

      surrounding.forEach((node, index) => {
        const angle = (Math.PI * 2 * index) / surrounding.length - Math.PI / 2;
        positions.set(node.id, {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
          angle,
        });
      });

      const rootStyle = getComputedStyle(document.documentElement);
      const themeColor = (name: string, fallback: string) =>
        rootStyle.getPropertyValue(name).trim() || fallback;
      const border = themeColor("--color-border", "#d3d6dc");
      const muted = themeColor("--color-muted", "#555b66");
      const mutedNode = themeColor("--color-border-light", "#b2b8c2");
      const accent = themeColor("--color-accent", "#111111");
      const accentForeground = themeColor("--color-accent-foreground", "#ffffff");

      context.strokeStyle = border;
      context.lineWidth = 1.5;
      for (const edge of data.edges) {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (!source || !target) continue;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      }

      const outerRadius = Math.max(10, Math.min(18, width * 0.045));
      const centerRadius = Math.max(23, Math.min(34, width * 0.085));

      for (const node of visibleNodes) {
        const position = positions.get(node.id);
        if (!position) continue;
        const isCenter = node.id === center.id;
        const nodeRadius = isCenter ? centerRadius : outerRadius;

        context.beginPath();
        context.arc(position.x, position.y, nodeRadius, 0, Math.PI * 2);
        context.fillStyle = isCenter ? accent : mutedNode;
        context.fill();

        context.fillStyle = isCenter ? accentForeground : muted;
        context.font = `${isCenter ? 12 : 11}px sans-serif`;
        context.textBaseline = "middle";
        context.textAlign = "center";

        if (isCenter) {
          context.fillText("current", position.x, position.y + 0.5);
          continue;
        }

        const label = shortLabel(node.title);
        const cosine = Math.cos(position.angle);
        const sine = Math.sin(position.angle);
        let labelX = position.x;
        let labelY = position.y;

        if (Math.abs(sine) > 0.55) {
          labelY += sine < 0 ? -(nodeRadius + 14) : nodeRadius + 14;
        } else {
          context.textAlign = cosine < 0 ? "right" : "left";
          labelX += cosine < 0 ? -(nodeRadius + 9) : nodeRadius + 9;
        }
        context.fillText(label, labelX, labelY);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [data, slug]);

  if (loading) return <p className="article-context-empty">loading graph…</p>;
  if (!data || data.nodes.length <= 1) return <p className="article-context-empty">no connections found.</p>;

  return (
    <div className="article-local-graph">
      <canvas
        ref={canvasRef}
        className="article-local-graph-canvas"
        role="img"
        aria-label={`Local article graph with ${data.nodes.length.toLocaleString()} pages`}
      />
      <Link href={`/graph?center=${encodeURIComponent(slug)}`} className="article-local-graph-open">
        open full graph
      </Link>
    </div>
  );
}
