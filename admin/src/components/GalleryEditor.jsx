/* The photographs on a High Jewellery product, and where each one is cropped.
 *
 * Two lists, because the storefront uses them for different things: `gallery`
 * is the stills that fill the product carousel, `models` is the editorial
 * frames in the rows beneath the spec strip. Order is the order they appear.
 *
 * The focal point is the one field here that is not obvious. On a phone the
 * carousel crops every frame to a square, and the pieces are worn at the ear,
 * the throat and the wrist — so a single crop position framed one photograph
 * and cut the necklace off the next. Each image carries its own percentage,
 * and the slider shows the crop it produces rather than asking anyone to
 * imagine it.
 */
import { useState } from "react";
import { Icon } from "./ui.jsx";
import MediaPicker from "./MediaPicker.jsx";

function List({ title, note, items, focal, onChange, onFocal, storefront }) {
  const [picking, setPicking] = useState(false);
  const [raw, setRaw] = useState("");

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    next.splice(j, 0, next.splice(i, 1)[0]);
    onChange(next);
  }

  function add(url) {
    const v = (url || "").trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setRaw("");
  }

  return (
    <div className="gal-list">
      <div className="lines-head">
        <span>{title}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicking(true)}>
          Choose…
        </button>
      </div>
      <p className="panel-note">{note}</p>

      <div className="field-row">
        <input value={raw} placeholder="img/pieces/weaver/p1.webp"
               onChange={(e) => setRaw(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(raw); } }} />
        <button type="button" className="btn btn--ghost" onClick={() => add(raw)}>Add</button>
      </div>

      {!items.length ? <p className="panel-note">Nothing yet.</p> : null}

      {items.map((src, i) => (
        <div className="gal-item" key={src + i}>
          <div className="gal-thumb">
            {/* the preview crops exactly as the phone does, so the slider is
                showing the real result rather than an approximation */}
            <img src={storefront + src} alt=""
                 style={onFocal ? { objectPosition: `center ${focal[src] ?? 60}%` } : undefined} />
          </div>
          <div className="gal-body">
            <span className="gal-path" title={src}>{src}</span>
            {onFocal ? (
              <label className="gal-focal">
                <span>Crop {focal[src] ?? 60}%</span>
                <input type="range" min="0" max="100" value={focal[src] ?? 60}
                       onChange={(e) => onFocal(src, Number(e.target.value))} />
              </label>
            ) : null}
          </div>
          <div className="nav-row-acts">
            <button type="button" className="icon-btn" disabled={i === 0}
                    onClick={() => move(i, -1)} aria-label="Move up">
              <Icon name="arrowUp" width="15" height="15" />
            </button>
            <button type="button" className="icon-btn" disabled={i === items.length - 1}
                    onClick={() => move(i, 1)} aria-label="Move down">
              <Icon name="arrowDown" width="15" height="15" />
            </button>
            <button type="button" className="icon-btn icon-btn--danger"
                    onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label="Remove">
              <Icon name="trash" width="15" height="15" />
            </button>
          </div>
        </div>
      ))}

      {picking ? (
        <MediaPicker folder="products"
                     onPick={(m) => { add(m.url); setPicking(false); }}
                     onClose={() => setPicking(false)} />
      ) : null}
    </div>
  );
}

export default function GalleryEditor({ gallery, models, focal, onChange, storefront = "/" }) {
  return (
    <div className="gal-editor full">
      <List
        title="Gallery"
        note="The stills in the product carousel, in order. The first is the one the page opens on."
        items={gallery} focal={focal} storefront={storefront}
        onChange={(v) => onChange({ gallery: v, models, focal })}
        onFocal={(src, v) => onChange({ gallery, models, focal: { ...focal, [src]: v } })}
      />
      <List
        title="Editorial frames"
        note="The piece on the model, shown in the rows under the spec strip. Up to four are used; a piece with none simply has no rows."
        items={models} focal={focal} storefront={storefront}
        onChange={(v) => onChange({ gallery, models: v, focal })}
      />
    </div>
  );
}
