"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { CollectionSummary } from "@/modules/collections/model";
import {
  PROPERTY_TONES,
  PROPERTY_TYPES,
  propertyIdFromName,
  type PropertyDefinition,
  type PropertySchema,
  type PropertyTone,
  type PropertyType,
  type SelectOption,
} from "@/modules/collections/properties";
import { api, describeFailure } from "./api";
import { ChoicePicker } from "./ChoicePicker";

type Props = {
  collectionId: string;
  schema: PropertySchema;
  onSaved: (schema: PropertySchema) => void;
  onClose: () => void;
};

const ADDABLE_TYPES = PROPERTY_TYPES.filter((type) => type !== "title");

const TYPE_LABELS: Record<PropertyType, string> = {
  title: "title",
  text: "text",
  number: "number",
  select: "select",
  multi_select: "multi-select",
  date: "date",
  checkbox: "checkbox",
  url: "url",
  person: "person",
  page: "page",
  relation: "relation",
  created_time: "created time",
  updated_time: "updated time",
};

function withOptions(property: PropertyDefinition, options: SelectOption[]): PropertyDefinition {
  if (property.type === "select" || property.type === "multi_select") return { ...property, options };
  return property;
}

/** A flat section for adding, renaming, and removing properties, and for editing select options. */
export function PropertiesPanel({ collectionId, schema, onSaved, onClose }: Props) {
  const [draft, setDraft] = useState<PropertySchema>(schema);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PropertyType>("text");
  const [newTarget, setNewTarget] = useState("");
  const [targets, setTargets] = useState<CollectionSummary[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (id: string, patch: (property: PropertyDefinition) => PropertyDefinition) =>
    setDraft((current) => current.map((property) => (property.id === id ? patch(property) : property)));

  const loadTargets = async () => {
    if (targets) return;
    const result = await api<{ collections: CollectionSummary[] }>("/api/collections");
    setTargets(result.ok ? result.data.collections : []);
  };

  const addProperty = () => {
    const name = newName.trim();
    if (!name) return;
    if (newType === "relation" && !newTarget) {
      setError("pick a collection for the relation");
      return;
    }
    const id = propertyIdFromName(name, draft.map((property) => property.id));
    const base = { id, name };
    const property: PropertyDefinition =
      newType === "select" || newType === "multi_select"
        ? { ...base, type: newType, options: [] }
        : newType === "relation"
          ? { ...base, type: "relation", collectionId: newTarget }
          : { ...base, type: newType as Exclude<PropertyType, "select" | "multi_select" | "relation"> };
    setDraft((current) => [...current, property]);
    setNewName("");
    setError("");
  };

  const addOption = (property: Extract<PropertyDefinition, { type: "select" | "multi_select" }>) => {
    const label = `option ${property.options.length + 1}`;
    const id = propertyIdFromName(label, property.options.map((option) => option.id));
    update(property.id, (current) => withOptions(current, [...property.options, { id, label, tone: "default" }]));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const result = await api<{ schema: PropertySchema }>(`/api/collections/${encodeURIComponent(collectionId)}`, {
      method: "PATCH",
      body: { schema: draft },
    });
    setSaving(false);
    if (!result.ok) {
      setError(describeFailure(result));
      return;
    }
    onSaved(result.data.schema);
  };

  return (
    <section className="collections-panel" aria-label="properties">
      <div className="collections-panel-header">
        <h2 className="ui-section-title">properties</h2>
        <div className="ui-section-actions">
          <Button onClick={onClose}>cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "saving…" : "save"}
          </Button>
        </div>
      </div>

      <ul className="collections-panel-list">
        {draft.map((property) => (
          <li key={property.id} className="collections-panel-row">
            <div className="collections-panel-main">
              <Input
                aria-label={`${property.name} name`}
                value={property.name}
                onChange={(event) => update(property.id, (current) => ({ ...current, name: event.target.value }))}
                className="collections-panel-name"
              />
              <span className="ui-muted collections-panel-type">{TYPE_LABELS[property.type]}</span>
              {property.type !== "title" && (
                <Button
                  variant="danger"
                  aria-label={`remove ${property.name}`}
                  onClick={() => setDraft((current) => current.filter((entry) => entry.id !== property.id))}
                >
                  remove
                </Button>
              )}
            </div>
            {(property.type === "select" || property.type === "multi_select") && (
              <ul className="collections-panel-options">
                {property.options.map((option) => (
                  <li key={option.id} className="collections-panel-option">
                    <Input
                      aria-label={`${option.label} label`}
                      value={option.label}
                      onChange={(event) =>
                        update(property.id, (current) =>
                          withOptions(
                            current,
                            property.options.map((entry) => (entry.id === option.id ? { ...entry, label: event.target.value } : entry)),
                          ),
                        )
                      }
                    />
                    <ChoicePicker
                      label={`${option.label} tone`}
                      options={PROPERTY_TONES.map((tone) => ({ id: tone, label: tone, tone }))}
                      selected={[option.tone]}
                      clearable={false}
                      onPick={(picked) => {
                        if (!picked) return;
                        update(property.id, (current) =>
                          withOptions(
                            current,
                            property.options.map((entry) =>
                              entry.id === option.id ? { ...entry, tone: picked.id as PropertyTone } : entry,
                            ),
                          )
                        );
                      }}
                    />
                    <Button
                      aria-label={`remove option ${option.label}`}
                      onClick={() =>
                        update(property.id, (current) =>
                          withOptions(current, property.options.filter((entry) => entry.id !== option.id)),
                        )
                      }
                    >
                      remove
                    </Button>
                  </li>
                ))}
                <li>
                  <Button onClick={() => addOption(property)}>add option</Button>
                </li>
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="collections-panel-add">
        <Input
          aria-label="new property name"
          placeholder="new property…"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addProperty();
            }
          }}
          className="collections-panel-name"
        />
        <ChoicePicker
          label="new property type"
          options={ADDABLE_TYPES.map((type) => ({ id: type, label: TYPE_LABELS[type] }))}
          selected={[newType]}
          clearable={false}
          onPick={(option) => {
            if (!option || option.id === newType) return;
            const type = option.id as PropertyType;
            setNewType(type);
            if (type === "relation") loadTargets();
          }}
          className="collections-panel-type-select"
        />
        {newType === "relation" && (
          <ChoicePicker
            label="relation target"
            options={[{ id: "", label: targets === null ? "loading…" : "collection…" }, ...(targets ?? []).map((target) => ({ id: target.id, label: target.name }))]}
            selected={[newTarget]}
            clearable={false}
            onPick={(option) => { if (option) setNewTarget(option.id); }}
            className="collections-panel-type-select"
          />
        )}
        <Button onClick={addProperty} disabled={!newName.trim()}>
          add
        </Button>
      </div>

      {error && <p className="ui-field-error">{error}</p>}
    </section>
  );
}
