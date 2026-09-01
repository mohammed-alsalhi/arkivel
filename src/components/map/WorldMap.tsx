"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  ImageOverlay,
  Polygon,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";

type MapArea = {
  id: string;
  label: string;
  polygon: [number, number][];
  color: string | null;
  article: { id: string; title: string; slug: string } | null;
};

const PRESET_COLORS = [
  "#3b82f6", // blue (default)
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

function createVertexIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 10px; height: 10px;
      background: var(--color-surface);
      border: 2px solid ${color};
      border-radius: 50%;
      cursor: grab;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
    map.setMaxBounds(L.latLngBounds(bounds).pad(0.1));
  }, [map, bounds]);
  return null;
}

function DrawingHandler({
  onAddPoint,
  onFinish,
}: {
  onAddPoint: (lat: number, lng: number) => void;
  onFinish: () => void;
}) {
  useMapEvents({
    click: (e) => {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
    dblclick: (e) => {
      L.DomEvent.stopPropagation(e);
      onFinish();
    },
  });
  return null;
}

function DeselectHandler({ onDeselect }: { onDeselect: () => void }) {
  useMapEvents({
    click: () => {
      onDeselect();
    },
  });
  return null;
}

function VertexMarkers({
  polygon,
  color,
  onVertexDrag,
}: {
  polygon: [number, number][];
  color: string;
  onVertexDrag: (index: number, lat: number, lng: number) => void;
}) {
  const icon = useMemo(() => createVertexIcon(color), [color]);

  return (
    <>
      {polygon.map((pt, i) => (
        <Marker
          key={i}
          position={pt}
          icon={icon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const latlng = e.target.getLatLng();
              onVertexDrag(i, latlng.lat, latlng.lng);
            },
          }}
        />
      ))}
    </>
  );
}

function ColorPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted">Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 pointer-coarse:h-9 pointer-coarse:w-9 cursor-pointer border border-border bg-transparent p-0"
        />
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`h-5 w-5 border ${
                value === c ? "border-foreground" : "border-border"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hover-interactive polygon wrapper */
function AreaPolygon({
  area,
  editMode,
  isSelected,
  onSelect,
}: {
  area: MapArea;
  editMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const polygonRef = useRef<L.Polygon | null>(null);
  const positions = area.polygon as L.LatLngTuple[];
  const areaColor = area.color || "#3b82f6";

  return (
    <Polygon
      ref={polygonRef}
      positions={positions}
      pathOptions={
        editMode
          ? {
              color: areaColor,
              weight: isSelected ? 3 : 2,
              dashArray: isSelected ? undefined : "6 4",
              fillColor: areaColor,
              fillOpacity: isSelected ? 0.25 : 0.15,
            }
          : {
              color: "transparent",
              weight: 0,
              fillColor: areaColor,
              fillOpacity: 0,
            }
      }
      eventHandlers={
        editMode
          ? {
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onSelect(area.id);
              },
            }
          : {
              click: () => {
                if (area.article) {
                  router.push(`/articles/${area.article.slug}`);
                }
              },
              mouseover: () => {
                polygonRef.current?.setStyle({
                  fillColor: areaColor,
                  fillOpacity: 0.2,
                  color: areaColor,
                  weight: 1,
                });
              },
              mouseout: () => {
                polygonRef.current?.setStyle({
                  fillColor: areaColor,
                  fillOpacity: 0,
                  color: "transparent",
                  weight: 0,
                });
              },
            }
      }
    >
      {/* View mode: tooltip on hover */}
      {!editMode && (
        <Tooltip sticky>
          <strong>{area.label}</strong>
        </Tooltip>
      )}
    </Polygon>
  );
}

type Props = {
  mapImage: string;
  editMode?: boolean;
};

// Leaflet writes pathOptions colors into SVG presentation attributes, which
// cannot resolve var() — read the theme token off the root element instead.
function resolvedThemeColor(token: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

export default function WorldMap({ mapImage, editMode = false }: Props) {
  const [areas, setAreas] = useState<MapArea[]>([]);
  const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);
  const [imageBounds, setImageBounds] = useState<L.LatLngBoundsLiteral | null>(null);

  // Drawing state (new areas)
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newArea, setNewArea] = useState({ label: "", articleId: "", color: "#3b82f6" });

  // Editing state (existing areas)
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingPolygon, setEditingPolygon] = useState<[number, number][] | null>(null);
  const [editForm, setEditForm] = useState({ label: "", articleId: "", color: "#3b82f6" });

  // Load image to get its natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const h = 1000;
      const w = (img.naturalWidth / img.naturalHeight) * h;
      setImageBounds([[0, 0], [h, w]]);
    };
    img.src = mapImage;
  }, [mapImage]);

  useEffect(() => {
    fetch("/api/map-markers")
      .then((r) => r.json())
      .then(setAreas);
  }, []);

  useEffect(() => {
    if (editMode) {
      fetch("/api/articles?limit=100")
        .then((r) => r.json())
        .then((data) => setArticles(data.articles || []));
    }
  }, [editMode]);

  // Clear editing state when leaving edit mode
  useEffect(() => {
    if (!editMode) {
      handleCancelEdit();
      handleCancelDrawing();
    }
  }, [editMode]);

  const handleAddPoint = useCallback(
    (lat: number, lng: number) => {
      if (!isDrawing) return;
      setDrawingPoints((prev) => [...prev, [lat, lng]]);
    },
    [isDrawing]
  );

  const handleFinishDrawing = useCallback(() => {
    if (drawingPoints.length < 3) return;
    setIsDrawing(false);
    setShowForm(true);
    setNewArea({ label: "", articleId: "", color: "#3b82f6" });
  }, [drawingPoints.length]);

  async function handleCreateArea(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/map-markers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newArea.label,
        polygon: drawingPoints,
        color: newArea.color,
        articleId: newArea.articleId || null,
      }),
    });
    if (res.ok) {
      const area = await res.json();
      setAreas((prev) => [...prev, area]);
      setShowForm(false);
      setDrawingPoints([]);
    }
  }

  async function handleDeleteArea(id: string) {
    await fetch(`/api/map-markers/${id}`, { method: "DELETE" });
    setAreas((prev) => prev.filter((a) => a.id !== id));
    if (editingAreaId === id) handleCancelEdit();
  }

  function handleCancelDrawing() {
    setIsDrawing(false);
    setDrawingPoints([]);
    setShowForm(false);
  }

  // --- Editing existing areas ---

  function handleSelectArea(id: string) {
    if (isDrawing) return;
    const area = areas.find((a) => a.id === id);
    if (!area) return;

    setEditingAreaId(id);
    setEditingPolygon(area.polygon.map((p) => [...p] as [number, number]));
    setEditForm({
      label: area.label,
      articleId: area.article?.id || "",
      color: area.color || "#3b82f6",
    });
  }

  function handleCancelEdit() {
    setEditingAreaId(null);
    setEditingPolygon(null);
    setEditForm({ label: "", articleId: "", color: "#3b82f6" });
  }

  async function handleUpdateArea(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAreaId) return;

    const res = await fetch(`/api/map-markers/${editingAreaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: editForm.label,
        polygon: editingPolygon,
        color: editForm.color,
        articleId: editForm.articleId || null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setAreas((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      handleCancelEdit();
    }
  }

  const handleVertexDrag = useCallback(
    (index: number, lat: number, lng: number) => {
      setEditingPolygon((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        updated[index] = [lat, lng];
        return updated;
      });
    },
    []
  );

  if (!imageBounds) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted text-[13px] italic">
        Loading map...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={imageBounds}
        style={{ height: "100%", width: "100%", background: "var(--color-background)" }}
        minZoom={-2}
        maxZoom={3}
        zoomControl={true}
        doubleClickZoom={false}
      >
        <FitBounds bounds={imageBounds} />
        <ImageOverlay url={mapImage} bounds={imageBounds} />

        {/* Render saved areas */}
        {areas.map((area) => {
          const displayArea =
            editingAreaId === area.id && editingPolygon
              ? { ...area, polygon: editingPolygon, color: editForm.color }
              : area;
          return (
            <AreaPolygon
              key={area.id}
              area={displayArea}
              editMode={editMode}
              isSelected={editingAreaId === area.id}
              onSelect={handleSelectArea}
            />
          );
        })}

        {/* Draggable vertex markers for selected area */}
        {editMode && editingAreaId && editingPolygon && (
          <VertexMarkers
            polygon={editingPolygon}
            color={editForm.color}
            onVertexDrag={handleVertexDrag}
          />
        )}

        {/* Drawing preview: lines between placed points */}
        {editMode && isDrawing && drawingPoints.length >= 2 && (
          <Polyline
            positions={drawingPoints}
            pathOptions={{ color: resolvedThemeColor("--color-accent"), weight: 2, dashArray: "6 4" }}
          />
        )}

        {/* Drawing preview: vertex dots */}
        {editMode && isDrawing &&
          drawingPoints.map((pt, i) => (
            <CircleMarker
              key={i}
              center={pt}
              radius={4}
              pathOptions={{
                color: resolvedThemeColor("--color-accent"),
                fillColor: resolvedThemeColor("--color-surface"),
                fillOpacity: 1,
                weight: 2,
              }}
            />
          ))}

        {/* Completed polygon preview (before save) */}
        {editMode && showForm && drawingPoints.length >= 3 && (
          <Polygon
            positions={drawingPoints}
            pathOptions={{
              color: newArea.color,
              weight: 2,
              fillColor: newArea.color,
              fillOpacity: 0.2,
            }}
          />
        )}

        {editMode && isDrawing && (
          <DrawingHandler onAddPoint={handleAddPoint} onFinish={handleFinishDrawing} />
        )}

        {/* Deselect when clicking empty map space */}
        {editMode && editingAreaId && !isDrawing && (
          <DeselectHandler onDeselect={handleCancelEdit} />
        )}
      </MapContainer>

      {/* Edit mode toolbar */}
      {editMode && !showForm && (
        <div className="absolute left-4 top-4 z-[1000] flex gap-2">
          {!isDrawing ? (
            <button
              onClick={() => {
                handleCancelEdit();
                setDrawingPoints([]);
                setShowForm(false);
                setIsDrawing(true);
              }}
              className="bg-accent px-3 py-1 text-[12px] font-bold text-accent-foreground shadow hover:bg-accent-hover"
            >
              Draw area
            </button>
          ) : (
            <>
              <button
                onClick={handleFinishDrawing}
                disabled={drawingPoints.length < 3}
                className="bg-accent px-3 py-1 text-[12px] font-bold text-accent-foreground shadow hover:bg-accent-hover disabled:opacity-40"
              >
                Finish ({drawingPoints.length} points)
              </button>
              <button
                onClick={handleCancelDrawing}
                className="border border-border bg-surface px-3 py-1 text-[12px] text-foreground shadow hover:bg-surface-hover"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* New area form */}
      {showForm && (
        <div className="absolute right-4 top-4 z-[1000] w-72 max-w-[calc(100vw-2rem)] border border-border bg-surface p-4 shadow-md">
          <h3 className="mb-3 text-[13px] font-bold text-heading">New Area</h3>
          <form onSubmit={handleCreateArea} className="space-y-2">
            <input
              type="text"
              value={newArea.label}
              onChange={(e) => setNewArea((p) => ({ ...p, label: e.target.value }))}
              placeholder="Label..."
              required
              className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
            />
            {articles.length > 0 ? (
              <select
                value={newArea.articleId}
                onChange={(e) => setNewArea((p) => ({ ...p, articleId: e.target.value }))}
                className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground"
              >
                <option value="">No linked article</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-muted italic">
                No articles yet. Create articles first to link them.
              </p>
            )}
            <ColorPickerField
              value={newArea.color}
              onChange={(c) => setNewArea((p) => ({ ...p, color: c }))}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-accent px-3 py-1 text-[12px] font-bold text-accent-foreground hover:bg-accent-hover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={handleCancelDrawing}
                className="border border-border px-3 py-1 text-[12px] text-foreground hover:bg-surface-hover"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit area form */}
      {editingAreaId && !showForm && (
        <div className="absolute right-4 top-4 z-[1000] w-72 max-w-[calc(100vw-2rem)] border border-border bg-surface p-4 shadow-md">
          <h3 className="mb-3 text-[13px] font-bold text-heading">Edit Area</h3>
          <form onSubmit={handleUpdateArea} className="space-y-2">
            <input
              type="text"
              value={editForm.label}
              onChange={(e) => setEditForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Label..."
              required
              className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground focus:border-accent focus:outline-none"
            />
            {articles.length > 0 ? (
              <select
                value={editForm.articleId}
                onChange={(e) => setEditForm((p) => ({ ...p, articleId: e.target.value }))}
                className="w-full border border-border bg-surface px-2 py-1 text-[13px] text-foreground"
              >
                <option value="">No linked article</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-muted italic">
                No articles yet. Create articles first to link them.
              </p>
            )}
            <ColorPickerField
              value={editForm.color}
              onChange={(c) => setEditForm((p) => ({ ...p, color: c }))}
            />
            <p className="text-[11px] text-muted italic">
              Drag vertices on the map to reshape the area.
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-accent px-3 py-1 text-[12px] font-bold text-accent-foreground hover:bg-accent-hover"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="border border-border px-3 py-1 text-[12px] text-foreground hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteArea(editingAreaId)}
                className="ml-auto text-[12px] text-danger hover:underline"
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
