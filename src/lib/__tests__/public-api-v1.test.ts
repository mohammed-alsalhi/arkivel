import { describe, expect, it } from "vitest";
import {
  apiV1Endpoints,
  apiV1FixtureResponses,
  apiV1Headers,
  createApiV1Error,
  createPublicApiV1OpenApiSpec,
  parseApiV1Integer,
  publicApiV1Contract,
} from "../public-api-v1";

describe("public api v1 contract", () => {
  it("publishes only focused-core surfaces", () => {
    expect(apiV1Endpoints.map((endpoint) => endpoint.surface)).toEqual([
      "articles",
      "categories",
      "tags",
      "search",
    ]);
    expect(publicApiV1Contract.openApiPath).toBe("/api/v1/openapi.json");
  });

  it("standardizes headers, errors, and fixtures", () => {
    expect(apiV1Headers["X-Arkivel-API-Version"]).toBe("v1");
    expect(createApiV1Error("Nope", 400).body.code).toBe("api_v1_400");
    expect(apiV1FixtureResponses.articles.pagination.totalPages).toBe(1);
    expect(apiV1FixtureResponses.categories.categories[0].articleCount).toBe(1);
    expect(publicApiV1Contract.errors.shape).toContain("error");
    expect(parseApiV1Integer("10", 1, 100)).toBe(10);
    expect(parseApiV1Integer("nope", 1, 100)).toBeNull();
  });

  it("generates the OpenAPI document rendered by the reference page", () => {
    const spec = createPublicApiV1OpenApiSpec("https://example.test");
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers[0].url).toBe("https://example.test");
    expect(spec.paths["/api/v1/articles"].get.operationId).toBe("v1_articles_list");
    expect(spec.paths["/api/v1/articles"].get.security).toEqual([]);
    expect(spec.paths["/api/v1/search"].get.parameters.map((parameter) => parameter.name)).toEqual(["q", "limit"]);
    expect(Object.keys(spec.paths)).toHaveLength(apiV1Endpoints.length);
    expect(Object.keys(spec.paths).every((path) => !path.includes("#"))).toBe(true);
  });
});
