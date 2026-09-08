import { describe, expect, it } from "vitest";
import { buildInventory } from "../../../scripts/api-inventory.mjs";
import inventory from "../api-inventory.json";

describe("api inventory", () => {
  it("matches the route handlers on disk (run `npm run api:inventory` when this fails)", () => {
    expect(inventory).toEqual(buildInventory());
  });

  it("covers the token and v1 routes", () => {
    const routes = new Map(inventory.map((entry) => [entry.route, entry.methods.map((m) => m.method)]));
    expect(routes.get("/api/tokens")).toEqual(["GET", "POST"]);
    expect(routes.get("/api/tokens/{id}")).toEqual(["DELETE"]);
    expect(routes.get("/api/v1/articles")).toEqual(["GET"]);
  });
});
