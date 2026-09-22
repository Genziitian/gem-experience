/* The "Or write directly" block on the Contact page.
 *
 * Stored as one settings row rather than a table: it is a handful of lines
 * that are always read and written together, and a row per phone number would
 * buy nothing but joins.
 */
import { useEffect, useState } from "react";
import { Panel, Skeleton, Icon, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readSetting, writeSetting } from "../lib/content.js";

const EMPTY = { lede: "", email: "", hours: "", lines: [] };

export default function Contact() {
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  useEffect(() => {
    readSetting("contact", EMPTY)
      .then((v) => setValue({ ...EMPTY, ...v, lines: Array.isArray(v.lines) ? v.lines : [] }))
      .catch((e) => { setError(e.message || "Could not load contact details."); setValue(EMPTY); });
  }, []);

  function setLine(i, patch) {
    setValue((v) => ({ ...v, lines: v.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) }));
  }

  function addLine() {
    setValue((v) => ({ ...v, lines: [...v.lines, { region: "", value: "", href: "" }] }));
  }

  function removeLine(i) {
    setValue((v) => ({ ...v, lines: v.lines.filter((_, k) => k !== i) }));
  }

  function moveLine(i, delta) {
    const j = i + delta;
    setValue((v) => {
      if (j < 0 || j >= v.lines.length) return v;
      const lines = v.lines.slice();
      lines.splice(j, 0, lines.splice(i, 1)[0]);
      return { ...v, lines };
    });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      /* Drop rows the editor left blank rather than publishing an empty line
         with a dangling link. */
      const lines = value.lines
        .map((l) => ({
          region: (l.region || "").trim(),
          value: (l.value || "").trim(),
          href: (l.href || "").trim(),
        }))
        .filter((l) => l.region || l.value);
      await writeSetting("contact", { ...value, lines });
      setValue((v) => ({ ...v, lines }));
      show("Contact details saved. Live on the site within ten minutes.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  if (value === null) return <Panel title="Contact"><Skeleton rows={5} /></Panel>;

  return (
    <>
      <Panel title="Contact details">
        <p className="panel-note">
          The list under “Or write directly” on the Contact page. A link starting
          with http opens in a new tab; a <code>tel:</code> or <code>mailto:</code> does not.
          Leave the link empty to show the value as plain text.
        </p>

        {error ? <p className="err">{error}</p> : null}

        <form className="form-grid" onSubmit={save}>
          <label>
            Email
            <input type="email" value={value.email}
                   onChange={(e) => setValue({ ...value, email: e.target.value })} />
            <small>Appended to the list as its own line. Leave empty to omit it.</small>
          </label>

          <label>
            Hours
            <input value={value.hours} placeholder="Monday to Saturday, 9am – 7pm"
                   onChange={(e) => setValue({ ...value, hours: e.target.value })} />
          </label>

          <div className="lines">
            <div className="lines-head">
              <span>Numbers</span>
              <button type="button" className="btn" onClick={addLine}>
                <Icon name="plus" width="14" height="14" /> Add
              </button>
            </div>

            {!value.lines.length ? (
              <p className="panel-note">No numbers yet. The site keeps showing the ones it ships with until you add some.</p>
            ) : null}

            {value.lines.map((l, i) => (
              <div className="line-row" key={i}>
                <input value={l.region} placeholder="India"
                       onChange={(e) => setLine(i, { region: e.target.value })} />
                <input value={l.value} placeholder="+91 73000 43093"
                       onChange={(e) => setLine(i, { value: e.target.value })} />
                <input value={l.href} placeholder="https://wa.me/917300043093"
                       onChange={(e) => setLine(i, { href: e.target.value })} />
                <div className="nav-row-acts">
                  <button type="button" className="icon-btn" disabled={i === 0}
                          onClick={() => moveLine(i, -1)} aria-label="Move up">
                    <Icon name="arrowUp" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" disabled={i === value.lines.length - 1}
                          onClick={() => moveLine(i, 1)} aria-label="Move down">
                    <Icon name="arrowDown" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger"
                          onClick={() => removeLine(i)} aria-label="Remove">
                    <Icon name="trash" width="15" height="15" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save contact details"}
            </button>
          </div>
        </form>
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
