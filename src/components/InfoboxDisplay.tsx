import Link from "next/link";
import { getInfoboxSchema, type InfoboxFieldDef } from "@/lib/infobox-schema";
import { generateSlug, formatDate } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
};

type Tag = { id: string; name: string; slug: string };

type Props = {
  title: string;
  coverImage: string | null;
  coverFocalX?: number | null;
  coverFocalY?: number | null;
  category: Category | null;
  tags: Tag[];
  infobox: Record<string, string> | null;
  allCategories: Category[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

/** Flatten a nested category tree into a flat array */
function flattenCategories(cats: Category[]): Category[] {
  const result: Category[] = [];
  function walk(list: Category[]) {
    for (const c of list) {
      result.push({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId });
      if (c.children) walk(c.children);
    }
  }
  walk(cats);
  return result;
}

export default function InfoboxDisplay({
  title,
  coverImage,
  coverFocalX,
  coverFocalY,
  category,
  tags,
  infobox,
  allCategories,
  createdAt,
  updatedAt,
}: Props) {
  const flat = flattenCategories(allCategories);
  const schema = category ? getInfoboxSchema(category.slug, flat) : null;

  const filledFields =
    schema?.fields.filter((f) => infobox?.[f.key]?.trim()) || [];

  const hasAnything =
    category || tags.length > 0 || coverImage || filledFields.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="wiki-infobox">
      <div className="wiki-infobox-header">{title}</div>

      {coverImage && (
        <div className="wiki-infobox-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={title}
            style={{ objectPosition: `${coverFocalX ?? 50}% ${coverFocalY ?? 50}%` }}
          />
        </div>
      )}

      {/* Category-specific fields */}
      {filledFields.map((field) => (
        <div key={field.key} className="wiki-infobox-row">
          <div className="wiki-infobox-label">{field.label}</div>
          <div className="wiki-infobox-value">
            <FieldValue field={field} value={infobox![field.key]} />
          </div>
        </div>
      ))}

      {/* Standard rows */}
      {category && (
        <div className="wiki-infobox-row">
          <div className="wiki-infobox-label">space</div>
          <div className="wiki-infobox-value">
            <Link href={`/categories/${category.slug}`}>
              {category.name}
            </Link>
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div className="wiki-infobox-row">
          <div className="wiki-infobox-label">tags</div>
          <div className="wiki-infobox-value">
            {tags.map((tag, i) => (
              <span key={tag.id}>
                {i > 0 && ", "}
                <Link href={`/tags/${tag.slug}`}>{tag.name}</Link>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="wiki-infobox-row">
        <div className="wiki-infobox-label">created</div>
        <div className="wiki-infobox-value">{formatDate(createdAt)}</div>
      </div>
      <div className="wiki-infobox-row">
        <div className="wiki-infobox-label">updated</div>
        <div className="wiki-infobox-value">{formatDate(updatedAt)}</div>
      </div>
    </div>
  );
}

function FieldValue({ field, value }: { field: InfoboxFieldDef; value: string }) {
  if (field.type === "wikilink") {
    const slug = generateSlug(value);
    return <Link href={`/articles/${slug}`}>{value}</Link>;
  }
  if (field.type === "list") {
    const items = value.split(",").map((s) => s.trim()).filter(Boolean);
    return <>{items.join(", ")}</>;
  }
  return <>{value}</>;
}
