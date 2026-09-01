"use client";

import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Info-style dialog: hide the cancel button (always resolves true on confirm). */
  hideCancel?: boolean;
};

/**
 * Promise-based replacement for `window.confirm`, rendered with ConfirmDialog.
 *
 * Usage:
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (!(await confirm("Delete this?", { danger: true }))) return;
 *   ...
 *   return <>{...page...}{confirmDialog}</>;
 */
export function useConfirm() {
  const [state, setState] = useState<{ message: string; options: ConfirmOptions } | null>(null);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      // Settle any dialog that was still pending before showing the new one.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ message, options });
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirmDialog = state ? (
    <ConfirmDialog
      open
      title={state.options.title ?? "Confirm"}
      message={state.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      danger={state.options.danger}
      hideCancel={state.options.hideCancel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, confirmDialog };
}
