import { Node, mergeAttributes, InputRule } from "@tiptap/core";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      title: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{
      tag: "a[data-wiki-link]",
      priority: 60,
      getAttrs: (el) => {
        const element = el as HTMLElement;
        const title = element.getAttribute("data-wiki-link");
        const text = element.textContent || "";
        return {
          title,
          label: text !== title ? text : null,
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes.title || "";
    const label = HTMLAttributes.label || title;
    const slug = slugify(title);
    return [
      "a",
      mergeAttributes({
        href: `/articles/${slug}`,
        class: "wiki-link",
        "data-wiki-link": title,
      }),
      label,
    ];
  },

  addInputRules() {
    return [
      // [[Article Name|Display Text]]
      new InputRule({
        find: /\[\[([^\]|]+)\|([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const title = match[1];
          const label = match[2];
          if (!title) return;
          const { tr } = state;
          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ title, label })
          );
        },
      }),
      // [[Article Name]]
      new InputRule({
        find: /\[\[([^\]|]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const title = match[1];
          if (!title) return;
          const { tr } = state;
          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ title })
          );
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-l": () => {
        const { from, to } = this.editor.state.selection;
        const selectedText = this.editor.state.doc.textBetween(from, to);
        const title = window.prompt("Article title:", selectedText || "");
        if (title) {
          const label = selectedText && selectedText !== title ? selectedText : null;
          return this.editor
            .chain()
            .focus()
            .deleteRange({ from, to })
            .insertContent({
              type: this.name,
              attrs: { title, label },
            })
            .run();
        }
        return false;
      },
    };
  },
});
