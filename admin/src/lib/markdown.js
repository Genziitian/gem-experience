/* The storefront's own Markdown renderer, imported rather than copied, so the
   preview in the Blog and FAQ editors is exactly what the site will draw.
   frontend/js/markdown.js is a plain script that sets GemMarkdown on the
   global object; importing it for that side effect is all this does. */
import "../../../frontend/js/markdown.js";

const md = globalThis.GemMarkdown;

export const renderMarkdown = md.render;
export const markdownText = md.toText;
export const markdownHeadings = md.headings;
