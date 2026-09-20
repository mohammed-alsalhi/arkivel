"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { ViewDTO } from "@/modules/collections/model";
import { VIEW_KINDS, type Filter, type PropertySchema, type ViewConfig, type ViewKind } from "@/modules/collections/properties";
import { api, describeFailure } from "./api";
import { ChoicePicker } from "./ChoicePicker";

type Props = {
  collectionId: string;
  schema: PropertySchema;
  view: ViewDTO;
  viewCount: number;
  onSaved: (view: ViewDTO) => void;
  onDeleted: () => void;
  onClose: () => void;
};

/** A flat section for a view's name, visible columns, sort, group, and default flag. */
export function ViewSettingsPanel({ collectionId, schema, view, viewCount, onSaved, onDeleted, onClose }: Props) {
  const [name, setName] = useState(view.name);
  const [kind, setKind] = useState(view.kind);
  const [config, setConfig] = useState<ViewConfig>(view.config);
  const [isDefault, setIsDefault] = useState(view.isDefault);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const sort = config.sorts[0];
  const groupable = schema.filter((property) =>
    kind === "calendar"
      ? property.type === "date"
      : kind === "board"
        ? property.type === "select"
        : property.type === "select" || property.type === "person" || property.type === "checkbox",
  );
  const persisted = Boolean(view.id);

  const toggleVisible = (id: string, visible: boolean) =>
    setConfig((current) => ({
      ...current,
      visible: visible
        ? schema.map((property) => property.id).filter((entry) => entry === id || current.visible.includes(entry))
        : current.visible.filter((entry) => entry !== id),
    }));

  const save = async () => {
    setSaving(true);
    setError("");
    const result = await api<ViewDTO>(`/api/collections/${encodeURIComponent(collectionId)}/views/${encodeURIComponent(view.id)}`, {
      method: "PATCH",
      body: { name, kind, config, ...(isDefault && !view.isDefault ? { isDefault: true } : {}) },
    });
    setSaving(false);
    if (!result.ok) {
      setError(describeFailure(result));
      return;
    }
    onSaved(result.data);
  };

  const remove = async () => {
    setSaving(true);
    const result = await api(`/api/collections/${encodeURIComponent(collectionId)}/views/${encodeURIComponent(view.id)}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (!result.ok) {
      setError(describeFailure(result));
      setConfirmDelete(false);
      return;
    }
    onDeleted();
  };

  return (
    <section className="collections-panel" aria-label="view settings">
      <div className="collections-panel-header">
        <h2 className="ui-section-title">view settings</h2>
        <div className="ui-section-actions">
          <Button onClick={onClose}>cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || !persisted}>
            {saving ? "saving…" : "save"}
          </Button>
        </div>
      </div>

      {!persisted && <p className="ui-muted">this collection has no stored view yet; add one from the tab strip to change its settings.</p>}

      <div className="collections-panel-grid">
        <label className="ui-label" htmlFor="collections-view-name">
          name
        </label>
        <Input id="collections-view-name" value={name} onChange={(event) => setName(event.target.value)} />

        <label className="ui-label" htmlFor="collections-view-kind">
          layout
        </label>
        <ChoicePicker
          id="collections-view-kind"
          label="layout"
          options={VIEW_KINDS.map((entry) => ({ id: entry, label: entry }))}
          selected={[kind]}
          clearable={false}
          onPick={(option) => {
            if (!option || option.id === kind) return;
            const next = option.id as ViewKind;
            setKind(next);
            const group = schema.find((property) => property.type === (next === "calendar" ? "date" : "select"));
            setConfig((current) => ({ ...current, groupBy: next === "calendar" || next === "board" ? group?.id : undefined }));
          }}
        />

        <span className="ui-label">columns</span>
        <ul className="collections-panel-checks">
          {schema.map((property) => (
            <li key={property.id}>
              <label>
                <input
                  type="checkbox"
                  checked={config.visible.includes(property.id)}
                  disabled={property.type === "title"}
                  onChange={(event) => toggleVisible(property.id, event.target.checked)}
                />{" "}
                {property.name}
              </label>
            </li>
          ))}
        </ul>

        <label className="ui-label" htmlFor="collections-view-sort">
          sort
        </label>
        <div className="collections-panel-inline">
          <ChoicePicker
            id="collections-view-sort"
            label="sort"
            options={[{ id: "", label: "none" }, ...schema.map((property) => ({ id: property.id, label: property.name }))]}
            selected={[sort?.property ?? ""]}
            clearable={false}
            onPick={(option) => {
              if (!option || option.id === (sort?.property ?? "")) return;
              setConfig((current) => ({
                ...current,
                sorts: option.id ? [{ property: option.id, direction: sort?.direction ?? "asc" }] : [],
              }));
            }}
          />
          <ChoicePicker
            label="sort direction"
            options={[{ id: "asc", label: "ascending" }, { id: "desc", label: "descending" }]}
            selected={[sort?.direction ?? "asc"]}
            clearable={false}
            disabled={!sort}
            onPick={(option) => {
              if (!option || option.id === sort?.direction) return;
              setConfig((current) => ({
                ...current,
                sorts: sort ? [{ property: sort.property, direction: option.id as "asc" | "desc" }] : [],
              }));
            }}
          />
        </div>

        <label className="ui-label" htmlFor="collections-view-group">
          {kind === "calendar" ? "date property" : "group by"}
        </label>
        <ChoicePicker
          id="collections-view-group"
          label={kind === "calendar" ? "date property" : "group by"}
          options={[{ id: "", label: "none" }, ...groupable.map((property) => ({ id: property.id, label: property.name }))]}
          selected={[config.groupBy ?? ""]}
          clearable={false}
          onPick={(option) =>
            setConfig((current) => {
              const next = { ...current };
              if (option?.id) next.groupBy = option.id;
              else delete next.groupBy;
              return next;
            })
          }
        />

        <span className="ui-label">default</span>
        <label>
          <input type="checkbox" checked={isDefault} disabled={view.isDefault} onChange={(event) => setIsDefault(event.target.checked)} />{" "}
          open this view first
        </label>
      </div>

      <div className="collections-view-filters">
        <div className="collections-panel-header">
          <h3>
            Filters <span className="ui-muted">match all conditions</span>
          </h3>
          <Button
            onClick={() =>
              setConfig((current) => ({ ...current, filters: [...current.filters, { property: schema[0].id, op: "not_empty" }] }))
            }
          >
            add filter
          </Button>
        </div>
        {config.filters.length === 0 && <p className="ui-muted">all items are included in this view.</p>}
        {config.filters.map((filter, index) => {
          const property = schema.find((entry) => entry.id === filter.property);
          const filterValue = String(filter.value ?? "");
          const update = (patch: Partial<Filter>) =>
            setConfig((current) => ({
              ...current,
              filters: current.filters.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)),
            }));
          return (
            <div className="collections-filter-row" key={index}>
              <ChoicePicker
                label={`filter ${index + 1} property`}
                options={schema.map((entry) => ({ id: entry.id, label: entry.name }))}
                selected={[filter.property]}
                clearable={false}
                onPick={(option) => { if (option && option.id !== filter.property) update({ property: option.id, value: undefined, op: "not_empty" }); }}
              />
              <ChoicePicker
                label={`filter ${index + 1} condition`}
                options={[
                  ["eq", "is"],
                  ["neq", "is not"],
                  ["contains", "contains"],
                  ["empty", "is empty"],
                  ["not_empty", "is not empty"],
                  ["gt", "is after / greater than"],
                  ["lt", "is before / less than"],
                ].map(([id, label]) => ({ id, label }))}
                selected={[filter.op]}
                clearable={false}
                onPick={(option) => { if (option) update({ op: option.id as Filter["op"] }); }}
              />
              {!["empty", "not_empty"].includes(filter.op) &&
                (property?.type === "select" || (property?.type === "multi_select" && ["eq", "neq"].includes(filter.op)) ? (
                  <ChoicePicker
                    label={`filter ${index + 1} value`}
                    options={[
                      { id: "", label: "choose value" },
                      ...property.options,
                      ...(filterValue && !property.options.some((option) => option.id === filterValue)
                        ? [{ id: filterValue, label: filterValue }]
                        : []),
                    ]}
                    selected={[filterValue]}
                    clearable={false}
                    onPick={(option) => { if (option && option.id !== filterValue) update({ value: option.id }); }}
                  />
                ) : property?.type === "checkbox" ? (
                  <ChoicePicker
                    label={`filter ${index + 1} value`}
                    options={[{ id: "", label: "choose value" }, { id: "true", label: "checked" }, { id: "false", label: "unchecked" }]}
                    selected={[filterValue]}
                    clearable={false}
                    onPick={(option) => { if (option && option.id !== filterValue) update({ value: option.id === "true" }); }}
                  />
                ) : (
                  <Input
                    aria-label={`filter ${index + 1} value`}
                    type={property?.type === "number" ? "number" : property?.type === "date" ? "date" : "text"}
                    value={filterValue}
                    onChange={(event) =>
                      update({
                        value:
                          property?.type === "number"
                            ? event.target.value === ""
                              ? null
                              : Number(event.target.value)
                            : event.target.value,
                      })
                    }
                  />
                ))}
              <Button
                aria-label={`remove filter ${index + 1}`}
                onClick={() =>
                  setConfig((current) => ({ ...current, filters: current.filters.filter((_, position) => position !== index) }))
                }
              >
                remove
              </Button>
            </div>
          );
        })}
      </div>

      {persisted && viewCount > 1 && (
        <div className="collections-panel-footer">
          {confirmDelete ? (
            <>
              <span className="ui-muted">delete this view?</span>
              <Button variant="danger" onClick={remove} disabled={saving}>
                delete view
              </Button>
              <Button onClick={() => setConfirmDelete(false)}>cancel</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              delete view
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
