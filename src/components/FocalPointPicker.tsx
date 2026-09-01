"use client";

import { useRef, useState } from "react";

type Props = {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
};

export default function FocalPointPicker({ imageUrl, focalX, focalY, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function getCoords(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handleClick(e: React.MouseEvent) {
    const coords = getCoords(e);
    if (coords) onChange(Math.round(coords.x), Math.round(coords.y));
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const coords = getCoords(e);
    if (coords) onChange(Math.round(coords.x), Math.round(coords.y));
  }

  function handleTouch(e: React.TouchEvent) {
    const coords = getCoords(e);
    if (coords) onChange(Math.round(coords.x), Math.round(coords.y));
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted">Tap or drag on the image to set the focal point used for cropped displays.</p>
      <div
        ref={containerRef}
        className="relative cursor-crosshair overflow-hidden rounded border border-border"
        style={{ maxWidth: 480, aspectRatio: "16/7", touchAction: "none" }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Focal point preview"
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focalX}% ${focalY}%` }}
        />
        {/* Crosshair marker */}
        <div
          style={{
            position: "absolute",
            left: `${focalX}%`,
            top: `${focalY}%`,
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "2.5px solid white",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            background: "rgba(255,255,255,0.25)",
          }}
        />
      </div>
      <p className="text-[11px] text-muted">
        Focal point: {focalX}% / {focalY}%
      </p>
    </div>
  );
}
