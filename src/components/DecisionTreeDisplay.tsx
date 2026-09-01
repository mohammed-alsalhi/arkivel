"use client";

import { useState } from "react";
import type { DecisionTreeNode } from "./editor/DecisionTreeExtension";

interface NodeProps {
  node: DecisionTreeNode;
  depth?: number;
}

function TreeNode({ node, depth = 0 }: NodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.yes || node.no;

  return (
    <div className="decision-tree-node" style={{ marginLeft: depth > 0 ? "1.5rem" : 0 }}>
      <div className="flex items-start gap-2 my-1">
        {hasChildren && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] text-muted mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "" : "-rotate-90"}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
        <div className={`border rounded px-3 py-1.5 text-sm ${
          hasChildren ? "bg-accent text-accent-foreground border-accent" : "bg-surface border-border"
        }`}>
          {node.label}
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="border-l-2 border-border ml-4 pl-4 space-y-1">
          {node.yes && (
            <div>
              <span className="text-[10px] text-success font-semibold uppercase">Yes</span>
              <TreeNode node={node.yes} depth={depth + 1} />
            </div>
          )}
          {node.no && (
            <div>
              <span className="text-[10px] text-danger font-semibold uppercase">No</span>
              <TreeNode node={node.no} depth={depth + 1} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  treeJson: string;
}

export default function DecisionTreeDisplay({ treeJson }: Props) {
  let tree: DecisionTreeNode;
  try {
    tree = JSON.parse(treeJson);
  } catch {
    return <div className="text-sm text-danger border border-danger-border rounded p-3">Invalid decision tree data.</div>;
  }

  return (
    <div className="my-4 border border-border rounded p-4 bg-surface overflow-auto">
      <div className="text-xs text-muted mb-3 font-semibold uppercase">Decision Tree</div>
      <TreeNode node={tree} />
    </div>
  );
}
