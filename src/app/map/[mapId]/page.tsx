"use client";

import { useState, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { useAdmin } from "@/components/AdminContext";
import MapSelector from "@/components/map/MapSelector";
import MapSearch from "@/components/map/MapSearch";
import LayerControl from "@/components/map/LayerControl";

const WorldMap = dynamic(() => import("@/components/map/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted italic text-[13px]">
      Loading map...
    </div>
  ),
});

type MapConfig = {
  id: string;
  mapId: string;
  name: string;
  description: string | null;
  imageUrl: string;
};

type MapLayerData = {
  id: string;
  name: string;
  imageUrl: string;
  opacity: number;
  visible: boolean;
};

type MarkerData = {
  id: string;
  label: string;
  polygon: [number, number][];
  color: string | null;
  article: { id: string; title: string; slug: string } | null;
};

export default function MapDetailPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = use(params);
  const isAdmin = useAdmin();
  const [editMode, setEditMode] = useState(false);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [allMaps, setAllMaps] = useState<MapConfig[]>([]);
  const [layers, setLayers] = useState<MapLayerData[]>([]);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/maps").then((r) => r.json()),
      fetch(`/api/maps/${mapId}/layers`).then((r) => r.json()),
      fetch(`/api/map-markers?mapId=${mapId}`).then((r) => r.json()),
    ]).then(([mapsData, layersData, markersData]) => {
      setAllMaps(Array.isArray(mapsData) ? mapsData : []);
      const current = (Array.isArray(mapsData) ? mapsData : []).find(
        (m: MapConfig) => m.mapId === mapId
      );
      setMapConfig(current || null);
      setLayers(Array.isArray(layersData) ? layersData : []);
      setMarkers(Array.isArray(markersData) ? markersData : []);
      setLoading(false);
    });
  }, [mapId]);

  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible } : l))
    );
  }, []);

  const handleLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  }, []);

  const handleMarkerSelect = useCallback(() => {
    // Could pan map to marker - placeholder for future implementation
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-40px)] items-center justify-center text-muted italic text-[13px]">
        Loading map...
      </div>
    );
  }

  if (!mapConfig) {
    return (
      <div className="py-8 text-center">
        <h1
          className="text-[1.5rem] font-normal text-heading border-b border-border pb-1 mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Map Not Found
        </h1>
        <p className="text-[13px] text-muted">
          No map configuration found for &quot;{mapId}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-4 flex h-[calc(100vh-40px)] flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <h1
          className="text-lg font-normal text-heading"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {mapConfig.name}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted italic">
            {editMode
              ? "Draw areas to link regions to articles"
              : "Hover over areas to explore locations"}
          </span>
          {isAdmin && (
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1 text-[12px] transition-colors ${
                editMode
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface-hover text-foreground hover:bg-surface"
              }`}
            >
              {editMode ? "Done editing" : "Edit map"}
            </button>
          )}
        </div>
      </div>

      {allMaps.length > 1 && <MapSelector maps={allMaps} />}

      <div className="relative flex-1">
        <WorldMap
          mapImage={mapConfig.imageUrl}
          editMode={editMode}
        />
        {!editMode && <MapSearch markers={markers} onSelect={handleMarkerSelect} />}
        <LayerControl
          layers={layers}
          onToggle={handleLayerToggle}
          onOpacityChange={handleLayerOpacity}
        />
      </div>
    </div>
  );
}
