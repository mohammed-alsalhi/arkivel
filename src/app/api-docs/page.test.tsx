import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    systemSetting: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

import ApiDocsPage from "./page";
import { createPublicApiV1OpenApiSpec } from "@/lib/public-api-v1";

describe("API reference page", () => {
  it("renders every operation from the shared OpenAPI document", async () => {
    const html = renderToStaticMarkup(await ApiDocsPage());
    const spec = createPublicApiV1OpenApiSpec();

    expect(html).toContain(spec.info.version);
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      expect(html).toContain(path);
      for (const operation of Object.values(pathItem)) {
        expect(html).toContain(`id="operation-${operation.operationId}"`);
      }
    }
  });
});
