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
import { layout, detailsTable, paragraph, button, esc } from "./email.js";

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

const isEmail = (v) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 254;

function kindOf(formType, p) {
  return formType === "quotation" && p.source === "checkout" ? "checkout" : formType;
}

const KIND = {
  appointment: "appointment request", quotation: "quotation request", checkout: "enquiry",
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
  ["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["order_number", "Reference"],
  ["pieces", "Pieces"], ["piece", "Piece"], ["ref", "Product reference"], ["category", "Category"],
  ["date", "Date"], ["time", "Time"], ["location", "Location"], ["subject", "Subject"],
  ["message", "Message"], ["requirements", "Requirements"], ["notes", "Notes"], ["country", "Country"],
];

function pairs(p, skip = []) {
  const known = new Set([...FIELDS.map(([k]) => k), "gift", "source", "page"]);
  const list = [
    ...FIELDS.filter(([k]) => !skip.includes(k)),
    ...Object.keys(p).filter((k) => !known.has(k)).map((k) => [k, k.replace(/_/g, " ")]),
  ];
  return list
    .filter(([k]) => p[k] != null && p[k] !== "" && !(Array.isArray(p[k]) && !p[k].length))
    .map(([k, label]) => {
      let v = p[k];
      if (k === "date") v = niceDate(v);
      if (Array.isArray(v)) v = v.join("\n");
      if (v && typeof v === "object") v = JSON.stringify(v);
      return [label, v];
    });
}

function giftBlock(g) {
  if (!g || !(g.to || g.message)) return "";
  return detailsTable([
    ["Gift card", g.occasion || ""],
    ["For", g.to || ""],
    ["Message", g.message || ""],
    ["From", g.from || ""],
  ]);
}

/* ------------------------------------------------------------- messages */

function clientConfirmation(kind, p) {
  const first = esc(String(p.name || "").trim().split(/\s+/)[0] || "");
  const dear = first ? `Dear ${first},` : "Hello,";
  const details = detailsTable(pairs(p, ["name", "email", "phone", "order_number"])) + giftBlock(p.gift);
  const copy = {
    appointment: {
      subject: "Your appointment request",
      kicker: "Private viewing",
      heading: "Your visit is requested",
      preheader: "An adviser will confirm your appointment within one working day.",
      lines: [
        `${dear} thank you for asking to see the collection. We have you down for ` +
        `<strong style="font-weight:500">${esc(niceDate(p.date))}${p.time ? ` at ${esc(p.time)}` : ""}</strong>${p.location ? `, ${esc(p.location)}` : ""}.`,
        "An adviser will confirm the time by email within one working day.",
      ],
      cta: [`${SITE}/appointment/`, "Book another viewing"],
    },
    checkout: {
      subject: `Your enquiry${p.order_number ? ` ${p.order_number}` : ""}`,
      kicker: p.order_number ? `Reference ${p.order_number}` : "Enquiry",
      heading: "Your selection is with us",
      preheader: "An adviser will confirm price and availability before any payment.",
      lines: [
        `${dear} thank you for your selection. Every piece is made to order, so an adviser will confirm the price and availability of each one with you before any payment is taken.`,
        "Nothing has been charged.",
      ],
      cta: [`${SITE}/account/`, "Follow it in your account"],
    },
    quotation: {
      subject: "Your quotation request",
      kicker: "Quotation",
      heading: "We are pricing your piece",
      preheader: "A private quotation will follow within two working days.",
      lines: [
        `${dear} thank you for your request. Each piece is priced on its stone, so an adviser will send you a private quotation within two working days.`,
      ],
      cta: [`${SITE}/high-jewellery/`, "Continue exploring"],
    },
    contact: {
      subject: "We have your message",
      kicker: "Client services",
      heading: "Thank you for writing",
      preheader: "An adviser will reply personally within two working days.",
      lines: [
        `${dear} your message has reached us, and an adviser will reply to you personally within two working days.`,
      ],
      cta: [`${SITE}/the-house/`, "Discover the house"],
    },
    newsletter: {
      subject: "Welcome to the Gem Experience universe",
      kicker: "The letter from the workshop",
      heading: "Welcome",
      preheader: "New pieces before they are shown, and the occasional letter from the workshop.",
      lines: [
        "Thank you for joining us. You will hear about new pieces before they are shown, and receive the occasional letter from the workshop.",
        "We write rarely, and only when there is something worth seeing.",
      ],
      cta: [`${SITE}/lookbook/`, "View the lookbook"],
      plain: true,
    },
  }[kind];
  if (!copy) return null;
  return {
    subject: `${copy.subject} | Gem Experience`,
    html: layout({
      site: SITE,
      kicker: copy.kicker,
      heading: copy.heading,
      preheader: copy.preheader,
      body: copy.lines.map(paragraph).join("") + (copy.plain ? "" : details) + button(copy.cta[0], copy.cta[1]),
      note: copy.plain
        ? "You are receiving this because this address was entered on gem-experience.com. Reply with “unsubscribe” and we will remove it."
        : "Reply to this email to reach an adviser directly. If you did not make this request, you can ignore this message.",
    }),
  };
}

function staffAlert(kind, p, id) {
  const who = p.name || p.email || "A client";
  return {
    subject: `New ${KIND[kind] || "lead"}: ${who}`,
    html: layout({
      site: SITE,
      kicker: "New lead",
      heading: `${String(KIND[kind] || "Lead").replace(/^./, (c) => c.toUpperCase())} from ${who}`,
      preheader: `${who} sent a ${KIND[kind] || "lead"} from the website.`,
      body: paragraph(`Sent from the website just now. It is unassigned in the admin; reply to this email to answer ${esc(who)} directly.`) +
        detailsTable(pairs(p)) + giftBlock(p.gift) +
        button(`${SITE}/admin/forms?lead=${encodeURIComponent(id)}`, "Open the lead"),
    }),
  };
}

function assignedNotice(kind, p, id, by) {
  const who = p.name || p.email || "a client";
  const byName = by?.name || by?.email || "A colleague";
  return {
    subject: `Lead assigned to you: ${who}`,
    html: layout({
      site: SITE,
      kicker: "Assigned to you",
      heading: "A lead is yours",
      preheader: `${byName} assigned you the ${KIND[kind] || "lead"} from ${who}.`,
      body: paragraph(`${esc(byName)} assigned you the ${esc(KIND[kind] || "lead")} from <strong style="font-weight:500">${esc(who)}</strong>.`) +
        detailsTable(pairs(p)) + giftBlock(p.gift) +
        button(`${SITE}/admin/forms?lead=${encodeURIComponent(id)}`, "Open the lead"),
    }),
  };
}

async function send(to, msg, replyTo) {
  if (!to || (Array.isArray(to) && !to.length) || !msg) return;
  await mailer().sendMail({
    from: FROM, to, subject: msg.subject, html: msg.html,
    text: msg.html.replace(/<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|tr|h1|div)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n\s*\n+/g, "\n\n").trim(),
    ...(replyTo ? { replyTo } : {}),
  });
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
