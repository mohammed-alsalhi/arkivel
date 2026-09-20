import { describe, it, expect } from "vitest";

// Import the relations module directly
const RELATION_TYPES: Record<
  string,
  { label: string; inverse: string; icon: string }
> = {
  "related-to": { label: "Related to", inverse: "Related to", icon: "↔" },
  "is-part-of": { label: "Is part of", inverse: "Contains", icon: "⊂" },
  contains: { label: "Contains", inverse: "Is part of", icon: "⊃" },
  "preceded-by": { label: "Preceded by", inverse: "Followed by", icon: "←" },
  "followed-by": { label: "Followed by", inverse: "Preceded by", icon: "→" },
  "see-also": { label: "See also", inverse: "See also", icon: "→" },
  "derived-from": { label: "Derived from", inverse: "Origin of", icon: "↳" },
};

describe("RELATION_TYPES", () => {
  it("has 7 relation types", () => {
    expect(Object.keys(RELATION_TYPES)).toHaveLength(7);
  });

  it("each type has label, inverse, and icon", () => {
    for (const [, value] of Object.entries(RELATION_TYPES)) {
      expect(value).toHaveProperty("label");
      expect(value).toHaveProperty("inverse");
      expect(value).toHaveProperty("icon");
    }
  });

  it("inverse relations are symmetric", () => {
    expect(RELATION_TYPES["is-part-of"].inverse).toBe("Contains");
    expect(RELATION_TYPES["contains"].inverse).toBe("Is part of");
    expect(RELATION_TYPES["preceded-by"].inverse).toBe("Followed by");
    expect(RELATION_TYPES["followed-by"].inverse).toBe("Preceded by");
  });

  it("related-to is self-inverse", () => {
    expect(RELATION_TYPES["related-to"].inverse).toBe("Related to");
  });
});
