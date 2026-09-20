import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { InlineCode } from "@/components/ui";

const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`/g;

/**
 * Interface copy from the module registry: plain text with `[label](href)`
 * links and `` `code` `` spans, rendered with the page primitives.
 */
export function DocsText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [, label, href, code] = match;
    if (code !== undefined) parts.push(<InlineCode key={index}>{code}</InlineCode>);
    else parts.push(<Link key={index} href={href}>{label}</Link>);
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

/** Splits a registry feature line into its `title — body` halves. */
export function splitFeature(feature: string): { title: string; body: string } {
  const separator = feature.indexOf(" — ");
  if (separator < 0) return { title: feature, body: "" };
  return { title: feature.slice(0, separator), body: feature.slice(separator + 3) };
}
