/* The site menu, as a two-level tree.
 *
 * The drawer on the storefront is exactly two deep — a section, and the panel
 * that slides over it — so this editor is too. There is no drag-and-drop:
 * reordering is two buttons per row, which works on a touch screen, needs no
 * library, and cannot drop a row into a position that does not exist.
 */
import { useCallback, useEffect, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Segment } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readNav, nest, saveNavItem, deleteNavItem, reorderNav } from "../lib/content.js";

const LOCATIONS = [
  { value: "primary", label: "Main menu" },
  { value: "secondary", label: "Secondary" },
  { value: "footer", label: "Footer" },
];

const blank = { label: "", href: "", is_heading: false, published: true };

function Row({ item, depth, onEdit, onDelete, onMove, first, last }) {
  return (
    <div className={`nav-row ${depth ? "nav-row--child" : ""} ${item.published ? "" : "is-off"}`}>
      <div className="nav-row-main">
        <span className="nav-row-label">
          {item.is_heading ? <em>{item.label}</em> : item.label}
        </span>
        <span className="nav-row-href">
          {item.is_heading
            ? "heading"
            : item.href || <span className="nav-row-muted">no link yet</span>}
        </span>
      </div>
      <div className="nav-row-acts">
        <button type="button" className="icon-btn" disabled={first}
                onClick={() => onMove(item, -1)} aria-label="Move up">
          <Icon name="arrowUp" width="15" height="15" />
        </button>
        <button type="button" className="icon-btn" disabled={last}
                onClick={() => onMove(item, 1)} aria-label="Move down">
          <Icon name="arrowDown" width="15" height="15" />
        </button>
        <button type="button" className="icon-btn" onClick={() => onEdit(item)} aria-label="Edit">
          <Icon name="edit" width="15" height="15" />
        </button>
        <button type="button" className="icon-btn icon-btn--danger"
                onClick={() => onDelete(item)} aria-label="Delete">
          <Icon name="trash" width="15" height="15" />
        </button>
      </div>
    </div>
  );
}

export default function Navigation() {
  const [rows, setRows] = useState(null);
  const [location, setLocation] = useState("primary");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await readNav());
      setError("");
    } catch (e) {
      setError(e.message || "Could not load the menu.");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const here = (rows || []).filter((r) => r.location === location);
  const tree = nest(here);

  function startNew(parent) {
    setEditing(null);
    setForm(blank);
    setParentId(parent || "");
  }

  function startEdit(item) {
    setEditing(item);
    setForm({
      label: item.label || "",
      href: item.href || "",
      is_heading: !!item.is_heading,
      published: item.published !== false,
    });
    setParentId(item.parent_id || "");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      /* A new row goes to the end of whichever list it joins, so it never
         lands in the middle of a menu the reader already knows. */
      const siblings = parentId
        ? here.filter((r) => r.parent_id === parentId)
        : here.filter((r) => !r.parent_id);
      await saveNavItem({
        ...form,
        id: editing?.id,
        location,
        parent_id: parentId || null,
        sort_order: editing ? editing.sort_order : siblings.length,
      });
      await load();
      setEditing(null);
      setForm(blank);
      setParentId("");
      show(editing ? "Menu item updated." : "Menu item added.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    const kids = (rows || []).filter((r) => r.parent_id === item.id).length;
    const warning = kids
      ? `Delete “${item.label}” and the ${kids} item${kids > 1 ? "s" : ""} inside it?`
      : `Delete “${item.label}”?`;
    if (!window.confirm(warning)) return;
    try {
      await deleteNavItem(item.id);
      await load();
      show("Deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  async function move(item, delta) {
    const siblings = (item.parent_id
      ? here.filter((r) => r.parent_id === item.parent_id)
      : here.filter((r) => !r.parent_id)
    ).slice().sort((a, b) => a.sort_order - b.sort_order);

    const i = siblings.findIndex((s) => s.id === item.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    siblings.splice(j, 0, siblings.splice(i, 1)[0]);

    /* Paint the new order straight away and reconcile from the server after:
       the reorder is one request, and waiting for it makes each click feel
       like it did nothing. */
    const moved = new Map(siblings.map((s, k) => [s.id, k]));
    setRows((prev) => prev.map((r) => (moved.has(r.id) ? { ...r, sort_order: moved.get(r.id) } : r)));

    try {
      await reorderNav(siblings);
    } catch (err) {
      show(err.message || "Could not reorder.", false);
      load();
    }
  }

  const parentOptions = here.filter((r) => !r.parent_id);

  return (
    <>
      <Panel
        title="Menu"
        actions={
          <div className="panel-actions">
            <Segment value={location} onChange={setLocation} options={LOCATIONS} />
            <button type="button" className="btn" onClick={() => startNew("")}>
              <Icon name="plus" width="15" height="15" /> Section
            </button>
          </div>
        }
      >
        <p className="panel-note">
          This is the drawer on the storefront. Changes go live for visitors within
          ten minutes, or immediately on a hard refresh. An item with no link shows
          as plain text — use that for a section whose page is not built yet.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={6} />
        ) : !tree.length ? (
          <Empty icon="menu" title="Nothing in this menu">
            Add a section, or run the seed migration to bring in the menu the site
            already ships with.
          </Empty>
        ) : (
          <div className="nav-tree">
            {tree.map((sec, i) => (
              <div className="nav-group" key={sec.id}>
                <Row
                  item={sec} depth={0}
                  first={i === 0} last={i === tree.length - 1}
                  onEdit={startEdit} onDelete={remove} onMove={move}
                />
                {sec.children.map((child, k) => (
                  <Row
                    key={child.id} item={child} depth={1}
                    first={k === 0} last={k === sec.children.length - 1}
                    onEdit={startEdit} onDelete={remove} onMove={move}
                  />
                ))}
                {location === "primary" ? (
                  <button type="button" className="nav-add" onClick={() => startNew(sec.id)}>
                    <Icon name="plus" width="13" height="13" /> Add inside {sec.label}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={editing ? `Edit “${editing.label}”` : "New menu item"}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Label
            <input value={form.label} required
                   onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </label>

          <label>
            Link
            <input value={form.href} placeholder="fine-jewellery/ or fine-jewellery/#/bloom"
                   disabled={form.is_heading}
                   onChange={(e) => setForm({ ...form, href: e.target.value })} />
            <small>
              Relative to the site root, with a trailing slash. Leave empty for a
              section that has no page yet.
            </small>
          </label>

          <label>
            Inside
            <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Top level</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="check">
            <input type="checkbox" checked={form.is_heading}
                   onChange={(e) => setForm({ ...form, is_heading: e.target.checked })} />
            Heading — a label inside a panel, not a link
          </label>

          <label className="check">
            <input type="checkbox" checked={form.published}
                   onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Visible on the site
          </label>

          <div className="form-actions">
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Saving…" : editing ? "Save changes" : "Add item"}
            </button>
            {editing ? (
              <button type="button" className="btn" onClick={() => { setEditing(null); setForm(blank); }}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
