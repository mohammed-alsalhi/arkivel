"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import GraphControls from "@/components/graph/GraphControls";
import { LoadingState } from "@/components/ui";

const ArticleGraph = dynamic(() => import("@/components/graph/ArticleGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted text-[13px]">
      Loading graph...
    </div>
  ),
});

type GraphNode = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  categorySlug: string | null;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
  relation?: string;
};

export default function GraphPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <GraphPageContent />
    </Suspense>
  );
}

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [depth, setDepth] = useState(2);
  const [centerSlug, setCenterSlug] = useState(
    searchParams.get("center") || ""
  );
  const [loading, setLoading] = useState(true);
  const [clusterMode, setClusterMode] = useState(false);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (centerSlug) {
      params.set("center", centerSlug);
      params.set("depth", depth.toString());
    }

    const res = await fetch(`/api/graph?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);

      // Extract unique categories
      const cats = new Set<string>();
      data.nodes.forEach((n: GraphNode) => {
        if (n.category) cats.add(n.category);
      });
      setCategories(Array.from(cats).sort());
    }
    setLoading(false);
  }, [centerSlug, depth]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Filter nodes by category
  const filteredNodes = selectedCategory
    ? nodes.filter((n) => n.category === selectedCategory)
    : nodes;

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => filteredNodeIds.has(e.source as string) && filteredNodeIds.has(e.target as string)
  );

  function handleNodeClick(slug: string) {
    router.push(`/articles/${slug}`);
  }

  function handleCenterChange(slug: string) {
    setCenterSlug(slug);
    const params = new URLSearchParams(window.location.search);
    if (slug) {
      params.set("center", slug);
    } else {
      params.delete("center");
    }
    router.replace(`/graph?${params.toString()}`);
  }

  return (
    <div style={{ height: "calc(100vh - 120px)", position: "relative" }}>
      <GraphControls
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        depth={depth}
        onDepthChange={setDepth}
        centerSlug={centerSlug}
        onCenterChange={handleCenterChange}
        nodeCount={filteredNodes.length}
        edgeCount={filteredEdges.length}
        clusterMode={clusterMode}
        onClusterModeChange={setClusterMode}
      />

      {loading ? (
        <div className="flex items-center justify-center h-full text-muted text-[13px]">
          Loading graph data...
        </div>
      ) : filteredNodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted text-[13px]">
          No articles to display. Create some articles first.
        </div>
      ) : (
        <ArticleGraph
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodeClick={handleNodeClick}
          centerSlug={centerSlug}
          clusterMode={clusterMode}
        />
      )}
    </div>
  );
}
