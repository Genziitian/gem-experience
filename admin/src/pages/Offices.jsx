/* The cards on the Find our store page.
 *
 * Two lists, kept apart by `kind`: the ateliers we run, which carry a phone
 * number, and the partner locations that stock us, which do not. They are
 * ordered independently, so a store moving up cannot disturb the ateliers.
 */
import { useCallback, useEffect, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Segment, Search } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readOffices, saveOffice, deleteOffice, reorderOffices } from "../lib/content.js";
import MediaPicker from "../components/MediaPicker.jsx";

const KINDS = [
  { value: "atelier", label: "Our ateliers" },
  { value: "store", label: "Stockists" },
];

const blank = {
  kind: "atelier", name: "", region: "", address: "", phone: "", tel: "",
  whatsapp: "", email: "", image: "", map_query: "", hours: "", published: true,
};

export default function Offices() {
  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState("atelier");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await readOffices());
      setError("");
    } catch (e) {
      setError(e.message || "Could not load offices.");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const here = (rows || [])
    .filter((r) => r.kind === kind)
    .filter((r) => !q || `${r.name} ${r.address || ""}`.toLowerCase().includes(q.toLowerCase()))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  function startEdit(o) {
    setEditing(o);
    setForm({ ...blank, ...o, region: o.region || "", address: o.address || "" });
    setKind(o.kind);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const siblings = (rows || []).filter((r) => r.kind === (form.kind || kind));
      await saveOffice({
        ...form,
        id: editing?.id,
        sort_order: editing ? editing.sort_order : siblings.length,
      });
      await load();
      setEditing(null);
      setForm({ ...blank, kind });
      show(editing ? "Office updated." : "Office added.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(o) {
    if (!window.confirm(`Delete “${o.name}”? This removes the card from the site.`)) return;
    try {
      await deleteOffice(o.id);
      await load();
      show("Deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  async function move(o, delta) {
    const list = here.slice();
    const i = list.findIndex((x) => x.id === o.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]);

    const moved = new Map(list.map((x, k) => [x.id, k]));
    setRows((prev) => prev.map((r) => (moved.has(r.id) ? { ...r, sort_order: moved.get(r.id) } : r)));
    try {
      await reorderOffices(list);
    } catch (err) {
      show(err.message || "Could not reorder.", false);
      load();
    }
  }

  return (
    <>
      <Panel
        title="Offices and stockists"
        actions={
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search offices…" />
            <Segment value={kind} onChange={(k) => { setKind(k); setForm({ ...blank, kind: k }); setEditing(null); }}
                     options={KINDS} />
          </div>
        }
      >
        <p className="panel-note">
          These are the cards on Find our store. Ateliers show a phone number and a
          region; stockists show an address and directions only.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={5} />
        ) : !here.length ? (
          <Empty icon="globe" title="No cards here yet">
            Add one below, or run the seed migration to bring in the locations the
            site already ships with.
          </Empty>
        ) : (
          <div className="office-list">
            {here.map((o, i) => (
              <div className={`office-row ${o.published ? "" : "is-off"}`} key={o.id}>
                <div className="office-thumb">
                  {o.image ? <img src={o.image} alt="" loading="lazy" /> : <Icon name="globe" width="18" height="18" />}
                </div>
                <div className="office-main">
                  <strong>{o.name}</strong>
                  <span className="office-addr">{o.address || "—"}</span>
                  {o.phone ? <span className="office-phone">{o.phone}</span> : null}
                </div>
                <div className="nav-row-acts">
                  <button type="button" className="icon-btn" disabled={i === 0}
                          onClick={() => move(o, -1)} aria-label="Move up">
                    <Icon name="arrowUp" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" disabled={i === here.length - 1}
                          onClick={() => move(o, 1)} aria-label="Move down">
                    <Icon name="arrowDown" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => startEdit(o)} aria-label="Edit">
                    <Icon name="edit" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger"
                          onClick={() => remove(o)} aria-label="Delete">
                    <Icon name="trash" width="15" height="15" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={editing ? `Edit “${editing.name}”` : "New location"}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Kind
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="atelier">Our atelier</option>
              <option value="store">Stockist</option>
            </select>
          </label>

          <label>
            Name
            <input value={form.name} required
                   onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label>
            Region
            <input value={form.region} placeholder="Tanzania"
                   onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <small>Shown over the photograph. Defaults to Tanzania when empty.</small>
          </label>

          <label className="full">
            Address
            <textarea rows={2} value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>

          <label>
            Phone, as displayed
            <input value={form.phone} placeholder="+91 73000 43093"
                   onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>

          <label>
            Phone, as dialled
            <input value={form.tel} placeholder="+917300043093"
                   onChange={(e) => setForm({ ...form, tel: e.target.value })} />
            <small>Digits and a leading +, no spaces. This is what the tap-to-call uses.</small>
          </label>

          <label className="full">
            Photograph
            <div className="field-row">
              <input value={form.image} placeholder="../img/offices/dubai.jpg"
                     onChange={(e) => setForm({ ...form, image: e.target.value })} />
              <button type="button" className="btn" onClick={() => setPicking(true)}>Choose…</button>
            </div>
          </label>

          <label className="full">
            Map search
            <input value={form.map_query} placeholder="Gem Experience 25H Jumeirah Lake Towers Dubai"
                   onChange={(e) => setForm({ ...form, map_query: e.target.value })} />
            <small>What the Directions link searches for. A place name works better than an address.</small>
          </label>

          <label className="check full">
            <input type="checkbox" checked={form.published}
                   onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Visible on the site
          </label>

          <div className="form-actions full">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add location"}
            </button>
            {editing ? (
              <button type="button" className="btn"
                      onClick={() => { setEditing(null); setForm({ ...blank, kind }); }}>
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
