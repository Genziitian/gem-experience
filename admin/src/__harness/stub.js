/* Minimal stand-in for the supabase client: enough of the query builder for
   the content pages to load, save and reorder against in-memory rows. */
const DB = {
  nav_items: [
    { id: "n1", parent_id: null, location: "primary", label: "High Jewellery", href: "high-jewellery/", is_heading: false, sort_order: 0, published: true },
    { id: "n2", parent_id: null, location: "primary", label: "Fine Jewellery", href: "fine-jewellery/", is_heading: false, sort_order: 1, published: true },
    { id: "n3", parent_id: "n2", location: "primary", label: "Bloom", href: "fine-jewellery/#/bloom", is_heading: false, sort_order: 0, published: true },
    { id: "n4", parent_id: "n2", location: "primary", label: "Safar", href: "fine-jewellery/#/safar", is_heading: false, sort_order: 1, published: true },
    { id: "n5", parent_id: null, location: "primary", label: "Gifts", href: null, is_heading: false, sort_order: 2, published: true },
    { id: "n6", parent_id: null, location: "secondary", label: "Contact us", href: "contact/", is_heading: false, sort_order: 0, published: true },
  ],
  offices: [
    { id: "o1", kind: "atelier", name: "Gem Experience, Dubai", region: "United Arab Emirates", address: "25H, 25th floor, Jumeirah Lake Towers, Dubai", phone: "+971 58 865 1095", tel: "+971588651095", image: "", map_query: "Gem Experience Dubai", sort_order: 0, published: true },
    { id: "o2", kind: "atelier", name: "Gem Experience, India", region: "India", address: "Plot No. 93, Tonk Road, Jaipur", phone: "+91 73000 43093", tel: "+917300043093", image: "", map_query: "Gem Experience Jaipur", sort_order: 1, published: true },
    { id: "o3", kind: "store", name: "Zanzibar Serena", region: null, address: "Shangani St, Zanzibar", phone: null, tel: null, image: "", map_query: "Zanzibar Serena", sort_order: 0, published: true },
  ],
  site_settings: [
    { key: "contact", value: { email: "contact@gem-experience.com", hours: "Monday to Saturday, 9am – 7pm", lines: [
      { region: "India", value: "+91 73000 43093", href: "https://wa.me/917300043093" },
      { region: "United Arab Emirates", value: "+971 58 865 1095", href: "https://wa.me/971588651095" },
    ] } },
  ],
  media: [
    { id: "m1", path: "offices/dubai-abc.jpg", url: "https://placehold.co/400", alt: "", width: 1600, height: 1600, bytes: 240000, mime: "image/jpeg", folder: "offices", created_at: new Date().toISOString() },
  ],
  audit_logs: [
    { id: 1, actor_id: "u1", action: "update", entity_type: "nav_items", entity_id: "n2", meta: { after: { label: "Fine Jewellery" } }, created_at: new Date().toISOString() },
    { id: 2, actor_id: "u1", action: "insert", entity_type: "offices", entity_id: "o3", meta: { after: { name: "Zanzibar Serena" } }, created_at: new Date(Date.now() - 6e5).toISOString() },
  ],
  profiles: [
    { id: "u1", full_name: "Asha Mehta", email: "asha@gem-experience.com", phone: "+91 98 0000 0001", role: "super_admin", status: "active", created_at: "2026-01-04T09:00:00Z" },
    { id: "u2", full_name: "Ravi Nair", email: "ravi@gem-experience.com", phone: null, role: "ops", status: "active", created_at: "2026-02-11T09:00:00Z" },
    { id: "u3", full_name: "Lina Farah", email: "lina@gem-experience.com", phone: null, role: "catalog", status: "active", created_at: "2026-03-02T09:00:00Z" },
    { id: "u4", full_name: "Sam Okoye", email: "sam@gem-experience.com", phone: null, role: "catalog", status: "blocked", created_at: "2026-04-21T09:00:00Z" },
    { id: "u5", full_name: "Priya Shah", email: "priya@example.com", phone: null, role: "customer", status: "active", created_at: "2026-05-30T09:00:00Z" },
    { id: "u6", full_name: null, email: "guest@example.com", phone: null, role: "customer", status: "active", created_at: "2026-06-15T09:00:00Z" },
  ],
  activity_log: [
    { id: 1, actor_id: "u1", created_at: new Date(Date.now() - 3e5).toISOString(), action: "login" },
    { id: 2, actor_id: "u2", created_at: new Date(Date.now() - 9e5).toISOString(), action: "login" },
    { id: 3, actor_id: "u3", created_at: new Date(Date.now() - 4e6).toISOString(), action: "login" },
  ],
  activity_feed: [
    { id: "activity:9", created_at: new Date(Date.now() - 6e4).toISOString(), actor_id: "u1", actor_email: "asha@gem-experience.com", actor_role: "super_admin", action: "login", area: null, detail: {}, source: "session" },
    { id: "audit:8", created_at: new Date(Date.now() - 12e4).toISOString(), actor_id: "u1", actor_email: "asha@gem-experience.com", actor_role: "super_admin", action: "role_change", area: "profiles", detail: { email: "sam@gem-experience.com", before: { role: "ops", status: "active" }, after: { role: "catalog", status: "active" } }, source: "change" },
    { id: "activity:7", created_at: new Date(Date.now() - 3e5).toISOString(), actor_id: "u2", actor_email: "ravi@gem-experience.com", actor_role: "ops", action: "view", area: "/catalog", detail: {}, source: "session" },
    { id: "audit:6", created_at: new Date(Date.now() - 9e5).toISOString(), actor_id: "u3", actor_email: "lina@gem-experience.com", actor_role: "catalog", action: "update", area: "nav_items", detail: { after: { label: "Fine Jewellery" } }, source: "change" },
    { id: "audit:5", created_at: new Date(Date.now() - 18e5).toISOString(), actor_id: "u3", actor_email: "lina@gem-experience.com", actor_role: "catalog", action: "delete", area: "offices", detail: { before: { name: "Old Stockist" } }, source: "change" },
    { id: "activity:4", created_at: new Date(Date.now() - 36e5).toISOString(), actor_id: "u2", actor_email: "ravi@gem-experience.com", actor_role: "ops", action: "logout", area: null, detail: {}, source: "session" },
  ],
};

let seq = 100;

function builder(table) {
  let rows = () => DB[table] || [];
  const filters = [];
  const api = {
    select() { return api; },
    order() { return api; },
    limit() { return api; },
    eq(col, val) { filters.push((r) => r[col] === val); return api; },
    in(col, vals) { filters.push((r) => vals.includes(r[col])); return api; },
    ilike(col, pat) { const s = pat.replace(/%/g, "").toLowerCase(); filters.push((r) => String(r[col] || "").toLowerCase().includes(s)); return api; },
    neq(col, val) { filters.push((r) => r[col] !== val); return api; },
    maybeSingle() { const d = rows().filter((r) => filters.every((f) => f(r))); return Promise.resolve({ data: d[0] || null, error: null }); },
    single() { const d = rows().filter((r) => filters.every((f) => f(r))); return Promise.resolve({ data: d[0] || null, error: null }); },
    insert(row) {
      const list = Array.isArray(row) ? row : [row];
      const made = list.map((r) => ({ ...r, id: r.id || "x" + (++seq), created_at: new Date().toISOString() }));
      DB[table] = [...(DB[table] || []), ...made];
      const res = { data: made[0], error: null, select: () => ({ single: () => Promise.resolve({ data: made[0], error: null }) }) };
      return Object.assign(Promise.resolve(res), res);
    },
    update(patch) {
      const done = { error: null };
      const p = Promise.resolve(done);
      p.eq = (col, val) => { DB[table] = DB[table].map((r) => (r[col] === val ? { ...r, ...patch } : r)); return Promise.resolve(done); };
      return p;
    },
    delete() {
      const p = { eq: (col, val) => { DB[table] = DB[table].filter((r) => r[col] !== val); return Promise.resolve({ error: null }); },
                  in: (col, vals) => { DB[table] = DB[table].filter((r) => !vals.includes(r[col])); return Promise.resolve({ error: null }); } };
      return p;
    },
    upsert(rowOrRows, opts) {
      const key = (opts && opts.onConflict) || "id";
      const list = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      list.forEach((r) => {
        const i = (DB[table] || []).findIndex((x) => x[key] === r[key]);
        if (i >= 0) DB[table][i] = { ...DB[table][i], ...r };
        else DB[table] = [...(DB[table] || []), { ...r, id: r.id || "x" + (++seq) }];
      });
      return Promise.resolve({ error: null });
    },
    then(res) {
      let d = rows().filter((r) => filters.every((f) => f(r)));
      return Promise.resolve({ data: d, error: null }).then(res);
    },
  };
  return api;
}

export const supabase = {
  from: builder,
  storage: { from: () => ({
    upload: () => Promise.resolve({ error: null }),
    getPublicUrl: (p) => ({ data: { publicUrl: "https://placehold.co/400?t=" + encodeURIComponent(p) } }),
    remove: () => Promise.resolve({ error: null }),
  }) },
  auth: { getUser: () => Promise.resolve({ data: { user: { id: new URLSearchParams(location.search).get("as") || "u1", email: "asha@gem-experience.com" } } }), getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
};
export function configStatus() { return { ok: true, reason: "" }; }
export function isConfigured() { return true; }
