"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui";
import type { CollectionDTO, ItemDTO, PersonOption } from "@/modules/collections/model";
import { propertyValue, type PropertyDefinition, type PropertyValue, type PropertyValues } from "@/modules/collections/properties";
import { api, describeFailure } from "./api";
import { PropertyEditor } from "./PropertyEditor";
import { rememberLabel } from "./labels";

type Props = {
  collection: CollectionDTO;
  item: ItemDTO;
  users: PersonOption[];
  canEdit: boolean;
};

const LINKED_PAGE: PropertyDefinition = { id: "__article", name: "linked page", type: "page" };

/** Save only changed fields so a stale form cannot overwrite newer imported metadata. */
export function ItemForm({ collection, item: initial, users, canEdit }: Props) {
  const router = useRouter();
  const [item, setItem] = useState<ItemDTO>(initial);
  const [title, setTitle] = useState(initial.title);
  const [properties, setProperties] = useState<PropertyValues>(initial.properties);
  const [articleId, setArticleId] = useState<string | null>(initial.articleId);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<{ tone: "muted" | "error"; text: string } | null>(null);

  if (initial.article) rememberLabel("page", initial.article.id, initial.article.title);

  const context = { users, collectionId: collection.id };
  const dirty = title !== item.title || articleId !== item.articleId || JSON.stringify(properties) !== JSON.stringify(item.properties);

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    setStatus({ tone: "muted", text: "saving…" });
    const changedProperties = Object.fromEntries(
      Object.entries(properties).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(item.properties[key])),
    );
    const response = await api<ItemDTO>(`/api/collections/${encodeURIComponent(collection.id)}/items/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: {
        ...(title !== item.title ? { title } : {}),
        ...(articleId !== item.articleId ? { articleId } : {}),
        ...(Object.keys(changedProperties).length ? { properties: changedProperties } : {}),
      },
    });
    setSaving(false);
    if (!response.ok) {
      setStatus({ tone: "error", text: describeFailure(response) });
      return;
    }
    setItem(response.data);
    setTitle(response.data.title);
    setProperties(response.data.properties);
    setArticleId(response.data.articleId);
    setStatus({ tone: "muted", text: "saved" });
    router.refresh();
  };

  const remove = async () => {
    setSaving(true);
    const response = await api(`/api/collections/${encodeURIComponent(collection.id)}/items/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setSaving(false);
      setConfirmDelete(false);
      setStatus({ tone: "error", text: describeFailure(response) });
      return;
    }
    router.push(`/collections/${encodeURIComponent(collection.slug)}`);
  };

  const valueFor = (property: PropertyDefinition): PropertyValue =>
    property.type === "title"
      ? title
      : property.type === "created_time" || property.type === "updated_time"
        ? propertyValue(item, property)
        : (properties[property.id] ?? null);

  const change = (property: PropertyDefinition, value: PropertyValue) => {
    if (property.type === "title") setTitle(typeof value === "string" ? value : title);
    else setProperties((current) => ({ ...current, [property.id]: value }));
  };

  return (
    <div className="collections-form">
      {item.article && (
        <p className="collections-form-note">
          this item is the page <Link href={`/articles/${encodeURIComponent(item.article.slug)}`}>{item.article.title}</Link>.
        </p>
      )}

      <dl className="collections-form-rows">
        {collection.schema.map((property) => (
          <div key={property.id} className="collections-form-row">
            <dt>
              <label className="ui-label" htmlFor={`prop-${property.id}`}>
                {property.name}
              </label>
            </dt>
            <dd>
              <PropertyEditor
                id={`prop-${property.id}`}
                property={property}
                value={valueFor(property)}
                onChange={(value) => change(property, value)}
                context={context}
                readOnly={!canEdit}
                disabled={saving}
              />
            </dd>
          </div>
        ))}
        <div className="collections-form-row">
          <dt>
            <label className="ui-label" htmlFor="prop-__article">
              {LINKED_PAGE.name}
            </label>
          </dt>
          <dd>
            {canEdit ? (
              <PropertyEditor
                id="prop-__article"
                property={LINKED_PAGE}
                value={articleId}
                onChange={(value) => setArticleId(typeof value === "string" ? value : null)}
                context={context}
                disabled={saving}
              />
            ) : item.article ? (
              <Link href={`/articles/${encodeURIComponent(item.article.slug)}`}>{item.article.title}</Link>
            ) : (
              <span className="ui-muted">—</span>
            )}
          </dd>
        </div>
      </dl>

      {canEdit && (
        <div className="collections-form-actions">
          <Button variant="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "saving…" : "save"}
          </Button>
          {dirty && (
            <Button
              disabled={saving}
              onClick={() => {
                setTitle(item.title);
                setProperties(item.properties);
                setArticleId(item.articleId);
                setStatus(null);
              }}
            >
              discard changes
            </Button>
          )}
          {confirmDelete ? (
            <>
              <span className="ui-muted">delete this item?</span>
              <Button variant="danger" onClick={remove} disabled={saving}>
                delete item
              </Button>
              <Button onClick={() => setConfirmDelete(false)}>cancel</Button>
            </>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              delete
            </Button>
          )}
          <span aria-live="polite" className={clsx("collections-status", status?.tone === "error" && "collections-status-error")}>
            {status?.text ?? (dirty ? "unsaved changes" : "all changes saved")}
          </span>
        </div>
      )}
    </div>
  );
}
