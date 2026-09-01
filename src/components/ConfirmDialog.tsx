"use client";

import { useEffect, useRef } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { Button } from "@/components/ui";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">{title}</div>
        <div className="modal-body whitespace-pre-line">{message}</div>
        <div className="modal-footer">
          {!hideCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={danger ? "ui-button ui-button-danger" : "ui-button ui-button-primary"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
