import type { ModuleDefinition } from "../types";

const api: ModuleDefinition = {
  id: "api",
  name: "api",
  description: "the public read-only v1 api, personal access tokens for the full api, and the generated reference, contract, openapi document, and sdk metadata.",
  routes: ["/api/v1", "/api-docs"],
  nav: [],
  commands: [
    { label: "api reference", href: "/api-docs", keywords: ["api", "openapi", "docs", "reference"] },
    { label: "api tokens", href: "/settings/tokens", keywords: ["api", "token", "access", "bearer", "script"], requires: "member" },
  ],
  docs: {
    help: "read the generated [api reference](/api-docs) for the public v1 endpoints and the full route surface. create a personal access token under [api tokens](/settings/tokens) to use every route from a script or another app as yourself.",
    features: [
      "api v1 — read published articles, categories, tags, and search results. the generated [api reference](/api-docs), [contract](/api/v1/contract), and [openapi document](/api/v1/openapi.json) describe the live surface.",
      "api tokens — personal access tokens (`Authorization: Bearer ark_…`) let scripts and other apps use every `/api` route with your role; create and revoke them under [api tokens](/settings/tokens). `ARKIVEL_API_CORS_ORIGINS` opens the api to browser apps on other origins.",
    ],
  },
  defaultEnabled: true,
};

export default api;
