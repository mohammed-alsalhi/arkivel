import { describe, expect, it } from "vitest";
import { SDK_TYPES_SCHEMA_VERSION, sdkMetadataContract } from "../sdk-types";

describe("sdk types contract", () => {
  it("publishes the real public resource catalog", () => {
    expect(sdkMetadataContract.schemaVersion).toBe(SDK_TYPES_SCHEMA_VERSION);
    expect(Object.values(sdkMetadataContract.resources).map((resource) => resource.path)).toEqual([
      "/api/v1/articles",
      "/api/v1/categories",
      "/api/v1/tags",
      "/api/v1/search",
    ]);
  });

  it("publishes curl and browser examples for the compact API", () => {
    expect(sdkMetadataContract.examples.curl).toContain("/api/v1/articles");
    expect(sdkMetadataContract.examples.browser).toContain("/api/v1/search");
  });
});
