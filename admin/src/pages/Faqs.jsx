/* The questions on /faqs/, and the ones embedded on the collection pages.
 *
 * Every category is its own list. Fine Jewellery's questions are drawn on the
 * Fine Jewellery page and Gifts' on the Gifts page; all of them appear on
 * /faqs/ under their category. Answers are written in the same light Markdown
 * as the journal, and previewed with the storefront's own renderer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, Empty, Skeleton, Icon, Toast, Segment, Search, Pill } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import {
  readFaqCategories, saveFaqCategory, deleteFaqCategory, reorderFaqCategories,
  readFaqs, saveFaq, deleteFaq, reorderFaqs, slugify,
} from "../lib/content.js";
import { renderMarkdown } from "../lib/markdown.js";

/* Where a category's questions show besides /faqs/. Only the pages that embed
   a category are listed; a new category appears on /faqs/ alone until a page
   is built to embed it. */
const EMBEDDED_ON = {
  "fine-jewellery": "the Fine Jewellery page",
  gifts: "the Gifts page",
};

const blankFaq = { category: "", question: "", answer: "", published: true };
const blankCat = { label: "", slug: "", intro: "", published: true };

export default function Faqs() {
  const [cats, setCats] = useState(null);
  const [faqs, setFaqs] = useState(null);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(blankFaq);
  const [editing, setEditing] = useState(null);
  const [catForm, setCatForm] = useState(blankCat);
  const [editingCat, setEditingCat] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      const [c, f] = await Promise.all([readFaqCategories(), readFaqs()]);
      setCats(c);
      setFaqs(f);
      setError("");
      setCat((cur) => (cur && c.some((x) => x.slug === cur) ? cur : c[0]?.slug || ""));
    } catch (e) {
      setError(e.message || "Could not load FAQs. Has the faqs_blog migration been run?");
      setCats([]);
      setFaqs([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* a new question goes into whichever category is open */
  useEffect(() => {
    if (!editing) setForm((f) => ({ ...f, category: cat }));
  }, [cat, editing]);

  const sortedCats = useMemo(
    () => (cats || []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [cats],
  );

  const here = (faqs || [])
    .filter((f) => f.category === cat)
    .filter((f) => !q || `${f.question} ${f.answer}`.toLowerCase().includes(q.toLowerCase()))
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const counts = useMemo(() => {
    const n = {};
    (faqs || []).forEach((f) => { n[f.category] = (n[f.category] || 0) + 1; });
    return n;
  }, [faqs]);

  const current = sortedCats.find((c) => c.slug === cat);

  /* --------------------------------------------------------- questions */

  function startEdit(f) {
    setEditing(f);
    setForm({ ...blankFaq, ...f });
    document.getElementById("faq-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...blankFaq, category: cat });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const siblings = (faqs || []).filter((f) => f.category === form.category);
      const moved = editing && editing.category !== form.category;
      await saveFaq({
        ...form,
        id: editing?.id,
        /* a question moved to another category goes to the end of that list */
        sort_order: editing && !moved ? editing.sort_order : siblings.length,
      });
      await load();
      setCat(form.category);
      setEditing(null);
      setForm({ ...blankFaq, category: form.category });
      show(editing ? "Question updated." : "Question added.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f) {
    if (!window.confirm(`Delete “${f.question}”? It comes off the site straight away.`)) return;
    try {
      await deleteFaq(f.id);
      if (editing?.id === f.id) cancelEdit();
      await load();
      show("Deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  async function togglePublished(f) {
    try {
      await saveFaq({ ...f, published: !f.published });
      await load();
      show(f.published ? "Hidden from the site." : "Visible on the site.");
    } catch (err) {
      show(err.message || "Could not save.", false);
    }
  }

  async function move(f, delta) {
    const list = here.slice();
    const i = list.findIndex((x) => x.id === f.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]);
    const order = new Map(list.map((x, k) => [x.id, k]));
    setFaqs((prev) => prev.map((r) => (order.has(r.id) ? { ...r, sort_order: order.get(r.id) } : r)));
    try {
      await reorderFaqs(list);
    } catch (err) {
      show(err.message || "Could not reorder.", false);
      load();
    }
  }

  /* -------------------------------------------------------- categories */

  function startCatEdit(c) {
    setEditingCat(c);
    setCatForm({ ...blankCat, ...c, intro: c.intro || "" });
    setSlugTouched(true);
  }

  function cancelCatEdit() {
    setEditingCat(null);
    setCatForm(blankCat);
    setSlugTouched(false);
  }

  async function submitCat(e) {
    e.preventDefault();
    if (editingCat && editingCat.slug !== slugify(catForm.slug) &&
        !window.confirm("Changing the slug changes the link to this category (/faqs/#…). Pages that embed it by its old slug will stop showing it. Continue?")) {
      return;
    }
    setBusy(true);
    try {
      const slug = await saveFaqCategory(
        { ...catForm, sort_order: editingCat ? editingCat.sort_order : sortedCats.length },
        editingCat?.slug,
      );
      await load();
      setCat(slug);
      cancelCatEdit();
      show(editingCat ? "Category updated." : "Category added.");
    } catch (err) {
      show(err.code === "23505" ? "A category with that slug already exists." : err.message || "Could not save.", false);
    } finally {
      setBusy(false);
    }
  }

  async function removeCat(c) {
    const n = counts[c.slug] || 0;
    if (!window.confirm(`Delete the “${c.label}” category${n ? ` and its ${n} question${n === 1 ? "" : "s"}` : ""}? This cannot be undone.`)) return;
    try {
      await deleteFaqCategory(c.slug);
      if (editingCat?.slug === c.slug) cancelCatEdit();
      await load();
      show("Category deleted.");
    } catch (err) {
      show(err.message || "Could not delete.", false);
    }
  }

  async function moveCat(c, delta) {
    const list = sortedCats.slice();
    const i = list.findIndex((x) => x.slug === c.slug);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    list.splice(j, 0, list.splice(i, 1)[0]);
    const order = new Map(list.map((x, k) => [x.slug, k]));
    setCats((prev) => prev.map((r) => ({ ...r, sort_order: order.get(r.slug) ?? r.sort_order })));
    try {
      await reorderFaqCategories(list);
    } catch (err) {
      show(err.message || "Could not reorder.", false);
      load();
    }
  }

  const loading = cats === null || faqs === null;

  return (
    <>
      <Panel
        title="Questions"
        actions={
          <div className="panel-actions">
            <Search value={q} onChange={setQ} placeholder="Search questions…" />
            {sortedCats.length ? (
              <Segment
                value={cat}
                onChange={(c) => { setCat(c); if (!editing) setForm({ ...blankFaq, category: c }); }}
                options={sortedCats.map((c) => ({ value: c.slug, label: `${c.label} (${counts[c.slug] || 0})` }))}
              />
            ) : null}
          </div>
        }
      >
        <p className="panel-note">
          {current ? (
            <>
              These appear on <code>/faqs/#{current.slug}</code>
              {EMBEDDED_ON[current.slug] ? <> and on {EMBEDDED_ON[current.slug]}</> : null}, in this order.
              {current.published ? "" : " This category is hidden, so none of them show."}
            </>
          ) : "Questions are grouped by category. Add a category below to begin."}
        </p>

        {error ? <p className="err">{error}</p> : null}

        {loading ? (
          <Skeleton rows={5} />
        ) : !here.length ? (
          <Empty icon="help" title={q ? "No questions match" : "No questions here yet"}>
            {q ? "Try another word." : "Add the first one below."}
          </Empty>
        ) : (
          <div className="office-list">
            {here.map((f, i) => (
              <div className={`office-row faq-row ${f.published ? "" : "is-off"}`} key={f.id}>
                <div className="office-main">
                  <strong>{f.question}</strong>
                  <span className="office-addr">{f.answer}</span>
                </div>
                {f.published ? null : <Pill value="hidden" tone="warning" />}
                <div className="nav-row-acts">
                  <button type="button" className="icon-btn" disabled={i === 0 || !!q}
                          onClick={() => move(f, -1)} aria-label="Move up">
                    <Icon name="arrowUp" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" disabled={i === here.length - 1 || !!q}
                          onClick={() => move(f, 1)} aria-label="Move down">
                    <Icon name="arrowDown" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => togglePublished(f)}
                          aria-label={f.published ? "Hide from site" : "Show on site"}
                          title={f.published ? "Hide from site" : "Show on site"}>
                    <Icon name={f.published ? "eye" : "eyeOff"} width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => startEdit(f)} aria-label="Edit">
                    <Icon name="edit" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger"
                          onClick={() => remove(f)} aria-label="Delete">
                    <Icon name="trash" width="15" height="15" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title={editing ? "Edit question" : "New question"}>
        <form className="form-grid" id="faq-form" onSubmit={submit}>
          <label>
            Category
            <select value={form.category} required
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {!sortedCats.length ? <option value="">Add a category first</option> : null}
              {sortedCats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </label>

          <label className="check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={form.published}
                   onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Visible on the site
          </label>

          <label className="full">
            Question
            <input value={form.question} required maxLength={200}
                   placeholder="How long does delivery take?"
                   onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </label>

          <label className="full">
            Answer
            <textarea rows={5} value={form.answer} required
                      placeholder="In-stock pieces ship within 5–7 working days…"
                      onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            <small className="muted">
              Plain sentences. **bold**, *italic* and [a link](/appointment/) work. Keep it to a short paragraph or two.
            </small>
          </label>

          {form.answer.trim() ? (
            <div className="full md-preview md-preview--faq">
              <span className="md-preview-label">Preview</span>
              <strong className="md-preview-q">{form.question || "Question"}</strong>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(form.answer) }} />
            </div>
          ) : null}

          <div className="form-actions full">
            <button className="btn" type="submit" disabled={busy || !sortedCats.length}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add question"}
            </button>
            {editing ? <button type="button" className="btn btn--ghost" onClick={cancelEdit}>Cancel</button> : null}
          </div>
        </form>
      </Panel>

      <Panel title="Categories">
        <p className="panel-note">
          Each category is a separate list with its own questions. The slug is its address
          on the FAQs page — <code>/faqs/#gifts</code> — and how a page asks for it.
        </p>

        {loading ? <Skeleton rows={2} /> : sortedCats.length ? (
          <div className="office-list" style={{ marginBottom: 16 }}>
            {sortedCats.map((c, i) => (
              <div className={`office-row ${c.published ? "" : "is-off"}`} key={c.slug}>
                <div className="office-main">
                  <strong>{c.label}</strong>
                  <span className="office-addr">
                    /faqs/#{c.slug} · {counts[c.slug] || 0} question{counts[c.slug] === 1 ? "" : "s"}
                    {EMBEDDED_ON[c.slug] ? ` · also on ${EMBEDDED_ON[c.slug]}` : ""}
                  </span>
                </div>
                {c.published ? null : <Pill value="hidden" tone="warning" />}
                <div className="nav-row-acts">
                  <button type="button" className="icon-btn" disabled={i === 0}
                          onClick={() => moveCat(c, -1)} aria-label="Move up">
                    <Icon name="arrowUp" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" disabled={i === sortedCats.length - 1}
                          onClick={() => moveCat(c, 1)} aria-label="Move down">
                    <Icon name="arrowDown" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => startCatEdit(c)} aria-label="Edit">
                    <Icon name="edit" width="15" height="15" />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger"
                          onClick={() => removeCat(c)} aria-label="Delete">
                    <Icon name="trash" width="15" height="15" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <form className="form-grid" onSubmit={submitCat}>
          <label>
            {editingCat ? `Rename “${editingCat.label}”` : "New category"}
            <input value={catForm.label} required placeholder="High Jewellery"
                   onChange={(e) => setCatForm({
                     ...catForm,
                     label: e.target.value,
                     slug: slugTouched ? catForm.slug : slugify(e.target.value),
                   })} />
          </label>

          <label>
            Slug
            <input value={catForm.slug} required placeholder="high-jewellery"
                   onChange={(e) => { setSlugTouched(true); setCatForm({ ...catForm, slug: e.target.value }); }}
                   onBlur={() => setCatForm((c) => ({ ...c, slug: slugify(c.slug) }))} />
          </label>

          <label className="full">
            Introduction
            <input value={catForm.intro} placeholder="One line shown under the category's heading."
                   onChange={(e) => setCatForm({ ...catForm, intro: e.target.value })} />
          </label>

          <label className="check full">
            <input type="checkbox" checked={catForm.published}
                   onChange={(e) => setCatForm({ ...catForm, published: e.target.checked })} />
            Visible on the site
          </label>

          <div className="form-actions full">
            <button className="btn" type="submit" disabled={busy}>
              {editingCat ? "Save category" : "Add category"}
            </button>
            {editingCat ? <button type="button" className="btn btn--ghost" onClick={cancelCatEdit}>Cancel</button> : null}
          </div>
        </form>
      </Panel>

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
