/* A modal for choosing an image from the library, or uploading one on the spot.
 *
 * Used wherever a field holds an image path — the office cards, the product
 * gallery — so that a URL never has to be typed by hand.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, Skeleton, Empty, Search } from "./ui.jsx";
import { listMedia, uploadMedia } from "../lib/content.js";

export default function MediaPicker({ onPick, onClose, folder = "general" }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setRows(await listMedia({ q }));
      setError("");
    } catch (e) {
      setError(e.message || "Could not load the library.");
      setRows([]);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);

  /* Escape closes, and the listener is on the document so it works wherever
     focus happens to be inside the modal. */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(list) {
    const files = Array.from(list || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const first = await uploadMedia(files[0], { folder });
      await load();
      /* Uploading here is almost always "I want this one", so hand it straight
         back rather than making the picking a second step. */
      onPick(first);
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Choose an image">
        <div className="modal-head">
          <h2>Choose an image</h2>
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search…" />
            <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? "Uploading…" : "Upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
                   onChange={(e) => upload(e.target.files)} />
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="x" width="16" height="16" />
            </button>
          </div>
        </div>

        {error ? <p className="err">{error}</p> : null}

        <div className="modal-body">
          {rows === null ? (
            <Skeleton rows={3} />
          ) : !rows.length ? (
            <Empty icon="inbox" title="Nothing here yet">
              Upload an image to use it.
            </Empty>
          ) : (
            <div className="media-grid media-grid--pick">
              {rows.map((m) => (
                <button type="button" className="media-tile media-tile--pick" key={m.id}
                        onClick={() => onPick(m)}>
                  <div className="media-shot">
                    <img src={m.url} alt={m.alt || ""} loading="lazy" />
                  </div>
                  <span className="media-name">{m.path.split("/").pop()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
