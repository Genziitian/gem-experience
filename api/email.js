/* The one email design every message uses: the enquiry mail sent by
 * notify.js and the sign-in mail Supabase sends (tools/build-auth-emails.mjs
 * renders those from this same layout).
 *
 * It follows the website: a white page on the cream ground, the letter-spaced
 * wordmark, serif headings, a dark button, and the dark footer band with the
 * house line. Email clients ignore stylesheets and most web fonts, so every
 * style is inline, the structure is tables, and each font names its fallback:
 * EB Garamond → Garamond → Georgia for headings, Jost → Helvetica → Arial for
 * text. Apple Mail and iOS load the web fonts; everything else falls back.
 */

export const SITE_DEFAULT = "https://gem-experience.com";

const C = {
  ink: "#17140f",
  soft: "#2b2620",
  muted: "#6b6259",
  rule: "#e3ddd0",
  cream: "#f5f1e8",
  band: "#2b2620",
  bandText: "#e9e3d6",
};
const SERIF = "'EB Garamond', Garamond, Georgia, 'Times New Roman', serif";
const SANS = "Jost, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* A two-column list of label and value on the cream ground. `pairs` is
   [[label, value], …]; values are escaped here and keep their line breaks. */
export function detailsTable(pairs) {
  const list = pairs.filter(([, v]) => v != null && v !== "");
  if (!list.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.cream};margin:8px 0 0">
  <tr><td style="padding:20px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
${list.map(([k, v], i) => `      <tr>
        <td valign="top" style="padding:${i ? "10px" : "0"} 16px 0 0;width:34%;font:500 10px/16px ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(k)}</td>
        <td valign="top" style="padding:${i ? "10px" : "0"} 0 0;font:300 14px/22px ${SANS};color:${C.ink};white-space:pre-line">${esc(v)}</td>
      </tr>`).join("\n")}
    </table>
  </td></tr>
</table>`;
}

/* A large centred code, for the one-time sign-in code. */
export function codeBlock(code) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.cream};margin:8px 0 22px">
  <tr><td align="center" style="padding:28px 16px;font:400 34px/1 ${SERIF};letter-spacing:10px;color:${C.ink}">${code}</td></tr>
</table>`;
}

export function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:32px 0 0">
  <tr><td style="background:${C.ink}">
    <a href="${href}" style="display:inline-block;padding:16px 30px;font:500 11px/1 ${SANS};letter-spacing:3px;text-transform:uppercase;color:#ffffff;text-decoration:none">${esc(label)}</a>
  </td></tr>
</table>`;
}

export function paragraph(html) {
  return `<p style="margin:0 0 16px;font:300 15px/25px ${SANS};color:${C.soft}">${html}</p>`;
}

/* The page. `kicker` is the small capitals line above the heading;
   `preheader` is the inbox preview text; `body` is trusted HTML built from
   the helpers above; `note` is the small print under the content. */
export function layout({ kicker = "", heading, preheader = "", body = "", note = "", site = SITE_DEFAULT }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.cream}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:600px;background:#ffffff">
    <tr><td align="center" style="padding:36px 32px 28px;border-bottom:1px solid ${C.rule}">
      <a href="${site}/" style="font:500 13px/1 ${SANS};letter-spacing:7px;text-transform:uppercase;color:${C.ink};text-decoration:none">Gem Experience</a>
    </td></tr>
    <tr><td style="padding:44px 40px 40px">
      ${kicker ? `<div style="font:500 10px/16px ${SANS};letter-spacing:3.6px;text-transform:uppercase;color:${C.muted}">${esc(kicker)}</div>` : ""}
      <h1 style="margin:${kicker ? "14px" : "0"} 0 22px;font:400 32px/1.15 ${SERIF};color:${C.ink}">${esc(heading)}</h1>
      ${body}
      ${note ? `<p style="margin:32px 0 0;padding-top:20px;border-top:1px solid ${C.rule};font:300 12px/19px ${SANS};color:${C.muted}">${note}</p>` : ""}
    </td></tr>
    <tr><td align="center" style="background:${C.band};padding:36px 32px">
      <div style="font:500 12px/1 ${SANS};letter-spacing:6px;text-transform:uppercase;color:#ffffff">Gem Experience</div>
      <div style="margin:14px 0 0;font:italic 400 16px/24px ${SERIF};color:${C.bandText}">Singular pieces, each cut from a stone<br>we followed out of the ground.</div>
      <div style="margin:22px 0 0;font:300 12px/20px ${SANS};color:${C.bandText}">
        Dubai · Jaipur · Arusha<br>
        <a href="mailto:contact@gem-experience.com" style="color:${C.bandText}">contact@gem-experience.com</a> · <a href="https://wa.me/971567203896" style="color:${C.bandText}">WhatsApp +971 56 720 3896</a>
      </div>
      <div style="margin:18px 0 0;font:500 10px/16px ${SANS};letter-spacing:2.4px;text-transform:uppercase">
        <a href="${site}/high-jewellery/" style="color:#ffffff;text-decoration:none">High Jewellery</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${site}/fine-jewellery/" style="color:#ffffff;text-decoration:none">Fine Jewellery</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${site}/appointment/" style="color:#ffffff;text-decoration:none">Book a viewing</a>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
