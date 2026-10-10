/* Lead mail: the client's confirmation, the staff alert, the adviser's
 * assignment notice.
 *
 * Called by the database (public.notify_mail(), via pg_net) when a form
 * submission arrives and when a lead is assigned — never by a browser. The
 * shared secret in X-Notify-Secret is the only thing that lets a request in;
 * it lives in Supabase Vault (`notify_secret`) and in /etc/gem-api.env.
 *
 * The answer goes back before the mail is sent: pg_net only needs to know the
 * request arrived, and a slow SMTP handshake should not hold its queue.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM,
 *      STAFF_NOTIFY_EMAIL (comma-separated), NOTIFY_SECRET, SITE_URL.
 */

import { timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

const env = process.env;
const SITE = (env.SITE_URL || "https://gem-experience.com").replace(/\/$/, "");
const FROM = env.MAIL_FROM || `Gem Experience <${env.SMTP_USER}>`;
const STAFF = (env.STAFF_NOTIFY_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);

let transport = null;
function mailer() {
  if (!transport) {
    const port = Number(env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transport;
}

function secretOk(given) {
  const want = Buffer.from(env.NOTIFY_SECRET || "");
  const got = Buffer.from(String(given || ""));
  return want.length > 0 && want.length === got.length && timingSafeEqual(want, got);
}

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isEmail = (v) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 254;

function kindOf(formType, p) {
  return formType === "quotation" && p.source === "checkout" ? "checkout" : formType;
}

const KIND = {
  appointment: "appointment", quotation: "quotation request", checkout: "enquiry",
  contact: "message", newsletter: "newsletter sign-up",
};

function niceDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || "")) return ymd || "";
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* The fields as an adviser reads them, in a fixed order; anything else the
   form sent follows, so nothing is dropped. */
const FIELDS = [
  ["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["order_number", "Order"],
  ["pieces", "Pieces"], ["piece", "Piece"], ["ref", "Reference"], ["category", "Category"],
  ["date", "Date"], ["time", "Time"], ["location", "Location"], ["subject", "Subject"],
  ["message", "Message"], ["requirements", "Requirements"], ["notes", "Notes"], ["country", "Country"],
];

function rows(p) {
  const known = new Set([...FIELDS.map(([k]) => k), "gift", "source"]);
  const list = [
    ...FIELDS.filter(([k]) => p[k] != null && p[k] !== "" && !(Array.isArray(p[k]) && !p[k].length)),
    ...Object.keys(p).filter((k) => !known.has(k)).map((k) => [k, k.replace(/_/g, " ")]),
  ];
  return list.map(([k, label]) => {
    let v = p[k];
    if (k === "date") v = niceDate(v);
    if (Array.isArray(v)) v = v.join(", ");
    if (v && typeof v === "object") v = JSON.stringify(v);
    return `<tr><td style="padding:8px 16px 8px 0;color:#6b6259;font-size:13px;vertical-align:top;white-space:nowrap">${esc(label)}</td>` +
      `<td style="padding:8px 0;font-size:14px;color:#17140f;white-space:pre-line">${esc(v)}</td></tr>`;
  }).join("");
}

function giftBlock(g) {
  if (!g || !(g.to || g.message)) return "";
  return `<div style="margin:24px 0;padding:24px;background:#f5f1e8;text-align:center;font-family:Georgia,serif">` +
    (g.occasion ? `<div style="font:500 10px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#6b6259">${esc(g.occasion)}</div>` : "") +
    (g.to ? `<p style="margin:12px 0 0;font-size:13px;color:#6b6259">For ${esc(g.to)}</p>` : "") +
    (g.message ? `<p style="margin:10px 0;font-size:18px;font-style:italic;color:#17140f">${esc(g.message)}</p>` : "") +
    (g.from ? `<p style="margin:0;font-size:13px;color:#6b6259">— ${esc(g.from)}</p>` : "") +
    `</div>`;
}

/* One quiet layout for every message: the wordmark, the copy, a button. */
function layout({ heading, intro, body = "", cta, footnote = "" }) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#17140f">
  <div style="text-align:center;font:500 13px/1 Arial,sans-serif;letter-spacing:6px;text-transform:uppercase;padding-bottom:28px;border-bottom:1px solid #e3ddd0">Gem Experience</div>
  <h1 style="margin:32px 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:28px;line-height:1.2">${heading}</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#2b2620">${intro}</p>
  ${body}
  ${cta ? `<p style="margin:28px 0"><a href="${esc(cta.href)}" style="display:inline-block;padding:14px 26px;background:#17140f;color:#ffffff;text-decoration:none;font:500 11px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase">${esc(cta.label)}</a></p>` : ""}
  ${footnote ? `<p style="margin:28px 0 0;font-size:12px;line-height:18px;color:#6b6259">${footnote}</p>` : ""}
</div></body></html>`;
}

/* ------------------------------------------------------------- messages */

function clientConfirmation(kind, p) {
  const first = esc(String(p.name || "").split(" ")[0] || "there");
  const table = `<table style="border-collapse:collapse;margin:8px 0 0">${rows({ ...p, email: undefined, phone: undefined, name: undefined })}</table>`;
  const copy = {
    appointment: {
      subject: "Your appointment request — Gem Experience",
      heading: "Your visit is requested",
      intro: `Dear ${first}, thank you for asking to see the collection. We have you down for ` +
        `<strong>${esc(niceDate(p.date))}${p.time ? ` at ${esc(p.time)}` : ""}</strong>${p.location ? `, ${esc(p.location)}` : ""}. ` +
        `An adviser will confirm by email within one working day.`,
    },
    checkout: {
      subject: `Your enquiry ${p.order_number || ""} — Gem Experience`.replace("  ", " "),
      heading: "Your enquiry is with us",
      intro: `Dear ${first}, thank you for your selection${p.order_number ? ` (reference <strong>${esc(p.order_number)}</strong>)` : ""}. ` +
        `An adviser will confirm price and availability for each piece before any payment is taken.`,
    },
    quotation: {
      subject: "Your quotation request — Gem Experience",
      heading: "We are pricing your piece",
      intro: `Dear ${first}, thank you for your request. Every piece is priced on its stone, so an adviser will be in touch with a quotation shortly.`,
    },
    contact: {
      subject: "We have your message — Gem Experience",
      heading: "Thank you for writing",
      intro: `Dear ${first}, your message has reached us. We usually reply within one working day.`,
    },
  }[kind];
  if (!copy) return null;
  return {
    subject: copy.subject,
    html: layout({
      heading: copy.heading,
      intro: copy.intro,
      body: table + giftBlock(p.gift),
      cta: { href: `${SITE}/account/`, label: "Follow it in your account" },
      footnote: "Reply to this email to reach an adviser directly. If you did not make this request, you can ignore this message.",
    }),
  };
}

function staffAlert(kind, p, id) {
  const who = p.name || p.email || "A client";
  return {
    subject: `New ${KIND[kind] || "lead"}: ${who}`,
    html: layout({
      heading: `New ${esc(KIND[kind] || "lead")}`,
      intro: `${esc(who)} sent this from the website just now. It is unassigned in the admin.`,
      body: `<table style="border-collapse:collapse">${rows(p)}</table>${giftBlock(p.gift)}`,
      cta: { href: `${SITE}/admin/forms?lead=${encodeURIComponent(id)}`, label: "Open the lead" },
    }),
  };
}

function assignedNotice(kind, p, id, by) {
  const who = p.name || p.email || "a client";
  const byName = by?.name || by?.email || "A colleague";
  return {
    subject: `Lead assigned to you: ${who}`,
    html: layout({
      heading: "A lead is yours",
      intro: `${esc(byName)} assigned you the ${esc(KIND[kind] || "lead")} from <strong>${esc(who)}</strong>.`,
      body: `<table style="border-collapse:collapse">${rows(p)}</table>${giftBlock(p.gift)}`,
      cta: { href: `${SITE}/admin/forms?lead=${encodeURIComponent(id)}`, label: "Open the lead" },
    }),
  };
}

async function send(to, msg, replyTo) {
  if (!to || (Array.isArray(to) && !to.length) || !msg) return;
  await mailer().sendMail({ from: FROM, to, subject: msg.subject, html: msg.html, ...(replyTo ? { replyTo } : {}) });
}

async function deliver(event) {
  const p = event.payload && typeof event.payload === "object" ? event.payload : {};
  const kind = kindOf(event.form_type, p);
  const jobs = [];

  if (event.event === "submission") {
    if (isEmail(p.email)) jobs.push(send(p.email, clientConfirmation(kind, p), STAFF[0]));
    if (kind !== "newsletter") jobs.push(send(STAFF, staffAlert(kind, p, event.id), isEmail(p.email) ? p.email : undefined));
  } else if (event.event === "assigned" && isEmail(event.assignee?.email)) {
    jobs.push(send(event.assignee.email, assignedNotice(kind, p, event.id, event.by), isEmail(p.email) ? p.email : undefined));
  }

  const results = await Promise.allSettled(jobs);
  results.forEach((r) => {
    if (r.status === "rejected") console.error(`notify ${event.event} ${event.id}:`, r.reason?.message || r.reason);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!secretOk(req.headers["x-notify-secret"])) return res.status(401).json({ error: "Unauthorized" });
  if (!env.SMTP_USER || !env.SMTP_PASS) return res.status(503).json({ error: "Mail is not configured" });

  const event = req.body || {};
  if (!["submission", "assigned"].includes(event.event)) return res.status(400).json({ error: "Unknown event" });

  res.status(202).json({ ok: true });
  deliver(event).catch((err) => console.error("notify:", err?.message || err));
}
