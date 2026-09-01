"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  code: string;
}

export default function MermaidBlock({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    import("mermaid").then((m) => {
      const mermaid = m.default;
      mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });

      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      mermaid
        .render(id, code)
        .then(({ svg }) => {
          if (ref.current) ref.current.innerHTML = svg;
        })
        .catch((err: Error) => {
          setError(err.message);
        });
    }).catch(() => {
      setError("Mermaid failed to load");
    });
  }, [code]);

  if (error) {
    return (
      <div className="border border-danger-border bg-danger-soft rounded p-3 text-danger text-sm">
        <strong>Diagram error:</strong> {error}
        <pre className="mt-2 text-xs overflow-auto">{code}</pre>
      </div>
    );
  }

  return <div ref={ref} className="mermaid-block my-4 overflow-auto" />;
}
