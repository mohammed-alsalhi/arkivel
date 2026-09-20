export const RELATION_TYPES = {
  "related-to": { label: "Related to", inverse: "Related to", icon: "\u2194" },
  "is-part-of": { label: "Is part of", inverse: "Contains", icon: "\u2282" },
  "contains": { label: "Contains", inverse: "Is part of", icon: "\u2283" },
  "preceded-by": { label: "Preceded by", inverse: "Followed by", icon: "\u2190" },
  "followed-by": { label: "Followed by", inverse: "Preceded by", icon: "\u2192" },
  "see-also": { label: "See also", inverse: "See also", icon: "\u2192" },
  "derived-from": { label: "Derived from", inverse: "Origin of", icon: "\u21B3" },
} as const;

export type RelationType = keyof typeof RELATION_TYPES;
