"use client";

import { useEffect } from "react";
import { initOverlayScrollbar } from "@/lib/overlayScrollbar";

/** Mounts the bespoke hover-only overlay scrollbar once per document. */
export default function OverlayScrollbar() {
  useEffect(() => {
    initOverlayScrollbar();
  }, []);
  return null;
}
