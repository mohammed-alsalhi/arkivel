export type ComponentCategory =
  | "layout"
  | "navigation"
  | "input"
  | "feedback"
  | "data"
  | "content"
  | "editor";

export type ComponentRecipe = {
  category: ComponentCategory;
  description: string;
  importName: string;
  theming: string[];
};

export const componentCatalog = {
  Page: {
    category: "layout",
    description: "Responsive page wrapper with width variants for app, narrow, wide, and full layouts.",
    importName: "Page",
    theming: ["ui-page", "ui-page-narrow", "ui-page-wide", "ui-page-full"],
  },
  PageHeader: {
    category: "layout",
    description: "Shared page title, kicker, description, and action row.",
    importName: "PageHeader",
    theming: ["ui-page-header", "ui-page-title", "ui-page-kicker", "ui-page-dek"],
  },
  SectionPanel: {
    category: "layout",
    description: "Framed wiki panel with optional header actions and reusable body spacing.",
    importName: "SectionPanel",
    theming: ["wiki-portal", "wiki-portal-header", "wiki-portal-body"],
  },
  Button: {
    category: "input",
    description: "Themeable button with default, primary, and danger variants.",
    importName: "Button",
    theming: ["ui-button", "ui-button-primary", "ui-button-danger"],
  },
  LinkButton: {
    category: "navigation",
    description: "Next.js link styled with the shared button contract.",
    importName: "LinkButton",
    theming: ["ui-button", "ui-button-primary", "ui-button-danger"],
  },
  IconButton: {
    category: "input",
    description: "Accessible icon-only button with required label and tooltip title.",
    importName: "IconButton",
    theming: ["ui-icon-button"],
  },
  ToggleSwitch: {
    category: "input",
    description: "Accessible binary switch primitive with pressed-state styling.",
    importName: "ToggleSwitch",
    theming: ["ui-toggle-switch", "ui-toggle-switch-checked"],
  },
  Field: {
    category: "input",
    description: "Label, hint, error, and control wrapper for consistent forms.",
    importName: "Field",
    theming: ["ui-field", "ui-label", "ui-muted", "ui-field-error"],
  },
  Input: {
    category: "input",
    description: "Text input primitive using shared focus, border, and theme colors.",
    importName: "Input",
    theming: ["ui-input"],
  },
  Select: {
    category: "input",
    description: "Select primitive using shared focus, border, and theme colors.",
    importName: "Select",
    theming: ["ui-select"],
  },
  Textarea: {
    category: "input",
    description: "Textarea primitive using shared focus, border, and theme colors.",
    importName: "Textarea",
    theming: ["ui-textarea"],
  },
  Tabs: {
    category: "navigation",
    description: "Accessible tablist wrapper for admin, article, and settings workbenches.",
    importName: "Tabs",
    theming: ["article-tabbar"],
  },
  TabButton: {
    category: "navigation",
    description: "Ref-forwarding tab button for roving focus, ARIA-selected state, and keyboard navigation.",
    importName: "TabButton",
    theming: ["article-tab", "article-tab-active"],
  },
  CardLink: {
    category: "navigation",
    description: "Reusable linked card with optional media, description, and metadata slots.",
    importName: "CardLink",
    theming: ["ui-card-link", "ui-card-media", "ui-card-body", "ui-card-title"],
  },
  DataTable: {
    category: "data",
    description: "Table primitive for dense admin, docs, and article metadata tables.",
    importName: "DataTable",
    theming: ["ui-table"],
  },
  LoadingState: {
    category: "feedback",
    description: "Centered italic loading placeholder for client pages fetching data.",
    importName: "LoadingState",
    theming: ["ui-loading-state"],
  },
  EmptyState: {
    category: "feedback",
    description: "Reusable blank-state message with optional icon, description, and actions.",
    importName: "EmptyState",
    theming: ["ui-empty-state", "ui-empty-state-title", "ui-empty-state-actions"],
  },
  Chip: {
    category: "feedback",
    description: "Compact status or taxonomy chip with success, warning, danger, and info tones.",
    importName: "Chip",
    theming: ["ui-chip", "ui-chip-success", "ui-chip-warning", "ui-chip-danger", "ui-chip-info"],
  },
  StatGrid: {
    category: "data",
    description: "Responsive stat card grid for admin summaries and dashboard metrics.",
    importName: "StatGrid",
    theming: ["ui-stat-grid"],
  },
  StatCard: {
    category: "data",
    description: "Reusable metric card with value, label, and optional detail text.",
    importName: "StatCard",
    theming: ["ui-stat-card", "ui-stat-card-value", "ui-stat-card-label"],
  },
  Notice: {
    category: "feedback",
    description: "Inline notice/callout block for warnings, guidance, and contextual help.",
    importName: "Notice",
    theming: ["wiki-notice"],
  },
  InlineCode: {
    category: "content",
    description: "Inline code token with theme-aware surface color.",
    importName: "InlineCode",
    theming: ["ui-inline-code"],
  },
  CodeBlock: {
    category: "content",
    description: "Preformatted code block for docs, examples, exports, and API responses.",
    importName: "CodeBlock",
    theming: ["ui-code-block"],
  },
  EditorInsertTray: {
    category: "editor",
    description: "Reusable grouped block insertion tray for built-in and plugin-provided editor commands.",
    importName: "EditorInsertTray",
    theming: ["editor-tray", "editor-command-section", "editor-command-item"],
  },
  EditorReviewTray: {
    category: "editor",
    description: "Reusable editor review panel for readiness signals, quality checks, grammar, and coaching.",
    importName: "EditorReviewTray",
    theming: ["editor-tray", "editor-review-strip", "editor-check-list"],
  },
  EditorOutlineTray: {
    category: "editor",
    description: "Reusable section outline navigator and side-panel host for long-form editing.",
    importName: "EditorOutlineTray",
    theming: ["editor-tray", "editor-outline-list", "editor-side-panel"],
  },
  EditorSelectionActions: {
    category: "editor",
    description: "Contextual selected-text action bar for rewrite, expand, link, footnote, and plugin actions.",
    importName: "EditorSelectionActions",
    theming: ["editor-selection-bar", "editor-selection-action"],
  },
  EditorTableControls: {
    category: "editor",
    description: "Contextual table control group for row, column, header, merge, split, and delete-table actions.",
    importName: "EditorTableControls",
    theming: ["editor-toolbar-group", "editor-tool-button"],
  },
  ScreenReaderOnly: {
    category: "feedback",
    description: "Visually hidden text primitive for live summaries and assistive-technology-only labels.",
    importName: "ScreenReaderOnly",
    theming: ["ui-sr-only"],
  },
} satisfies Record<string, ComponentRecipe>;

export type ComponentCatalogKey = keyof typeof componentCatalog;
