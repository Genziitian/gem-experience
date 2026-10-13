/* The Events & Exhibitions page.
 *
 * Each row is one date on the storefront's /events/ page. The site sorts them
 * by start date and splits them itself: anything not yet over is Upcoming,
 * the rest move to Past exhibitions on their own. Every card carries a
 * WhatsApp button to the Dubai line with the event already named.
 */
import { useCallback, useEffect, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Segment, Search } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readEvents, saveEvent, deleteEvent } from "../lib/content.js";
import MediaPicker from "../components/MediaPicker.jsx";

const WHEN = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const blank = {
  title: "", kind: "Exhibition", starts_on: "", ends_on: "", hours: "",
  venue: "", city: "", country: "", address: "", description: "", image: "", published: true,
};

/* Local, not UTC: the storefront splits upcoming from past on the visitor's
   own date, and toISOString would roll over hours early east of Greenwich. */
const today = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
const endOf = (e) => e.ends_on || e.starts_on;

function dates(e) {
  const f = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return e.ends_on && e.ends_on !== e.starts_on ? `${f(e.starts_on)} – ${f(e.ends_on)}` : f(e.starts_on);
}

export default function Events() {
  const [rows, setRows] = useState(null);
  const [when, setWhen] = useState("upcoming");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await readEvents());
      setError("");
    } catch (e) {
      setError(/events/.test(e.message || "")
        ? "The events table is not there yet. Run migrations/20261013010000_events.sql in Supabase."
        : e.message || "Could not load events.");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = today();
  const here = (rows || [])
    .filter((r) => (when === "upcoming" ? endOf(r) >= now : endOf(r) < now))
    .filter((r) => !q || `${r.title} ${r.venue || ""} ${r.city || ""}`.toLowerCase().includes(q.toLowerCase()))
    .slice()
    .sort((a, b) => (when === "upcoming" ? a.starts_on.localeCompare(b.starts_on) : b.starts_on.localeCompare(a.starts_on)));

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function startEdit(ev) {
    setEditing(ev);
    const clean = {};
    Object.keys(blank).forEach((k) => { clean[k] = ev[k] ?? blank[k]; });
    setForm(clean);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveEvent({ ...form, id: editing?.id });
      await load();
      setEditing(null);
      setForm(blank);
      show(editing ? "Event updated." : "Event added.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(ev) {
    if (!window.confirm(`Delete “${ev.title}”? This removes it from the site.`)) return;
    try {
      await deleteEvent(ev.id);
      await load();
      show("Deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  return (
    <>
      <Panel
        title="Events and exhibitions"
        actions={
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search events…" />
            <Segment value={when} onChange={setWhen} options={WHEN} />
          </div>
        }
      >
        <p className="panel-note">
          These are the dates on Events &amp; Exhibitions. An event moves from Upcoming to
          Past by itself the day after it ends. Each one shows a WhatsApp button to the
          Dubai line with the event already named in the message.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={4} />
        ) : !here.length ? (
          <Empty icon="calendar" title={when === "upcoming" ? "Nothing coming up" : "No past events"}>
            {when === "upcoming"
              ? "Add the next exhibition below. Until then the page invites visitors to WhatsApp for news."
              : "Events land here once their last day has passed."}
          </Empty>
        ) : (
          <div className="office-list">
            {here.map((ev) => (
              <div className={`office-row ${ev.published ? "" : "is-off"}`} key={ev.id}>
                <div className="office-thumb">
                  {ev.image ? <img src={ev.image} alt="" loading="lazy" /> : <Icon name="calendar" width="18" height="18" />}
                </div>
                <div className="office-main">
                  <strong>{ev.title}</strong>
                  <span className="office-addr">{dates(ev)} · {[ev.venue, ev.city].filter(Boolean).join(", ") || "—"}</span>
                  <span className="office-phone">{ev.kind}{ev.published ? "" : " · hidden"}</span>
                </div>
                <div className="nav-row-acts">
                  <button type="button" className="icon-btn" onClick={() => startEdit(ev)} aria-label="Edit">
                    <Icon name="edit" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger"
                          onClick={() => remove(ev)} aria-label="Delete">
                    <Icon name="trash" width="15" height="15" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={editing ? `Edit “${editing.title}”` : "New event"}>
        <form className="form-grid" onSubmit={submit}>
          <label className="full">
            Title
            <input value={form.title} required placeholder="Tanzanite: Nothing Begins Above Ground" onChange={set("title")} />
          </label>

          <label>
            Kind
            <input value={form.kind} list="event-kinds" onChange={set("kind")} />
            <datalist id="event-kinds">
              <option value="Exhibition" />
              <option value="Trunk show" />
              <option value="Private viewing" />
              <option value="Fair" />
              <option value="Launch" />
            </datalist>
            <small>The small label above the title.</small>
          </label>

          <label>
            Hours
            <input value={form.hours} placeholder="11am – 9pm daily" onChange={set("hours")} />
          </label>

          <label>
            First day
            <input type="date" value={form.starts_on} required onChange={set("starts_on")} />
          </label>

          <label>
            Last day
            <input type="date" value={form.ends_on || ""} min={form.starts_on || undefined} onChange={set("ends_on")} />
            <small>Leave empty for a single day.</small>
          </label>

          <label>
            Venue
            <input value={form.venue} placeholder="Atlantis The Royal" onChange={set("venue")} />
          </label>

          <label>
            City
            <input value={form.city} placeholder="Dubai" onChange={set("city")} />
          </label>

          <label>
            Country
            <input value={form.country} placeholder="United Arab Emirates" onChange={set("country")} />
          </label>

          <label>
            Address
            <input value={form.address} placeholder="Crescent Road, The Palm" onChange={set("address")} />
          </label>

          <label className="full">
            Description
            <textarea rows={5} value={form.description} onChange={set("description")}
                      placeholder="What will be shown, and for whom. A blank line starts a new paragraph." />
          </label>

          <label className="full">
            Photograph
            <div className="field-row">
              <input value={form.image} placeholder="https://… or ../img/…" onChange={set("image")} />
              <button type="button" className="btn" onClick={() => setPicking(true)}>Choose…</button>
            </div>
            <small>Optional. Without one the event shows as text only.</small>
          </label>

          <label className="check full">
            <input type="checkbox" checked={form.published}
                   onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Visible on the site
          </label>

          <div className="form-actions full">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add event"}
            </button>
            {editing ? (
              <button type="button" className="btn" onClick={() => { setEditing(null); setForm(blank); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      {picking ? (
        <MediaPicker
          onPick={(m) => { setForm((f) => ({ ...f, image: m.url })); setPicking(false); }}
          onClose={() => setPicking(false)}
        />
      ) : null}

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
