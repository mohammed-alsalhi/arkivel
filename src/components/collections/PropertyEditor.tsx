"use client";

import { useId, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Chip } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import type { PersonOption } from "@/modules/collections/model";
import type { PropertyDefinition, PropertyValue } from "@/modules/collections/properties";
import { rememberLabel, useLabel } from "./labels";
import { ChoicePicker, type Choice } from "./ChoicePicker";

export type EditorContext = {
  users: PersonOption[];
  /** The collection this editor lives in; relation editors use it to resolve targets. */
  collectionId: string;
};

type EditorProps = {
  property: PropertyDefinition;
  value: PropertyValue;
  onChange: (value: PropertyValue) => void;
  context: EditorContext;
  /** Borderless controls that fill a collection cell. */
  compact?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
  autoFocus?: boolean;
};

const controlClass = (compact: boolean | undefined) => compact ? "collections-cell-control" : "ui-input";

type DeferredInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
  deferred?: boolean;
};

/** Inline writes wait for blur; local forms report each draft immediately. */
export function DeferredInput({ value, onCommit, onKeyDown, deferred = true, ...props }: DeferredInputProps) {
  const [draft, setDraft] = useState(value);
  const cancelBlur = useRef(false);
  const commit = () => {
    if (!deferred) return;
    if (cancelBlur.current) {
      cancelBlur.current = false;
      return;
    }
    if (draft !== value) onCommit(draft);
  };
  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      cancelBlur.current = true;
      setDraft(value);
      event.currentTarget.blur();
    }
  };
  return (
    <input
      {...props}
      value={deferred ? draft : value}
      onChange={(event) => {
        if (deferred) setDraft(event.target.value);
        else onCommit(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={handleKey}
    />
  );
}

/** A yyyy-mm-dd value is a calendar day, not an instant: format it in local time so it never shifts a day. */
function formatDay(day: string, compact = false) {
  const date = new Date(`${day}T00:00:00`);
  return compact ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : formatDate(date);
}

async function searchPages(query: string): Promise<Choice[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`);
  if (!res.ok) throw new Error("Couldn't load pages");
  const data = (await res.json()) as { results?: { id: string; title: string }[] };
  return (data.results ?? []).map((article) => ({ id: article.id, label: article.title }));
}

function searchItems(collectionId: string) {
  return async (query: string): Promise<Choice[]> => {
    const res = await fetch(`/api/collections/${encodeURIComponent(collectionId)}/items?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Couldn't load items");
    const data = (await res.json()) as { items?: { id: string; title: string }[] };
    return (data.items ?? []).map((item) => ({ id: item.id, label: item.title }));
  };
}

function PageEditor({ value, onChange, compact, readOnly, disabled, id, label: fieldLabel }: Omit<EditorProps, "property" | "context"> & { label: string }) {
  const articleId = typeof value === "string" ? value : null;
  const label = useLabel("page", articleId);
  if (readOnly) return articleId ? <span>{label}</span> : <span className="ui-muted">—</span>;
  return (
    <ChoicePicker id={id} label={fieldLabel} compact={compact} disabled={disabled} selected={articleId ? [articleId] : []} loadOptions={searchPages}
      onPick={(result) => {
        if (result) rememberLabel("page", result.id, result.label);
        onChange(result ? result.id : null);
      }}>
      {articleId ? <span>{label}</span> : <span className="collections-choice-placeholder">link a page</span>}
    </ChoicePicker>
  );
}

function RelationChip({ collectionId, itemId, onRemove, disabled }: { collectionId: string; itemId: string; onRemove?: () => void; disabled?: boolean }) {
  const label = useLabel(`item:${collectionId}`, itemId);
  if (!onRemove) return <Chip>{label}</Chip>;
  return (
    <div className="collections-choice-selected-item">
      <Chip>{label}</Chip>
      <button type="button" className="collections-choice-remove" aria-label={`remove ${label}`} disabled={disabled} onClick={onRemove}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
      </button>
    </div>
  );
}

function RelationEditor({ property, value, onChange, compact, readOnly, disabled, id }: EditorProps & { property: Extract<PropertyDefinition, { type: "relation" }> }) {
  const ids = Array.isArray(value) ? value : [];
  const loadOptions = useMemo(() => searchItems(property.collectionId), [property.collectionId]);
  const labels = ids.map((itemId) => <RelationChip key={itemId} collectionId={property.collectionId} itemId={itemId} />);
  if (readOnly) return <span className="collections-chips">{ids.length ? labels : <span className="ui-muted">—</span>}</span>;
  return (
    <ChoicePicker id={id} label={property.name} compact={compact} disabled={disabled} multiple selected={ids} loadOptions={loadOptions}
      selection={ids.length > 0 ? ids.map((itemId) => (
        <RelationChip key={itemId} collectionId={property.collectionId} itemId={itemId} disabled={disabled}
          onRemove={() => onChange(ids.filter((id) => id !== itemId))} />
      )) : undefined}
      onPick={(result) => {
        if (!result) { onChange([]); return; }
        rememberLabel(`item:${property.collectionId}`, result.id, result.label);
        onChange(ids.includes(result.id) ? ids.filter((id) => id !== result.id) : [...ids, result.id]);
      }}>
      {ids.length ? labels : <span className="collections-choice-placeholder">link {property.name}</span>}
    </ChoicePicker>
  );
}

function MultiSelectEditor({ property, value, onChange, compact, readOnly, disabled, id }: EditorProps & { property: Extract<PropertyDefinition, { type: "multi_select" }> }) {
  const ids = Array.isArray(value) ? value : [];
  const labels = ids.map((optionId) => {
    const option = property.options.find((entry) => entry.id === optionId);
    return <Chip key={optionId} tone={option?.tone ?? "default"}>{option?.label ?? "unavailable option"}</Chip>;
  });
  if (readOnly) return <span className="collections-chips">{ids.length ? labels : <span className="ui-muted">—</span>}</span>;
  return (
    <ChoicePicker id={id} label={property.name} compact={compact} disabled={disabled} multiple selected={ids} options={property.options.map((option) => ({ ...option, tone: option.tone ?? "default" }))}
      onPick={(option) => onChange(!option ? [] : ids.includes(option.id) ? ids.filter((id) => id !== option.id) : [...ids, option.id])}>
      {ids.length ? labels : <span className="collections-choice-placeholder">empty</span>}
    </ChoicePicker>
  );
}

/** Choice fields stay label-shaped while editing; text fields reveal an input on activation. */
export function EditableProperty(props: EditorProps) {
  const [editing, setEditing] = useState(false);
  const valueId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const { property, value, readOnly } = props;
  const computed = property.type === "created_time" || property.type === "updated_time";
  if (readOnly || computed || ["checkbox", "title", "select", "multi_select", "person", "page", "relation"].includes(property.type)) return <PropertyEditor {...props} />;
  return (
    <div
      className="collections-editable"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Enter") {
          setEditing(false);
          requestAnimationFrame(() => trigger.current?.focus());
        }
      }}
    >
      {editing ? (
        <PropertyEditor {...props} autoFocus />
      ) : (
        <button ref={trigger} disabled={props.disabled} type="button" className="collections-value-button" aria-label={`edit ${property.name}`} aria-describedby={valueId} onClick={() => setEditing(true)}>
          <span id={valueId}>
            {property.type === "url" ? (
              <span className="collections-url-label">{String(value || "—")}</span>
            ) : (
              <PropertyEditor {...props} readOnly />
            )}
          </span>
        </button>
      )}
    </div>
  );
}

/** One editor per property type; the same component serves table cells (`compact`) and the item form. */
export function PropertyEditor(props: EditorProps) {
  const { property, value, onChange, context, compact, readOnly, disabled, id, autoFocus } = props;
  const inputClass = controlClass(compact);

  switch (property.type) {
    case "title":
    case "text": {
      const text = typeof value === "string" ? value : "";
      if (readOnly) return text ? <span>{text}</span> : <span className="ui-muted">—</span>;
      return (
        <DeferredInput
          key={compact ? text : undefined}
          deferred={Boolean(compact)}
          id={id}
          aria-label={property.name}
          className={inputClass}
          value={text}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={property.type === "title" ? "untitled" : ""}
          onCommit={(next) => onChange(compact ? next.trim() || (property.type === "title" ? text : null) : next)}
        />
      );
    }
    case "number": {
      const number = typeof value === "number" ? String(value) : "";
      if (readOnly) return number ? <span>{number}</span> : <span className="ui-muted">—</span>;
      return (
        <DeferredInput
          key={compact ? number : undefined}
          deferred={Boolean(compact)}
          id={id}
          type="number"
          aria-label={property.name}
          step="any"
          inputMode="decimal"
          className={inputClass}
          value={number}
          autoFocus={autoFocus}
          disabled={disabled}
          onCommit={(next) => {
            const parsed = Number.parseFloat(next);
            onChange(next.trim() === "" || Number.isNaN(parsed) ? null : parsed);
          }}
        />
      );
    }
    case "url": {
      const url = typeof value === "string" ? value : "";
      if (readOnly) {
        return url ? (
          <a href={url} target="_blank" rel="noreferrer noopener">
            {url}
          </a>
        ) : (
          <span className="ui-muted">—</span>
        );
      }
      return (
        <DeferredInput
          key={compact ? url : undefined}
          deferred={Boolean(compact)}
          id={id}
          type="url"
          aria-label={property.name}
          className={inputClass}
          value={url}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="https://"
          onCommit={(next) => onChange(compact ? next.trim() || null : next)}
        />
      );
    }
    case "date": {
      const date = typeof value === "string" ? value : "";
      if (readOnly) return date ? <time dateTime={date} title={formatDay(date)}>{formatDay(date, compact)}</time> : <span className="ui-muted">—</span>;
      return (
        <input
          id={id}
          type="date"
          aria-label={property.name}
          className={inputClass}
          value={date}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value || null)}
        />
      );
    }
    case "checkbox": {
      const checked = value === true;
      return (
        <input
          id={id}
          type="checkbox"
          className="collections-checkbox"
          checked={checked}
          disabled={readOnly || disabled}
          aria-label={property.name}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    }
    case "select": {
      const selected = typeof value === "string" ? value : "";
      const option = property.options.find((entry) => entry.id === selected);
      if (readOnly) return option ? <Chip tone={option.tone}>{option.label}</Chip> : <span className="ui-muted">—</span>;
      return (
        <ChoicePicker id={id} label={property.name} compact={compact} disabled={disabled} selected={selected ? [selected] : []}
          options={property.options.map((option) => ({ ...option, tone: option.tone ?? "default" }))}
          onPick={(option) => onChange(option?.id ?? null)} />
      );
    }
    case "multi_select":
      return <MultiSelectEditor {...props} property={property} />;
    case "person": {
      const selected = typeof value === "string" ? value : "";
      const person = context.users.find((user) => user.id === selected);
      if (readOnly)
        return person ? (
          <span>{person.label}</span>
        ) : selected ? (
          <span className="ui-muted">unavailable person</span>
        ) : (
          <span className="ui-muted">—</span>
        );
      return (
        <ChoicePicker id={id} label={property.name} compact={compact} disabled={disabled} selected={selected ? [selected] : []}
          options={context.users} onPick={(option) => onChange(option?.id ?? null)} placeholder={selected ? "unavailable person" : "unassigned"} />
      );
    }
    case "page":
      return <PageEditor value={value} onChange={onChange} compact={compact} readOnly={readOnly} disabled={disabled} id={id} label={property.name} />;
    case "relation":
      return <RelationEditor {...props} property={property} />;
    case "created_time":
    case "updated_time": {
      const stamp = typeof value === "string" ? value : "";
      return <span className="ui-muted">{stamp ? formatDate(stamp) : "—"}</span>;
    }
  }
}
