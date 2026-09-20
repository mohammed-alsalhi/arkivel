/**
 * ImageCaptionExtension — extends the built-in Image node to support an
 * optional caption stored as the `title` attribute. At render time the
 * image is wrapped in a <figure> with an optional <figcaption>.
 *
 * The title attribute doubles as caption so that existing images already
 * stored with a title get the figcaption treatment automatically.
 */

import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

export const ImageCaption = Image.extend({
  name: "image", // keep the same name so no migration needed

  renderHTML({ HTMLAttributes }) {
    const { title, src, alt, ...rest } = HTMLAttributes as {
      title?: string;
      src?: string;
      alt?: string;
      [key: string]: unknown;
    };

    const imgAttrs = mergeAttributes(rest, { src, alt, title });

    if (title) {
      return [
        "figure",
        { class: "wiki-figure" },
        ["img", imgAttrs],
        ["figcaption", {}, title],
      ];
    }

    return ["img", imgAttrs];
  },
});

export default ImageCaption;
