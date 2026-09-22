/* Uploads, and the library that lists them.
 *
 * Files go to the `media` storage bucket and a row lands in `media` so the
 * library can be listed and searched without paging the storage API, and so
 * alt text has somewhere to live.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Search } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { listMedia, uploadMedia, deleteMedia } from "../lib/content.js";
import { bytes as fmtBytes } from "../lib/format.js";

const FOLDERS = ["general", "offices", "products", "editorial"];

export default function Media() {
  const [rows, setRows] = useState(null);
  const [folder, setFolder] = useState("general");
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await listMedia({ folder, q }));
      setError("");
    } catch (e) {
      setError(e.message || "Could not load media.");
      setRows([]);
    }
  }, [folder, q]);

  useEffect(() => { load(); }, [load]);

  async function onFiles(list) {
    const files = Array.from(list || []);
    if (!files.length) return;
    setQueue(files.map((f) => ({ name: f.name, state: "waiting" })));

    /* One at a time. A dozen parallel uploads of 20MB photographs saturate the
       connection and the progress list stops meaning anything; sequential is
       slower in theory and clearer in practice. */
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setQueue((qq) => qq.map((x, k) => (k === i ? { ...x, state: "uploading" } : x)));
      try {
        await uploadMedia(files[i], { folder });
        ok++;
        setQueue((qq) => qq.map((x, k) => (k === i ? { ...x, state: "done" } : x)));
      } catch (e) {
        setQueue((qq) => qq.map((x, k) => (k === i ? { ...x, state: "failed", error: e.message } : x)));
      }
    }
    await load();
    show(`${ok} of ${files.length} uploaded.`, ok === files.length);
    setTimeout(() => setQueue([]), 4000);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove(m) {
    if (!window.confirm(`Delete ${m.path}? Anything still pointing at it will break.`)) return;
    try {
      await deleteMedia(m);
      await load();
      show("Deleted.");
    } catch (e) {
      show(e.message || "Could not delete.", false);
    }
  }

  function copy(url) {
    navigator.clipboard?.writeText(url)
      .then(() => show("URL copied."))
      .catch(() => show("Could not copy.", false));
  }

  return (
    <>
      <Panel
        title="Media"
        actions={
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search files…" />
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="plus" width="15" height="15" /> Upload
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden
                   onChange={(e) => onFiles(e.target.files)} />
          </div>
        }
      >
        <p className="panel-note">
          Uploads land in the <code>{folder}</code> folder of the media bucket. The
          storefront's own photography stays in the repository — this is for images
          added from here, such as an office card.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {queue.length ? (
          <ul className="upload-queue">
            {queue.map((x, i) => (
              <li key={i} className={`upload-${x.state}`}>
                <span>{x.name}</span>
                <span>{x.state === "failed" ? x.error || "failed" : x.state}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {rows === null ? (
          <Skeleton rows={4} />
        ) : !rows.length ? (
          <Empty icon="inbox" title="Nothing in this folder">
            Upload an image and it will appear here, ready to pick from the office
            and product editors.
          </Empty>
        ) : (
          <div className="media-grid">
            {rows.map((m) => (
              <figure className="media-tile" key={m.id}>
                <div className="media-shot">
                  {/^image\//.test(m.mime || "") ? <img src={m.url} alt={m.alt || ""} loading="lazy" /> : <Icon name="inbox" />}
                </div>
                <figcaption>
                  <span className="media-name" title={m.path}>{m.path.split("/").pop()}</span>
                  <span className="media-meta">
                    {m.width ? `${m.width}x${m.height}` : "—"} · {fmtBytes(m.bytes)}
                  </span>
                  <span className="media-acts">
                    <button type="button" className="icon-btn" onClick={() => copy(m.url)} aria-label="Copy URL">
                      <Icon name="download" width="14" height="14" />
                    </button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(m)} aria-label="Delete">
                      <Icon name="trash" width="14" height="14" />
                    </button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
