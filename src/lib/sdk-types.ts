export const SDK_TYPES_SCHEMA_VERSION = "1.0.0";

export const sdkMetadataContract = {
  schemaVersion: SDK_TYPES_SCHEMA_VERSION,
  resources: {
    articles: { path: "/api/v1/articles", response: "{ articles, pagination }" },
    categories: { path: "/api/v1/categories", response: "{ categories }" },
    tags: { path: "/api/v1/tags", response: "{ tags }" },
    search: { path: "/api/v1/search", response: "{ results, query }" },
  },
  examples: {
    curl: "curl \"$ARKIVEL_URL/api/v1/articles?limit=10\"",
    browser: "fetch('/api/v1/search?q=architecture')",
  },
};
