/* The journal at /blog/.
 *
 * A list of every post, and an editor for one. Bodies are written in light
 * Markdown and previewed with the storefront's own renderer, so the preview is
 * the page. A post is live when it is published and its date has passed:
 * publishing with a future date schedules it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Segment, Search, Pill } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { readPosts, savePost, deletePost, slugify } from "../lib/content.js";
import { renderMarkdown, markdownText, markdownHeadings } from "../lib/markdown.js";
import { formatDateTime } from "../lib/format.js";
import MediaPicker from "../components/MediaPicker.jsx";

/* In production the admin is served from the storefront's own origin. In dev
   it runs on Vite's port and the storefront on `npm run dev:frontend`, which
   has no rewrites — so articles are addressed through the template there. */
const DEV = typeof location !== "undefined" && location.port === "5173";
function siteUrl(slug) {
  return DEV
    ? `http://localhost:8000/blog/post/?p=${encodeURIComponent(slug)}`
    : `/blog/${encodeURIComponent(slug)}/`;
}

const blank = {
  title: "", slug: "", excerpt: "", body: "", cover_image: "", cover_alt: "",
  author: "", tags: "", seo_title: "", seo_description: "", published: false, published_at: "",
};

function statusOf(p) {
  if (!p.published) return "draft";
  if (p.published_at && new Date(p.published_at) > new Date()) return "scheduled";
  return "published";
}

/* datetime-local wants local wall-clock time with no zone; the database
   stores an instant. */
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromRow(p) {
  return {
    ...blank,
    ...p,
    excerpt: p.excerpt || "",
    cover_image: p.cover_image || "",
    cover_alt: p.cover_alt || "",
    author: p.author || "",
    tags: (p.tags || []).join(", "),
    seo_title: p.seo_title || "",
    seo_description: p.seo_description || "",
    published_at: toLocalInput(p.published_at),
  };
}

function words(body) {
  const t = markdownText(body);
  return t ? t.split(/\s+/).length : 0;
}

export default function Blog() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);   // null = list; {} = new; row = existing
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRows(await readPosts());
      setError("");
    } catch (e) {
      setError(e.message || "Could not load posts. Has the faqs_blog migration been run?");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const n = { all: 0, published: 0, scheduled: 0, draft: 0 };
    (rows || []).forEach((p) => { n.all++; n[statusOf(p)]++; });
    return n;
  }, [rows]);

  const shown = (rows || [])
    .filter((p) => status === "all" || statusOf(p) === status)
    .filter((p) => !q || `${p.title} ${(p.tags || []).join(" ")} ${p.author || ""}`.toLowerCase().includes(q.toLowerCase()));

  async function remove(p) {
    if (!window.confirm(`Delete “${p.title}”? If it is live, its link stops working. This cannot be undone.`)) return;
    try {
      await deletePost(p.id);
      await load();
      show("Post deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  if (editing) {
    return (
      <>
        <Editor
          post={editing}
          taken={(rows || []).filter((r) => r.id !== editing.id).map((r) => r.slug)}
          onClose={() => setEditing(null)}
          onSaved={async (msg, stay) => {
            await load();
            show(msg);
            if (!stay) setEditing(null);
          }}
          onError={(msg) => show(msg, false)}
        />
        <Toast toast={toast} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <>
      <Panel
        title="Journal posts"
        actions={
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search posts…" />
            <Segment value={status} onChange={setStatus} options={[
              { value: "all", label: `All (${counts.all})` },
              { value: "published", label: `Live (${counts.published})` },
              { value: "scheduled", label: `Scheduled (${counts.scheduled})` },
              { value: "draft", label: `Drafts (${counts.draft})` },
            ]} />
            <button type="button" className="btn" onClick={() => setEditing({})}>
              <Icon name="plus" /> New post
            </button>
          </div>
        }
      >
        <p className="panel-note">
          Live posts appear on <code>/blog/</code>, newest first, and in site search. Drafts are
          visible only here.
        </p>

        {error ? <p className="err">{error}</p> : null}

        {rows === null ? (
          <Skeleton rows={5} />
        ) : !shown.length ? (
          <Empty icon="blog" title={rows.length ? "No posts match" : "No posts yet"}>
            {rows.length ? "Try another filter." : "Write the first one with New post."}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 64 }} />
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Updated</th>
                  <th style={{ width: 110 }} />
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => {
                  const st = statusOf(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="office-thumb blog-thumb">
                          {p.cover_image ? <img src={p.cover_image} alt="" loading="lazy" /> : <Icon name="blog" width="16" height="16" />}
                        </div>
                      </td>
                      <td>
                        <button type="button" className="link-btn" onClick={() => setEditing(p)}>
                          <strong>{p.title}</strong>
                        </button>
                        <div className="cell-sub">
                          /blog/{p.slug}/{p.tags?.length ? ` · ${p.tags.join(", ")}` : ""}
                        </div>
                      </td>
                      <td><Pill value={st} /></td>
                      <td className="cell-sub">{p.published_at ? formatDateTime(p.published_at) : "—"}</td>
                      <td className="cell-sub">{formatDateTime(p.updated_at || p.created_at)}</td>
                      <td>
                        <div className="nav-row-acts">
                          {st === "published" ? (
                            <a className="icon-btn" href={siteUrl(p.slug)} target="_blank" rel="noreferrer"
                               aria-label="View on site" title="View on site">
                              <Icon name="external" width="15" height="15" />
                            </a>
                          ) : null}
                          <button type="button" className="icon-btn" onClick={() => setEditing(p)} aria-label="Edit">
                            <Icon name="edit" width="15" height="15" />
                          </button>
                          <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(p)} aria-label="Delete">
                            <Icon name="trash" width="15" height="15" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}

/* ------------------------------------------------------------------ editor */

function Editor({ post, taken, onClose, onSaved, onError }) {
  const isNew = !post.id;
  const [form, setForm] = useState(() => (isNew ? blank : fromRow(post)));
  const [id, setId] = useState(post.id || null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tab, setTab] = useState("write");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(null);     // "cover" | "body" | null
  const saved = useRef(JSON.stringify(isNew ? blank : fromRow(post)));
  const bodyRef = useRef(null);

  const dirty = JSON.stringify(form) !== saved.current;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /* a warning before the tab closes with unsaved work */
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  function close() {
    if (dirty && !window.confirm("Leave without saving your changes?")) return;
    onClose();
  }

  const slug = slugify(form.slug || form.title);
  const slugClash = slug && taken.includes(slug);
  const heads = markdownHeadings(form.body).filter((h) => h.level === 2);
  const wordCount = words(form.body);
  const seoTitle = form.seo_title || form.title;
  const seoDesc = form.seo_description || form.excerpt || markdownText(form.body).slice(0, 160);

  async function save(publish) {
    setBusy(true);
    try {
      const next = publish === undefined ? form : { ...form, published: publish };
      /* Publishing with no date means now. The date is written into the form
         as well, so the next save keeps it instead of stamping a newer one and
         moving the post back to the top of the journal. */
      if (next.published && !next.published_at) next.published_at = toLocalInput(new Date().toISOString());
      const newId = await savePost({ ...next, id });
      setId(newId);
      const clean = { ...next, slug };
      setForm(clean);
      saved.current = JSON.stringify(clean);
      const msg = publish === true
        ? (next.published_at && new Date(next.published_at) > new Date() ? "Scheduled." : "Published.")
        : publish === false ? "Moved back to drafts." : "Saved.";
      await onSaved(msg, true);
    } catch (err) {
      onError(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  /* Puts an image line where the cursor is, on a line of its own so the
     renderer makes it a figure with its caption. */
  function insertImage(m) {
    const el = bodyRef.current;
    const alt = m.alt || "";
    const snippet = `\n\n![${alt}](${m.url})\n\n`;
    const at = el ? el.selectionStart : form.body.length;
    const body = form.body.slice(0, at) + snippet + form.body.slice(at);
    set({ body: body.replace(/\n{3,}/g, "\n\n") });
    setTab("write");
  }

  /* Wraps the selection, or inserts a placeholder, for the toolbar buttons. */
  function wrap(before, after, placeholder) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = form.body.slice(a, b) || placeholder;
    const body = form.body.slice(0, a) + before + sel + after + form.body.slice(b);
    set({ body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, a + before.length + sel.length);
    });
  }

  function linePrefix(prefix) {
    const el = bodyRef.current;
    if (!el) return;
    const a = el.selectionStart;
    const start = form.body.lastIndexOf("\n", a - 1) + 1;
    const body = form.body.slice(0, start) + prefix + form.body.slice(start);
    set({ body });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + prefix.length, a + prefix.length); });
  }

  const st = statusOf({ ...form, published_at: form.published_at || null });

  return (
    <>
      <div className="blog-editor-bar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={close}>
          <Icon name="arrowLeft" /> All posts
        </button>
        <span className="blog-editor-state">
          <Pill value={st} />
          {dirty ? <span className="cell-sub">Unsaved changes</span> : id ? <span className="cell-sub">All changes saved</span> : null}
        </span>
        <span style={{ flex: 1 }} />
        {id && st === "published" && !dirty ? (
          <a className="btn btn--ghost btn--sm" href={siteUrl(slug)} target="_blank" rel="noreferrer">
            <Icon name="external" /> View on site
          </a>
        ) : null}
        <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => save()}>
          {form.published ? "Save" : "Save draft"}
        </button>
        {form.published ? (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => save(false)}>
            Unpublish
          </button>
        ) : (
          <button type="button" className="btn btn--sm" disabled={busy || !form.title.trim() || slugClash} onClick={() => save(true)}>
            {form.published_at && new Date(form.published_at) > new Date() ? "Schedule" : "Publish"}
          </button>
        )}
      </div>

      <div className="blog-editor">
        <div className="blog-editor-main">
          <Panel>
            <div className="form-grid">
              <label className="full">
                Title
                <input className="blog-title-input" value={form.title} required maxLength={160}
                       placeholder="The stone that was mistaken for a ruby"
                       onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
              </label>

              <label className="full">
                Address
                <div className="field-row">
                  <span className="cell-sub">/blog/</span>
                  <input value={form.slug} placeholder="the-stone-mistaken-for-a-ruby"
                         onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }}
                         onBlur={() => set({ slug: slugify(form.slug) })} />
                  <span className="cell-sub">/</span>
                </div>
                {slugClash ? <small className="err">Another post already uses this address.</small>
                  : <small className="muted">Changing it after publishing breaks links to the old address.</small>}
              </label>

              <label className="full">
                Excerpt
                <textarea rows={2} value={form.excerpt} maxLength={300}
                          placeholder="One or two sentences. Shown under the title and on the journal's cards."
                          onChange={(e) => set({ excerpt: e.target.value })} />
              </label>
            </div>
          </Panel>

          <Panel
            title="Story"
            actions={
              <div className="panel-actions">
                <span className="cell-sub">{wordCount} words · {Math.max(1, Math.round(wordCount / 220))} min read</span>
                <Segment value={tab} onChange={setTab} options={[
                  { value: "write", label: "Write" },
                  { value: "preview", label: "Preview" },
                ]} />
              </div>
            }
          >
            {tab === "write" ? (
              <>
                <div className="md-toolbar" role="toolbar" aria-label="Formatting">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => linePrefix("## ")} title="Section heading">H2</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => linePrefix("### ")} title="Sub-heading">H3</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => wrap("**", "**", "bold text")} title="Bold"><strong>B</strong></button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => wrap("*", "*", "italic text")} title="Italic"><em>I</em></button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => wrap("[", "](/high-jewellery/)", "link text")} title="Link">Link</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => linePrefix("- ")} title="Bulleted list">• List</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => linePrefix("> ")} title="Pull quote">Quote</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicking("body")} title="Insert image">
                    <Icon name="image" /> Image
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  className="blog-body-input"
                  value={form.body}
                  onChange={(e) => set({ body: e.target.value })}
                  placeholder={"Start writing.\n\n## A section heading\n\nParagraphs are separated by a blank line. **Bold**, *italic* and [links](/high-jewellery/) work.\n\n> A pull quote.\n\n- A list\n- of things"}
                />
                <small className="muted">
                  Section headings (##) build the contents list at the top of the article once there are
                  three or more, and give search and answer engines the shape of the story.
                </small>
              </>
            ) : form.body.trim() ? (
              <div className="md-preview md-preview--post">
                <h1>{form.title || "Untitled"}</h1>
                {form.excerpt ? <p className="md-preview-lede">{form.excerpt}</p> : null}
                {form.cover_image ? <img className="md-preview-cover" src={form.cover_image} alt={form.cover_alt} /> : null}
                {heads.length >= 3 ? (
                  <ol className="md-preview-toc">{heads.map((h) => <li key={h.id}>{h.text}</li>)}</ol>
                ) : null}
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(form.body) }} />
              </div>
            ) : (
              <Empty icon="blog" title="Nothing to preview yet">Write something first.</Empty>
            )}
          </Panel>
        </div>

        <aside className="blog-editor-side">
          <Panel title="Publishing">
            <div className="form-grid blog-side-grid">
              <label className="full">
                Date
                <input type="datetime-local" value={form.published_at}
                       onChange={(e) => set({ published_at: e.target.value })} />
                <small className="muted">
                  Leave empty to use the moment you publish. A future date schedules the post.
                </small>
              </label>
              <label className="full">
                Author
                <input value={form.author} placeholder="Gem Experience"
                       onChange={(e) => set({ author: e.target.value })} />
              </label>
              <label className="full">
                Topics
                <input value={form.tags} placeholder="Tanzanite, Craftsmanship"
                       onChange={(e) => set({ tags: e.target.value })} />
                <small className="muted">Comma separated. The first is shown on the card; all become filters on the journal.</small>
              </label>
            </div>
          </Panel>

          <Panel title="Cover image">
            <div className="blog-cover">
              {form.cover_image ? <img src={form.cover_image} alt="" /> : <Icon name="image" width="22" height="22" />}
            </div>
            <div className="form-grid blog-side-grid">
              <div className="form-actions full">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicking("cover")}>
                  {form.cover_image ? "Change…" : "Choose…"}
                </button>
                {form.cover_image ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ cover_image: "", cover_alt: "" })}>
                    Remove
                  </button>
                ) : null}
              </div>
              <label className="full">
                Describe the image
                <input value={form.cover_alt} placeholder="Rough tanzanite on a workbench"
                       onChange={(e) => set({ cover_alt: e.target.value })} />
                <small className="muted">Read aloud to people using screen readers, and by search engines.</small>
              </label>
            </div>
          </Panel>

          <Panel title="Search appearance">
            <div className="form-grid blog-side-grid">
              <label className="full">
                Title for search
                <input value={form.seo_title} maxLength={70} placeholder={form.title || "Defaults to the title"}
                       onChange={(e) => set({ seo_title: e.target.value })} />
                <small className="muted">{seoTitle.length}/60 recommended</small>
              </label>
              <label className="full">
                Description for search
                <textarea rows={3} value={form.seo_description} maxLength={200}
                          placeholder="Defaults to the excerpt"
                          onChange={(e) => set({ seo_description: e.target.value })} />
                <small className="muted">{seoDesc.length}/155 recommended</small>
              </label>
            </div>
            <div className="serp">
              <span className="serp-url">/blog/{slug || "…"}/</span>
              <span className="serp-title">{(seoTitle || "Untitled") + " — Gem Experience"}</span>
              <span className="serp-desc">{seoDesc.length > 158 ? seoDesc.slice(0, 155) + "…" : seoDesc || "—"}</span>
            </div>
          </Panel>
        </aside>
      </div>

      {picking ? (
        <MediaPicker
          folder="blog"
          onPick={(m) => {
            if (picking === "cover") set({ cover_image: m.url, cover_alt: form.cover_alt || m.alt || "" });
            else insertImage(m);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </>
  );
}
