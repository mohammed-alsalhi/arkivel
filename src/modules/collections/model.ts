/**
 * Serialized shapes shared between the server queries, the API, and the client components.
 * Dates are ISO strings so the same types work on both sides of the wire.
 */
import type { PropertySchema, PropertyValues, ViewConfig, ViewKind } from "./properties";

export type ViewDTO = {
  id: string;
  slug: string;
  name: string;
  kind: ViewKind;
  config: ViewConfig;
  isDefault: boolean;
  sortOrder: number;
};

export type CollectionSummary = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  category: { id: string; name: string; slug: string } | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CollectionDTO = Omit<CollectionSummary, "itemCount"> & {
  schema: PropertySchema;
  views: ViewDTO[];
};

export type ItemDTO = {
  id: string;
  collectionId: string;
  articleId: string | null;
  article: { id: string; slug: string; title: string } | null;
  title: string;
  properties: PropertyValues;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ItemPage = {
  items: ItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/** A user as offered by the `person` editor. */
export type PersonOption = { id: string; label: string };

/** A lightweight article reference as offered by the `page` editor. */
export type PageOption = { id: string; slug: string; title: string };

/** Error payload every collections route returns for a 400. */
export type FieldErrors = { error: string; fields?: Record<string, string> };
