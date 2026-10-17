/* The sign-in emails Supabase Auth sends, in the house design.
 *
 *   node tools/build-auth-emails.mjs            # writes supabase/auth-emails/*.html + payload
 *
 * Renders each template from api/email.js (the same layout as the enquiry
 * mail) and writes supabase/auth-emails/auth-config.json: the subjects,
 * templates and code length to PATCH into the project's Auth config
 * (Management API: /v1/projects/<ref>/config/auth). The SMTP login is not in
 * that file; it is added when the config is applied, from the server's
 * settings, so no password is ever committed.
 *
 * Go template variables Supabase fills in: {{ .ConfirmationURL }} (the link),
 * {{ .Token }} (the one-time code), {{ .Email }}, {{ .NewEmail }}.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layout, paragraph, button, codeBlock } from "../api/email.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "supabase/auth-emails");
const SITE = "https://gem-experience.com";
const NOTE = "If you did not ask for this, you can ignore this email; nothing changes on your account. " +
  "Questions? Reply to this email or write to contact@gem-experience.com.";

const T = {
  confirmation: {
    subject: "Confirm your email | Gem Experience",
    kicker: "Client account",
    heading: "Confirm your email",
    preheader: "One step to open your Gem Experience account.",
    body: paragraph("Thank you for creating an account. Confirm this address to follow your orders, quotations and appointments in one place.") +
      button("{{ .ConfirmationURL }}", "Confirm my email") +
      paragraph('<span style="font-size:13px">Please open the link in the browser where you created the account.</span>'),
  },
  magic_link: {
    subject: "{{ .Token }} is your Gem Experience sign-in code",
    kicker: "Sign in",
    heading: "Your sign-in code",
    preheader: "Enter this code on the sign-in page. It is valid for one hour.",
    body: paragraph("Enter this code on the sign-in page to continue. It is valid for one hour and can be used once.") +
      codeBlock("{{ .Token }}") +
      paragraph('<span style="font-size:13px">Or sign in from this device in one step:</span>') +
      button("{{ .ConfirmationURL }}", "Sign in"),
  },
  recovery: {
    subject: "Reset your password | Gem Experience",
    kicker: "Client account",
    heading: "Choose a new password",
    preheader: "A link to set a new password for your account.",
    body: paragraph("We received a request to reset the password for {{ .Email }}. Use the button below to choose a new one. The link is valid for one hour.") +
      button("{{ .ConfirmationURL }}", "Choose a new password") +
      paragraph('<span style="font-size:13px">Open the link in the same browser where you asked for it.</span>'),
  },
  email_change: {
    subject: "Confirm your new email | Gem Experience",
    kicker: "Client account",
    heading: "Confirm your new email",
    preheader: "Confirm the change to your account email.",
    body: paragraph("You asked to change your account email from {{ .Email }} to {{ .NewEmail }}. Confirm the new address to complete the change.") +
      button("{{ .ConfirmationURL }}", "Confirm new email"),
  },
  invite: {
    subject: "You are invited to Gem Experience",
    kicker: "Invitation",
    heading: "You are invited",
    preheader: "Accept your invitation to Gem Experience.",
    body: paragraph("You have been invited to an account at Gem Experience. Accept the invitation to set up your access.") +
      button("{{ .ConfirmationURL }}", "Accept invitation"),
  },
  reauthentication: {
    subject: "{{ .Token }} is your Gem Experience verification code",
    kicker: "Verification",
    heading: "Confirm it is you",
    preheader: "Your verification code.",
    body: paragraph("Enter this code to confirm the change you are making to your account.") +
      codeBlock("{{ .Token }}"),
  },
  password_changed_notification: {
    subject: "Your password was changed | Gem Experience",
    kicker: "Security",
    heading: "Your password was changed",
    preheader: "The password for your Gem Experience account was just changed.",
    body: paragraph("The password for {{ .Email }} was just changed. If this was you, there is nothing more to do.") +
      paragraph("If it was not you, reset your password straight away and let us know by replying to this email.") +
      button(`${SITE}/login/`, "Go to sign in"),
  },
  email_changed_notification: {
    subject: "Your account email was changed | Gem Experience",
    kicker: "Security",
    heading: "Your email was changed",
    preheader: "The email on your Gem Experience account was changed.",
    body: paragraph("The email on your account was changed from {{ .OldEmail }} to {{ .Email }}. If this was not you, reply to this email straight away."),
  },
};

fs.mkdirSync(OUT, { recursive: true });
const config = { mailer_otp_length: 6 };
for (const [key, t] of Object.entries(T)) {
  const html = layout({ site: SITE, kicker: t.kicker, heading: t.heading, preheader: t.preheader, body: t.body, note: NOTE });
  fs.writeFileSync(path.join(OUT, `${key}.html`), html);
  config[`mailer_subjects_${key}`] = t.subject;
  config[`mailer_templates_${key}_content`] = html;
}
fs.writeFileSync(path.join(OUT, "auth-config.json"), JSON.stringify(config, null, 2));
console.log(`auth emails: ${Object.keys(T).length} templates written to supabase/auth-emails/`);
