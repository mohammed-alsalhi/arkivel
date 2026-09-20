export const PUBLIC_API_V1_SCHEMA_VERSION = "1.0.0";
export const PUBLIC_API_V1_EXAMPLE_BASE_URL = "https://your-arkivel.example";

export type ApiV1Endpoint = {
  id: string;
  surface: "articles" | "categories" | "tags" | "search";
  method: "GET";
  path: string;
  auth: "public";
  pagination: "page" | "none";
  filtering?: string[];
  responseEnvelope: string;
};

export const apiV1Endpoints: ApiV1Endpoint[] = [
  {
    id: "v1.articles.list",
    surface: "articles",
    method: "GET",
    path: "/api/v1/articles",
    auth: "public",
    pagination: "page",
    filtering: ["category", "tag"],
    responseEnvelope: "{ articles, pagination }",
  },
  {
    id: "v1.categories.list",
    surface: "categories",
    method: "GET",
    path: "/api/v1/categories",
    auth: "public",
    pagination: "none",
    responseEnvelope: "{ categories }",
  },
  {
    id: "v1.tags.list",
    surface: "tags",
    method: "GET",
    path: "/api/v1/tags",
    auth: "public",
    pagination: "none",
    responseEnvelope: "{ tags }",
  },
  {
    id: "v1.search.query",
    surface: "search",
    method: "GET",
    path: "/api/v1/search",
    auth: "public",
    pagination: "none",
    filtering: ["q", "limit"],
    responseEnvelope: "{ results, query }",
  },
];

export const apiV1ErrorContract = {
  shape: "{ error: string, code?: string }",
  statuses: {
    400: "Invalid request parameters.",
    500: "Unexpected server error.",
  },
};

export const apiV1PaginationContract = {
  page: { params: ["page", "limit"], response: ["page", "limit", "total", "totalPages"], maxLimit: 100 },
};

export const apiV1Headers = {
  "X-Arkivel-API-Version": "v1",
  "X-Arkivel-API-Schema": PUBLIC_API_V1_SCHEMA_VERSION,
};

export const apiV1FixtureResponses = {
  articles: {
    articles: [{
      title: "Example Article",
      slug: "example-article",
      excerpt: "A stable v1 fixture article.",
      content: "<p>A stable v1 fixture article.</p>",
      contentRaw: "A stable v1 fixture article.",
      published: true,
      status: "published",
      coverImage: null,
      infobox: null,
      category: { name: "Examples", slug: "examples" },
      tags: [{ name: "API", slug: "api" }],
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  },
  categories: {
    categories: [{
      name: "Examples",
      slug: "examples",
      description: "Example pages.",
      sortOrder: 0,
      parent: null,
      articleCount: 1,
      childCount: 0,
    }],
  },
  tags: {
    tags: [{
      name: "API",
      slug: "api",
      color: null,
      parent: null,
      articleCount: 1,
      childCount: 0,
    }],
  },
  search: {
    results: [{
      title: "Example Article",
      slug: "example-article",
      excerpt: "A stable v1 fixture article.",
      category: { name: "Examples", slug: "examples" },
      updatedAt: "2026-08-30T00:00:00.000Z",
    }],
    query: "example",
  },
};

export const publicApiV1Contract = {
  schemaVersion: PUBLIC_API_V1_SCHEMA_VERSION,
  basePath: "/api/v1",
  auth: { mode: "public-read" },
  endpoints: apiV1Endpoints,
  errors: apiV1ErrorContract,
  pagination: apiV1PaginationContract,
  fixtures: apiV1FixtureResponses,
  openApiPath: "/api/v1/openapi.json",
};

export function createApiV1Error(error: string, status: number, code?: string) {
  return {
    body: { error, code: code ?? `api_v1_${status}` },
    status,
    headers: apiV1Headers,
  };
}

export function parseApiV1Integer(value: string | null, fallback: number, maximum: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

function queryParameter(name: string) {
  return {
    name,
    in: "query" as const,
    required: false,
    schema: name === "page"
      ? { type: "integer", minimum: 1, default: 1 }
      : name === "limit"
        ? { type: "integer", minimum: 1, maximum: 100, default: 20 }
        : { type: "string" },
  };
}

export function createPublicApiV1OpenApiSpec(baseUrl = "http://localhost:3000") {
  const paths = Object.fromEntries(apiV1Endpoints.map((endpoint) => {
    const path = endpoint.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const pathParameters = Array.from(path.matchAll(/\{([A-Za-z0-9_]+)\}/g), ([, name]) => ({
      name,
      in: "path" as const,
      required: true,
      schema: { type: "string" },
    }));
    const queryNames = [
      ...(endpoint.pagination === "page" ? apiV1PaginationContract.page.params : []),
      ...(endpoint.filtering ?? []),
    ];
    return [path, {
      get: {
        operationId: endpoint.id.replace(/\./g, "_"),
        tags: [endpoint.surface],
        summary: endpoint.responseEnvelope,
        security: [],
        "x-arkivel-auth": endpoint.auth,
        parameters: [...pathParameters, ...Array.from(new Set(queryNames)).map(queryParameter)],
        responses: {
          200: { description: endpoint.responseEnvelope },
          ...((endpoint.pagination === "page" || endpoint.filtering?.includes("limit"))
            ? { 400: { description: apiV1ErrorContract.statuses[400] } }
            : {}),
        },
      },
    }];
  }));

  return {
    openapi: "3.1.0",
    info: {
      title: "Arkivel Public API v1",
      version: PUBLIC_API_V1_SCHEMA_VERSION,
      description: "The focused Arkivel read API generated from the live contract.",
    },
    servers: [{ url: baseUrl }],
    paths,
  };
}
