import Link, { type LinkProps } from "next/link";
import clsx from "clsx";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type PageWidth = "default" | "narrow" | "wide" | "full";

type PageProps = HTMLAttributes<HTMLDivElement> & {
  width?: PageWidth;
};

const pageWidthClasses: Record<PageWidth, string> = {
  default: "ui-page",
  narrow: "ui-page ui-page-narrow",
  wide: "ui-page ui-page-wide",
  full: "ui-page ui-page-full",
};

export function Page({ children, className, width = "default", ...props }: PageProps) {
  return (
    <div className={clsx(pageWidthClasses[width], className)} {...props}>
      {children}
    </div>
  );
}

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  actions?: ReactNode;
  description?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  actions,
  className,
  description,
  kicker,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <header className={clsx("ui-page-header", className)} {...props}>
      <div className="ui-page-header-copy">
        {kicker && <p className="ui-page-kicker">{kicker}</p>}
        <h1 className="ui-page-title">{title}</h1>
        {description && <div className="ui-page-dek">{description}</div>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}

type ButtonVariant = "default" | "primary" | "danger";
type Tone = "default" | "success" | "warning" | "danger" | "info" | "special";

export function buttonClassName(variant: ButtonVariant = "default", className?: string) {
  return clsx(
    "ui-button",
    variant === "primary" && "ui-button-primary",
    variant === "danger" && "ui-button-danger",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, type = "button", variant = "default", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} type={type} {...props} />;
}

type AnchorButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
};

export function AnchorButton({ className, variant = "default", ...props }: AnchorButtonProps) {
  return <a className={buttonClassName(variant, className)} {...props} />;
}

type LinkButtonProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: ButtonVariant;
  };

export function LinkButton({ className, variant = "default", ...props }: LinkButtonProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({
  children,
  className,
  label,
  title,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={clsx("ui-icon-button", className)}
      title={title ?? label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

type FieldProps = HTMLAttributes<HTMLDivElement> & {
  error?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
};

export function Field({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  ...props
}: FieldProps) {
  return (
    <div className={clsx("ui-field", className)} {...props}>
      <label className="ui-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="ui-muted">{hint}</p>}
      {error && <p className="ui-field-error">{error}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={clsx("ui-input", className)} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return <select className={clsx("ui-select", className)} {...props} />;
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={clsx("ui-textarea", className)} {...props} />;
}

type InlineCodeProps = HTMLAttributes<HTMLElement>;

export function InlineCode({ className, ...props }: InlineCodeProps) {
  return <code className={clsx("ui-inline-code", className)} {...props} />;
}

type CodeBlockProps = HTMLAttributes<HTMLPreElement>;

export function CodeBlock({ className, ...props }: CodeBlockProps) {
  return <pre className={clsx("ui-code-block", className)} {...props} />;
}

type KeyboardKeyProps = HTMLAttributes<HTMLElement>;

export function KeyboardKey({ className, ...props }: KeyboardKeyProps) {
  return <kbd className={clsx("ui-kbd", className)} {...props} />;
}

type ScreenReaderOnlyProps = HTMLAttributes<HTMLSpanElement>;

export function ScreenReaderOnly({ className, ...props }: ScreenReaderOnlyProps) {
  return <span className={clsx("ui-sr-only", className)} {...props} />;
}

type NoticeProps = HTMLAttributes<HTMLDivElement>;

export function Notice({ className, ...props }: NoticeProps) {
  return <div className={clsx("wiki-notice", className)} {...props} />;
}

type ToggleSwitchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean;
};

export function ToggleSwitch({
  checked,
  className,
  type = "button",
  ...props
}: ToggleSwitchProps) {
  return (
    <button
      aria-pressed={checked}
      className={clsx("ui-toggle-switch", checked && "ui-toggle-switch-checked", className)}
      type={type}
      {...props}
    >
      <span className="ui-toggle-switch-thumb" />
    </button>
  );
}

type TabsProps = HTMLAttributes<HTMLElement> & {
  label?: string;
};

export function Tabs({ children, className, label = "Sections", ...props }: TabsProps) {
  return (
    <nav className={clsx("article-tabbar", className)} aria-label={label} role="tablist" {...props}>
      {children}
    </nav>
  );
}

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export const TabButton = forwardRef<HTMLButtonElement, TabButtonProps>(function TabButton(
  { active = false, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      aria-selected={active}
      className={clsx("article-tab", active && "article-tab-active", className)}
      ref={ref}
      role="tab"
      type={type}
      {...props}
    />
  );
});

type TabLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    active?: boolean;
  };

export function TabLink({ active = false, className, ...props }: TabLinkProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-selected={active}
      className={clsx("article-tab", active && "article-tab-active", className)}
      role="tab"
      {...props}
    />
  );
}

type ToolbarProps = HTMLAttributes<HTMLDivElement>;

export function Toolbar({ className, ...props }: ToolbarProps) {
  return <div className={clsx("ui-toolbar", className)} {...props} />;
}

type ToolbarGroupProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
};

export function ToolbarGroup({ children, className, label, ...props }: ToolbarGroupProps) {
  return (
    <div className={clsx("ui-toolbar-group", className)} {...props}>
      {label && <span className="ui-toolbar-label">{label}</span>}
      {children}
    </div>
  );
}

type ToolbarDividerProps = HTMLAttributes<HTMLSpanElement>;

export function ToolbarDivider({ className, ...props }: ToolbarDividerProps) {
  return <span aria-hidden="true" className={clsx("ui-toolbar-divider", className)} {...props} />;
}

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Chip({ className, tone = "default", ...props }: ChipProps) {
  return <span className={clsx("ui-chip", tone !== "default" && `ui-chip-${tone}`, className)} {...props} />;
}

type DropdownProps = HTMLAttributes<HTMLDivElement>;

export function Dropdown({ className, ...props }: DropdownProps) {
  return <div className={clsx("ui-dropdown", className)} {...props} />;
}

type DropdownItemProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function DropdownItem({ className, type = "button", ...props }: DropdownItemProps) {
  return <button className={clsx("ui-dropdown-item", className)} type={type} {...props} />;
}

type DropdownLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export function DropdownLink({ className, ...props }: DropdownLinkProps) {
  return <Link className={clsx("ui-dropdown-item", className)} {...props} />;
}

type PanelProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  bodyClassName?: string;
  title?: ReactNode;
};

export function Panel({ bodyClassName, children, className, title, ...props }: PanelProps) {
  return (
    <div className={clsx("ui-panel", className)} {...props}>
      {title && <div className="ui-panel-header">{title}</div>}
      <div className={clsx("ui-panel-body", bodyClassName)}>{children}</div>
    </div>
  );
}

type SectionPanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  actions?: ReactNode;
  bodyClassName?: string;
  title?: ReactNode;
};

type SectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  actions?: ReactNode;
  title?: ReactNode;
};

export function Section({ actions, children, className, title, ...props }: SectionProps) {
  return (
    <section className={clsx("ui-section", className)} {...props}>
      {(title || actions) && (
        <div className="ui-section-header">
          {title && <h2 className="ui-section-title">{title}</h2>}
          {actions && <div className="ui-section-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionPanel({
  actions,
  bodyClassName,
  children,
  className,
  title,
  ...props
}: SectionPanelProps) {
  return (
    <section className={clsx("wiki-portal", className)} {...props}>
      {title && (
        <div className="wiki-portal-header">
          <span>{title}</span>
          {actions}
        </div>
      )}
      <div className={clsx("wiki-portal-body", bodyClassName)}>{children}</div>
    </section>
  );
}

type DataTableProps = TableHTMLAttributes<HTMLTableElement>;

export function DataTable({ className, ...props }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("ui-table", className)} {...props} />
    </div>
  );
}

type ListProps = HTMLAttributes<HTMLUListElement> & {
  density?: "default" | "compact";
};

export function List({ className, density = "default", ...props }: ListProps) {
  return (
    <ul
      className={clsx(
        "ui-list",
        density === "compact" && "ui-list-compact",
        className,
      )}
      {...props}
    />
  );
}

type FeatureItemProps = Omit<HTMLAttributes<HTMLLIElement>, "title"> & {
  title?: ReactNode;
};

export function FeatureItem({ children, className, title, ...props }: FeatureItemProps) {
  return (
    <li className={className} {...props}>
      {title ? (
        <>
          <strong>{title}</strong>
          {children ? <> — {children}</> : null}
        </>
      ) : (
        children
      )}
    </li>
  );
}

type DefinitionGridProps = HTMLAttributes<HTMLDListElement>;

export function DefinitionGrid({ className, ...props }: DefinitionGridProps) {
  return <dl className={clsx("ui-definition-grid", className)} {...props} />;
}

type DefinitionItemProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
};

export function DefinitionItem({ className, label, value, ...props }: DefinitionItemProps) {
  return (
    <div className={clsx("ui-definition-item", className)} {...props}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type LoadingStateProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
};

export function LoadingState({ className, label = "Loading...", ...props }: LoadingStateProps) {
  return (
    <div className={clsx("ui-loading-state", className)} {...props}>
      {label}
    </div>
  );
}

type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
};

export function EmptyState({
  actions,
  children,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div className={clsx("ui-empty-state", className)} {...props}>
      {icon && (
        <div className="ui-empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <div className="ui-empty-state-title">{title}</div>}
      {description && <div className="ui-empty-state-description">{description}</div>}
      {children}
      {actions && <div className="ui-empty-state-actions">{actions}</div>}
    </div>
  );
}

type StatGridProps = HTMLAttributes<HTMLDivElement>;

export function StatGrid({ className, ...props }: StatGridProps) {
  return <div className={clsx("ui-stat-grid", className)} {...props} />;
}

type StatCardProps = HTMLAttributes<HTMLDivElement> & {
  detail?: ReactNode;
  label: ReactNode;
  value: ReactNode;
};

export function StatCard({ className, detail, label, value, ...props }: StatCardProps) {
  return (
    <div className={clsx("ui-stat-card", className)} {...props}>
      <div className="ui-stat-card-value">{value}</div>
      <div className="ui-stat-card-label">{label}</div>
      {detail && <div className="ui-stat-card-detail">{detail}</div>}
    </div>
  );
}

type CardGridProps = HTMLAttributes<HTMLDivElement>;

export function CardGrid({ className, ...props }: CardGridProps) {
  return <div className={clsx("ui-card-grid", className)} {...props} />;
}

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  description?: ReactNode;
  media?: ReactNode;
  meta?: ReactNode;
  title?: ReactNode;
};

export function Card({ children, className, description, media, meta, title, ...props }: CardProps) {
  return (
    <div className={clsx("ui-card", className)} {...props}>
      {media && <div className="ui-card-media">{media}</div>}
      <div className="ui-card-body">
        {title && <div className="ui-card-title">{title}</div>}
        {description && <div className="ui-card-description">{description}</div>}
        {children}
        {meta && <div className="ui-card-meta">{meta}</div>}
      </div>
    </div>
  );
}

type CardLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "media" | "title"> & {
    description?: ReactNode;
    media?: ReactNode;
    meta?: ReactNode;
    title: ReactNode;
  };

export function CardLink({ className, description, media, meta, title, ...props }: CardLinkProps) {
  return (
    <Link className={clsx("ui-card-link", className)} {...props}>
      {media && <span className="ui-card-media">{media}</span>}
      <span className="ui-card-body">
        <span className="ui-card-title">{title}</span>
        {description && <span className="ui-card-description">{description}</span>}
        {meta && <span className="ui-card-meta">{meta}</span>}
      </span>
    </Link>
  );
}
