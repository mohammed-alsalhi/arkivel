"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Button, DataTable, EmptyState, Input } from "@/components/ui";
import { NavIcon, PagesIcon, PlusIcon, SearchIcon } from "@/components/icons";
import type { IconName } from "@/modules/types";
import type { CollectionDTO, ItemDTO, ItemPage, PersonOption, ViewDTO } from "@/modules/collections/model";
import {
  applyView,
  displayValue,
  propertyValue,
  titleProperty,
  VIEW_KINDS,
  type PropertyDefinition,
  type PropertySchema,
  type PropertyValue,
  type PropertyValues,
  type ViewKind,
} from "@/modules/collections/properties";
import { api, describeFailure } from "./api";
import { PropertiesPanel } from "./PropertiesPanel";
import { EditableProperty, PropertyEditor } from "./PropertyEditor";
import { ViewSettingsPanel } from "./ViewSettingsPanel";
import { CollectionCalendar } from "./CollectionCalendar";
import { ChoicePicker } from "./ChoicePicker";
import { fetchLabel } from "./labels";

type Props = {
  collection: CollectionDTO;
  view: ViewDTO;
  page: ItemPage;
  users: PersonOption[];
  canEdit: boolean;
  importAction?: ReactNode;
};
type Status = { tone: "muted" | "error"; text: string } | null;

function viewHref(slug: string, view: ViewDTO) {
  return view.isDefault
    ? `/collections/${encodeURIComponent(slug)}`
    : `/collections/${encodeURIComponent(slug)}/${encodeURIComponent(view.slug)}`;
}
export function itemHref(slug: string, itemId: string) {
  return `/collections/${encodeURIComponent(slug)}/items/${encodeURIComponent(itemId)}`;
}

const COLUMN_WIDTHS: Record<PropertyDefinition["type"], number> = {
  title: 18,
  text: 14,
  url: 14,
  page: 14,
  checkbox: 4.5,
  number: 7,
  date: 9,
  select: 9,
  multi_select: 12,
  person: 9,
  relation: 8.5,
  created_time: 10,
  updated_time: 10,
};

const PROPERTY_ICONS: Partial<Record<PropertyDefinition["type"], IconName>> = {
  title: "pages",
  text: "pages",
  page: "pages",
  select: "tag",
  multi_select: "tag",
  relation: "graph",
  url: "graph",
};

/** All four layouts use the same items, saved view rules, and property editors. */
export function CollectionTable({ collection, view: initialView, page, users, canEdit, importAction }: Props) {
  const router = useRouter();
  const [schema, setSchema] = useState<PropertySchema>(collection.schema);
  const [views, setViews] = useState<ViewDTO[]>(collection.views);
  const [view, setView] = useState<ViewDTO>(initialView);
  const [items, setItems] = useState<ItemDTO[]>(page.items);
  const [seenPage, setSeenPage] = useState(page);
  const [total, setTotal] = useState(page.total);
  const [hasMore, setHasMore] = useState(page.hasMore);
  const [nextPage, setNextPage] = useState(page.page + 1);
  const [loadError, setLoadError] = useState("");
  const [panel, setPanel] = useState<"properties" | "view" | "new-view" | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [query, setQuery] = useState("");
  const [referenceLabels, setReferenceLabels] = useState<Record<string, string>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProperties, setNewProperties] = useState<PropertyValues>({});
  const [creating, setCreating] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewKind, setViewKind] = useState<ViewKind>("table");
  const [addingView, setAddingView] = useState(false);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const itemLocks = useRef(new Set<string>());
  const newTitleRef = useRef<HTMLInputElement>(null);
  if (seenPage !== page) {
    setSeenPage(page);
    setItems(page.items);
    setTotal(page.total);
    setHasMore(page.hasMore);
    setNextPage(page.page + 1);
    setLoadError("");
  }
  const base = `/api/collections/${encodeURIComponent(collection.id)}`;
  const context = { users, collectionId: collection.id };
  const title = titleProperty(schema);
  const groupProperty = schema.find((property) => property.id === view.config.groupBy);
  const boardProperty = groupProperty?.type === "select" ? groupProperty : schema.find((property) => property.type === "select");
  const dateProperty = groupProperty?.type === "date" ? groupProperty : schema.find((property) => property.type === "date");
  const needle = query.trim().toLocaleLowerCase();
  const searched = needle
    ? items.filter((item) =>
        schema.some((property) => {
          const value = propertyValue(item, property);
          const text =
            property.type === "relation" || property.type === "page"
              ? (Array.isArray(value) ? value : [value]).map((id) => referenceLabels[`${property.id}:${id}`] ?? "").join(" ")
              : property.type === "person"
                ? (users.find((user) => user.id === value)?.label ?? "")
                : displayValue(property, value);
          return text.toLocaleLowerCase().includes(needle);
        }),
      )
    : items;
  const result = applyView(
    searched,
    { ...view.config, ...(view.kind === "board" && boardProperty ? { groupBy: boardProperty.id } : {}) },
    schema,
  );
  const columns = [...(title ? [title] : []), ...result.columns.filter((property) => property.type !== "title")];
  const cardProperties = columns.filter((property) => property.type !== "title");

  useEffect(() => {
    let cancelled = false;
    const references = new Map<string, Promise<string>>();
    for (const property of schema) {
      if (property.type !== "relation" && property.type !== "page") continue;
      for (const item of items) {
        const value = propertyValue(item, property);
        for (const id of Array.isArray(value) ? value : [value]) {
          if (typeof id !== "string" || !id) continue;
          const key = `${property.id}:${id}`;
          if (!references.has(key))
            references.set(key, fetchLabel(property.type === "page" ? "page" : `item:${property.collectionId}`, id));
        }
      }
    }
    Promise.all([...references].map(async ([key, label]) => [key, await label] as const)).then((labels) => {
      if (!cancelled) setReferenceLabels(Object.fromEntries(labels));
    });
    return () => {
      cancelled = true;
    };
  }, [items, schema]);

  // Load every page before calling view totals complete: filters must also see later records.
  useEffect(() => {
    if (!hasMore || loadError) return;
    let cancelled = false;
    api<ItemPage>(`${base}/items?page=${nextPage}`).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setLoadError(describeFailure(response));
        return;
      }
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...response.data.items.filter((item) => !known.has(item.id))];
      });
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
      setNextPage(response.data.page + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [base, hasMore, loadError, nextPage, page]);

  const replaceItem = (id: string, next: ItemDTO) => setItems((current) => current.map((item) => (item.id === id ? next : item)));
  const commit = async (item: ItemDTO, property: PropertyDefinition, value: PropertyValue) => {
    if (itemLocks.current.has(item.id)) return;
    itemLocks.current.add(item.id);
    setSavingItems(new Set(itemLocks.current));
    replaceItem(
      item.id,
      property.type === "title"
        ? { ...item, title: String(value ?? "") }
        : { ...item, properties: { ...item.properties, [property.id]: value } },
    );
    setStatus({ tone: "muted", text: "saving…" });
    const response = await api<ItemDTO>(`${base}/items/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: property.type === "title" ? { title: value } : { properties: { [property.id]: value } },
    });
    replaceItem(item.id, response.ok ? response.data : item);
    itemLocks.current.delete(item.id);
    setSavingItems(new Set(itemLocks.current));
    setStatus(response.ok ? null : { tone: "error", text: `couldn't save ${property.name}: ${describeFailure(response)}` });
  };

  const openNew = (properties: PropertyValues = {}) => {
    setNewProperties(properties);
    setNewOpen(true);
    requestAnimationFrame(() => {
      newTitleRef.current?.focus();
      newTitleRef.current?.scrollIntoView({ block: "nearest" });
    });
  };
  const create = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    const response = await api<ItemDTO>(`${base}/items`, { method: "POST", body: { title: newTitle.trim(), properties: newProperties } });
    setCreating(false);
    if (!response.ok) {
      setStatus({ tone: "error", text: `couldn't add item: ${describeFailure(response)}` });
      return;
    }
    setItems((current) => [...current, response.data]);
    setTotal((count) => count + 1);
    setNewTitle("");
    setStatus(null);
    newTitleRef.current?.focus();
  };
  const addView = async () => {
    if (!viewName.trim() || addingView) return;
    setAddingView(true);
    const group =
      viewKind === "board"
        ? schema.find((property) => property.type === "select")
        : viewKind === "calendar"
          ? schema.find((property) => property.type === "date")
          : null;
    const response = await api<ViewDTO>(`${base}/views`, {
      method: "POST",
      body: {
        name: viewName.trim(),
        kind: viewKind,
        config: { ...view.config, ...(group ? { groupBy: group.id } : { groupBy: undefined }) },
      },
    });
    setAddingView(false);
    if (!response.ok) {
      setStatus({ tone: "error", text: describeFailure(response) });
      return;
    }
    router.push(viewHref(collection.slug, response.data));
    router.refresh();
  };
  const onSchemaSaved = async (next: PropertySchema) => {
    const known = new Set(schema.map((property) => property.id));
    const added = next.filter((property) => !known.has(property.id)).map((property) => property.id);
    setSchema(next);
    setPanel(null);
    if (added.length) {
      const config = { ...view.config, visible: [...view.config.visible, ...added] };
      if (view.id) {
        const response = await api<ViewDTO>(`${base}/views/${encodeURIComponent(view.id)}`, { method: "PATCH", body: { config } });
        if (response.ok) onViewSaved(response.data);
        else setStatus({ tone: "error", text: `properties saved; couldn't update view: ${describeFailure(response)}` });
      } else setView((current) => ({ ...current, config }));
    }
    router.refresh();
  };
  const onViewSaved = (next: ViewDTO) => {
    setView(next);
    setViews((current) => current.map((entry) => (entry.id === next.id ? next : next.isDefault ? { ...entry, isDefault: false } : entry)));
    setPanel(null);
    router.refresh();
  };
  const renderProperty = (item: ItemDTO, property: PropertyDefinition) => (
    <EditableProperty
      property={property}
      value={propertyValue(item, property)}
      onChange={(next) => commit(item, property, next)}
      context={context}
      compact
      readOnly={!canEdit}
      disabled={savingItems.has(item.id)}
    />
  );
  const renderTitle = (item: ItemDTO) => (
    <Link href={itemHref(collection.slug, item.id)} className="collections-item-link" title={item.title}>
      <PagesIcon />
      <span>{item.title}</span>
    </Link>
  );
  const renderRow = (item: ItemDTO) => (
    <tr key={item.id} aria-busy={savingItems.has(item.id)}>
      {columns.map((property) => (
        <td
          key={property.id}
          className={clsx("collections-cell", `collections-cell-${property.type}`)}
          title={property.type === "text" || property.type === "url" ? String(propertyValue(item, property) ?? "") : undefined}
        >
          {property.type === "title" ? renderTitle(item) : renderProperty(item, property)}
        </td>
      ))}
    </tr>
  );
  const renderCard = (item: ItemDTO) => (
    <article key={item.id} className="collections-board-card" aria-busy={savingItems.has(item.id)}>
      {renderTitle(item)}
      <dl className="collections-card-properties">
        {cardProperties.map((property) => (
          <div key={property.id}>
            <dt>{property.name}</dt>
            <dd>{renderProperty(item, property)}</dd>
          </div>
        ))}
      </dl>
      {canEdit &&
        boardProperty &&
        !cardProperties.some((property) => property.id === boardProperty.id) &&
        renderProperty(item, boardProperty)}
    </article>
  );

  return (
    <div className="collections-view">
      <div className="collections-toolbar">
        <nav className="collections-view-tabs" aria-label="collection views">
          {(views.length ? views : [view]).map((entry) => (
            <Link
              key={entry.id || entry.slug}
              href={viewHref(collection.slug, entry)}
              className={clsx("collections-view-tab", entry.id === view.id && "collections-view-tab-active")}
              aria-current={entry.id === view.id ? "page" : undefined}
            >
              <NavIcon name={entry.kind === "table" ? "table" : entry.kind === "board" ? "inbox" : "pages"} />
              {entry.name}
            </Link>
          ))}
          {canEdit && (
            <Button
              className="collections-add-view"
              aria-label="add view"
              aria-expanded={panel === "new-view"}
              onClick={() => setPanel(panel === "new-view" ? null : "new-view")}
            >
              <PlusIcon />
            </Button>
          )}
        </nav>
        <div className="collections-toolbar-actions">
          {canEdit && (
            <Button aria-expanded={panel === "view"} onClick={() => setPanel(panel === "view" ? null : "view")}>
              filter{view.config.filters.length ? ` · ${view.config.filters.length}` : ""} / sort
            </Button>
          )}
          {canEdit && (
            <Button aria-expanded={panel === "properties"} onClick={() => setPanel(panel === "properties" ? null : "properties")}>
              properties
            </Button>
          )}
          {importAction}
          {canEdit && (
            <Button variant="primary" onClick={() => openNew()}>
              <PlusIcon />
              new
            </Button>
          )}
        </div>
      </div>
      <div className="collections-view-context">
        <label className="collections-search">
          <SearchIcon />
          <input
            type="search"
            aria-label={`search ${collection.name}`}
            placeholder="search items…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span className="collections-count">
          {hasMore ? `${items.length} of ${total} loaded` : `${result.items.length} of ${total} items`}
        </span>
      </div>
      {panel === "new-view" && canEdit && (
        <form
          className="collections-panel collections-new-view"
          aria-label="new view"
          onSubmit={(event) => {
            event.preventDefault();
            addView();
          }}
        >
          <Input
            autoFocus
            aria-label="view name"
            placeholder="view name"
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
          />
          <ChoicePicker
            label="view layout"
            selected={[viewKind]}
            options={VIEW_KINDS.map((id) => ({ id, label: id }))}
            onPick={(option) => {
              if (option) setViewKind(option.id as ViewKind);
            }}
            clearable={false}
          />
          <Button type="submit" variant="primary" disabled={addingView || !viewName.trim()}>
            {addingView ? "creating…" : "create view"}
          </Button>
          <Button onClick={() => setPanel(null)}>cancel</Button>
        </form>
      )}
      {panel === "properties" && canEdit && (
        <PropertiesPanel collectionId={collection.id} schema={schema} onSaved={onSchemaSaved} onClose={() => setPanel(null)} />
      )}
      {panel === "view" && canEdit && (
        <ViewSettingsPanel
          collectionId={collection.id}
          schema={schema}
          view={view}
          viewCount={views.length}
          onSaved={onViewSaved}
          onDeleted={() => {
            router.push(`/collections/${encodeURIComponent(collection.slug)}`);
            router.refresh();
          }}
          onClose={() => setPanel(null)}
        />
      )}
      {newOpen && canEdit && (
        <form
          className="collections-panel collections-create"
          aria-label="new item"
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <div className="collections-create-title">
            <PagesIcon />
            <input
              ref={newTitleRef}
              autoFocus
              className="ui-input"
              aria-label="new item title"
              placeholder="untitled"
              value={newTitle}
              disabled={creating}
              onChange={(event) => setNewTitle(event.target.value)}
            />
          </div>
          <div className="collections-create-fields">
            {cardProperties
              .filter((property) => !["created_time", "updated_time"].includes(property.type))
              .map((property) => (
                <div key={property.id} className="collections-create-field">
                  <label htmlFor={`new-property-${property.id}`}>{property.name}</label>
                  <PropertyEditor
                    id={`new-property-${property.id}`}
                    property={property}
                    value={newProperties[property.id] ?? null}
                    onChange={(value) => setNewProperties((current) => ({ ...current, [property.id]: value }))}
                    context={context}
                    disabled={creating}
                  />
                </div>
              ))}
          </div>
          <div className="collections-panel-footer">
            <Button variant="primary" type="submit" disabled={creating || !newTitle.trim()}>
              {creating ? "adding…" : "add item"}
            </Button>
            <Button onClick={() => setNewOpen(false)}>close</Button>
            <span className="ui-muted">add another without leaving this view.</span>
          </div>
        </form>
      )}
      {loadError && (
        <div className="collections-load-error" role="alert">
          <span>some items could not load. filters and counts are incomplete. {loadError}</span>
          <Button onClick={() => setLoadError("")}>retry</Button>
        </div>
      )}
      {hasMore && !loadError && (
        <p className="collections-status" role="status">
          Loading the rest of this collection…
        </p>
      )}
      {view.kind === "board" ? (
        boardProperty ? (
          <div className="collections-board" aria-label={`board by ${boardProperty.name}`}>
            {[
              ...boardProperty.options.map((option) => ({ key: option.id as string | null, label: option.label, tone: option.tone })),
              { key: null, label: `no ${boardProperty.name}`, tone: "default" },
            ].map((group) => {
              const entries = result.groups?.find((entry) => entry.key === group.key)?.items ?? [];
              return (
                <section className="collections-board-column" key={group.key ?? "none"}>
                  <header className="collections-board-heading">
                    <h2>
                      <span className={clsx("collections-status-dot", `collections-tone-${group.tone}`)} />
                      {group.label}
                    </h2>
                    <span className="collections-count">{entries.length}</span>
                  </header>
                  {entries.map(renderCard)}
                  {canEdit && (
                    <Button className="collections-board-new" onClick={() => openNew({ [boardProperty.id]: group.key })}>
                      <PlusIcon />
                      new item
                    </Button>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="choose a status property"
            description="a board groups items by a select property. add one in properties to get started."
          />
        )
      ) : view.kind === "calendar" ? (
        dateProperty ? (
          <CollectionCalendar
            items={result.items}
            property={dateProperty}
            slug={collection.slug}
            canEdit={canEdit}
            onNew={(day) => openNew({ [dateProperty.id]: day })}
          />
        ) : (
          <EmptyState title="choose a date property" description="add a date property to plan items on a calendar." />
        )
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={<NavIcon name="table" />}
          title={items.length ? "no matching items" : "your collection starts here"}
          description={
            items.length
              ? "try another search or adjust this view's filters."
              : "add your first item to organize deadlines, notes, and work in one place."
          }
          actions={
            canEdit && (
              <Button onClick={() => (items.length && query ? setQuery("") : openNew())}>
                {items.length && query ? "clear search" : "new item"}
              </Button>
            )
          }
        />
      ) : view.kind === "list" ? (
        <div className="collections-list">
          {(result.groups ?? [{ key: null, label: "", items: result.items }]).map((group) => (
            <section key={group.key ?? "all"}>
              {group.label && (
                <h2 className="collections-list-heading">
                  {group.label}
                  <span className="collections-count">{group.items.length}</span>
                </h2>
              )}
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    {renderTitle(item)}
                    <dl className="collections-list-properties">
                      {cardProperties.map((property) => (
                        <div key={property.id}>
                          <dt className="ui-sr-only">{property.name}</dt>
                          <dd>{renderProperty(item, property)}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="collections-table-region">
          <DataTable
            className="collections-table"
            aria-label={`${collection.name} table`}
            style={{ minWidth: `${columns.reduce((width, property) => width + COLUMN_WIDTHS[property.type], 0)}rem` }}
          >
            <colgroup>
              {columns.map((property) => (
                <col key={property.id} style={property.type === "title" ? undefined : { width: `${COLUMN_WIDTHS[property.type]}rem` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((property) => (
                  <th key={property.id} scope="col" className={clsx(property.type === "title" && "collections-title-header")}>
                    <span className="collections-property-heading" title={`${property.name} · ${property.type.replaceAll("_", " ")}`}>
                      <NavIcon name={PROPERTY_ICONS[property.type] ?? "table"} />
                      <span>{property.name}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.groups
                ? result.groups.map((group) => (
                    <GroupRows key={group.key ?? "none"} label={group.label} count={group.items.length} columnCount={columns.length}>
                      {group.items.map(renderRow)}
                    </GroupRows>
                  ))
                : result.items.map(renderRow)}
            </tbody>
          </DataTable>
        </div>
      )}
      {canEdit && view.kind !== "board" && (
        <Button className="collections-add-item" onClick={() => openNew()}>
          <PlusIcon />
          new item
        </Button>
      )}
      <div className="collections-status-row">
        <p className={clsx("collections-status", status?.tone === "error" && "collections-status-error")} aria-live="polite">
          {status?.text ?? (canEdit ? "click a property to edit · open an item for its full details" : "open an item for its full details")}
        </p>
      </div>
    </div>
  );
}

function GroupRows({ label, count, columnCount, children }: { label: string; count: number; columnCount: number; children: ReactNode }) {
  return (
    <>
      <tr className="collections-group-row">
        <td colSpan={columnCount}>
          {label} <span className="collections-count">{count}</span>
        </td>
      </tr>
      {children}
    </>
  );
}
