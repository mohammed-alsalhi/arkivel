/**
 * Bespoke overlay scrollbar.
 *
 * Native scrollbars are fully hidden in index.css (no gutter, so the macOS
 * "Show scroll bars: Always" setting can never reflow tables). This module
 * draws floating thumb overlays instead: they appear only while hovering a
 * container that actually overflows, track its scroll position, support
 * dragging, and fade out on leave. One document-level listener handles every
 * scrollable in the app — components need no changes.
 */

const MIN_THUMB_PX = 24
const EDGE_GAP_PX = 3
const THICKNESS_PX = 7

type Axis = "v" | "h"

let target: HTMLElement | null = null
let raf = 0
let dragging: { axis: Axis; startPos: number; startScroll: number } | null = null

function isScrollable(el: HTMLElement, axis: Axis): boolean {
  // Surfaces with their own scroll affordance (e.g. the queue bucket strip's
  // chevrons) opt out of the overlay thumb entirely.
  if (el.dataset.overlayScrollbar === "off") return false
  const overflowing =
    axis === "v"
      ? el.scrollHeight > el.clientHeight + 1
      : el.scrollWidth > el.clientWidth + 1
  if (!overflowing) return false
  if (el === document.scrollingElement) return true
  const style = getComputedStyle(el)
  const overflow = axis === "v" ? style.overflowY : style.overflowX
  return overflow === "auto" || overflow === "scroll"
}

function findScrollable(start: EventTarget | null): HTMLElement | null {
  let el = start instanceof Element ? start : null
  while (el) {
    if (el instanceof HTMLElement && (isScrollable(el, "v") || isScrollable(el, "h"))) {
      return el
    }
    el = el.parentElement
  }
  const root = document.scrollingElement
  return root instanceof HTMLElement && (isScrollable(root, "v") || isScrollable(root, "h"))
    ? root
    : null
}

function makeThumb(axis: Axis): HTMLDivElement {
  const thumb = document.createElement("div")
  thumb.className = "overlay-scrollbar-thumb"
  thumb.dataset.axis = axis
  thumb.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!target) return
    e.preventDefault()
    try {
      thumb.setPointerCapture(e.pointerId)
    } catch {
      // pointer already released; drag still works while the cursor stays on the thumb
    }
    dragging = {
      axis,
      startPos: axis === "v" ? e.clientY : e.clientX,
      startScroll: axis === "v" ? target.scrollTop : target.scrollLeft,
    }
    thumb.classList.add("dragging")
  })
  thumb.addEventListener("pointermove", (e: PointerEvent) => {
    if (!dragging || dragging.axis !== axis || !target) return
    const rect = targetRect(target)
    const delta = (axis === "v" ? e.clientY : e.clientX) - dragging.startPos
    const trackLen =
      (axis === "v" ? rect.height : rect.width) - 2 * EDGE_GAP_PX - stickyHeaderInset(target, axis)
    const viewLen = axis === "v" ? target.clientHeight : target.clientWidth
    const scrollLen = axis === "v" ? target.scrollHeight : target.scrollWidth
    const thumbLen = Math.min(trackLen, Math.max(MIN_THUMB_PX, (viewLen / scrollLen) * trackLen))
    const maxScroll = scrollLen - viewLen
    const travel = trackLen - thumbLen
    // Nothing to drag when the track can't hold a moving thumb or content fits.
    if (travel <= 0 || maxScroll <= 0) return
    const scrolled = dragging.startScroll + (delta * maxScroll) / travel
    if (axis === "v") target.scrollTop = scrolled
    else target.scrollLeft = scrolled
  })
  const endDrag = () => {
    dragging = null
    thumb.classList.remove("dragging")
    schedule()
  }
  thumb.addEventListener("pointerup", endDrag)
  thumb.addEventListener("pointercancel", endDrag)
  document.body.appendChild(thumb)
  return thumb
}

let thumbV: HTMLDivElement | null = null
let thumbH: HTMLDivElement | null = null

function targetRect(el: HTMLElement): DOMRect {
  if (el === document.scrollingElement) {
    return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }
  return el.getBoundingClientRect()
}

/**
 * A pinned table header doesn't scroll, so the vertical track starts below
 * it instead of hovering over the pinned band.
 */
function stickyHeaderInset(el: HTMLElement, axis: Axis): number {
  if (axis !== "v") return 0
  const thead = el.querySelector("thead")
  if (!thead) return 0
  const probe = thead.querySelector("th") ?? thead
  if (getComputedStyle(probe).position !== "sticky") return 0
  return thead.getBoundingClientRect().height
}

function positionThumb(axis: Axis): void {
  const thumb = axis === "v" ? thumbV : thumbH
  if (!thumb) return
  const active =
    target && isScrollable(target, axis) && (!dragging || dragging.axis === axis)
  if (!active || !target) {
    thumb.classList.remove("visible")
    return
  }
  const rect = targetRect(target)
  const viewLen = axis === "v" ? target.clientHeight : target.clientWidth
  const scrollLen = axis === "v" ? target.scrollHeight : target.scrollWidth
  const scrolled = axis === "v" ? target.scrollTop : target.scrollLeft
  const inset = stickyHeaderInset(target, axis)
  const trackLen = (axis === "v" ? rect.height : rect.width) - 2 * EDGE_GAP_PX - inset
  const thumbLen = Math.min(trackLen, Math.max(MIN_THUMB_PX, (viewLen / scrollLen) * trackLen))
  const maxScroll = scrollLen - viewLen
  const travel = trackLen - thumbLen
  // Guard the denominators: a track shorter than the min thumb, or content that
  // barely overflows, would otherwise produce NaN offsets.
  const offset =
    EDGE_GAP_PX + inset + (maxScroll > 0 && travel > 0 ? (scrolled / maxScroll) * travel : 0)
  if (axis === "v") {
    thumb.style.top = `${rect.top + offset}px`
    thumb.style.left = `${rect.right - THICKNESS_PX - EDGE_GAP_PX}px`
    thumb.style.height = `${thumbLen}px`
    thumb.style.width = `${THICKNESS_PX}px`
  } else {
    thumb.style.left = `${rect.left + offset}px`
    thumb.style.top = `${rect.bottom - THICKNESS_PX - EDGE_GAP_PX}px`
    thumb.style.width = `${thumbLen}px`
    thumb.style.height = `${THICKNESS_PX}px`
  }
  thumb.classList.add("visible")
}

function schedule(): void {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    positionThumb("v")
    positionThumb("h")
  })
}

function setTarget(next: HTMLElement | null): void {
  if (dragging) return
  if (next === target) {
    if (target) schedule()
    return
  }
  target = next
  if (!target) {
    thumbV?.classList.remove("visible")
    thumbH?.classList.remove("visible")
    return
  }
  // Thumbs sit just above content (35) so floating docks/banners/toasts
  // cover them — unless the scrollable lives inside a dialog, where the
  // thumb must ride above the dialog shell (z-50).
  const zIndex = target.closest('[role="dialog"]') ? "60" : "35"
  if (thumbV) thumbV.style.zIndex = zIndex
  if (thumbH) thumbH.style.zIndex = zIndex
  schedule()
}

export function initOverlayScrollbar(): void {
  if (thumbV) return
  thumbV = makeThumb("v")
  thumbH = makeThumb("h")
  document.addEventListener(
    "pointerover",
    (e: PointerEvent) => {
      if (e.target === thumbV || e.target === thumbH) return
      setTarget(findScrollable(e.target))
    },
    { passive: true },
  )
  document.addEventListener(
    "pointerleave",
    () => setTarget(null),
    { passive: true },
  )
  document.addEventListener("scroll", schedule, { capture: true, passive: true })
  window.addEventListener("resize", schedule, { passive: true })
}
