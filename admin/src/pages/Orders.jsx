import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { Empty, Panel, Pill, Search, Skeleton, Toast } from "../components/ui.jsx";
import { useToast } from "../lib/useToast.js";
import { formatDateTime, formatMoney } from "../lib/format.js";

const STATUSES = ["pending_payment", "paid", "enquiry", "fulfilled", "cancelled", "failed"];

export default function Orders() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const { toast, show, dismiss } = useToast();

  async function load() {
    const { data, error: err } = await supabase
      .from("orders")
      .select("id, order_number, status, total_cents, currency, guest_email, created_at, payments(status, provider_payment_id)")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else { setRows(data || []); setError(""); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.order_number, r.guest_email].some((v) => (v || "").toLowerCase().includes(term)));
  }, [rows, q]);

  async function setStatus(id, status) {
    const { error: err } = await supabase.from("orders").update({ status }).eq("id", id);
    if (err) { show(err.message, false); return; }
    await supabase.from("audit_logs").insert({
      action: "order.status",
      entity_type: "orders",
      entity_id: id,
      meta: { status },
    });
    show("Order updated.");
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Orders &amp; payments</h1>
          <p>Track order status and Razorpay payment ids when wired.</p>
        </div>
        <Search value={q} onChange={setQ} placeholder="Search order # or email…" />
      </header>

      {error ? <p className="err">{error}</p> : null}

      {rows === null ? (
        <Panel><Skeleton rows={5} /></Panel>
      ) : !filtered.length ? (
        <Panel><Empty icon="orders" title={q ? "No orders match" : "No orders yet"}>
          {q ? "Try a different search." : "Orders created from checkout will land here."}
        </Empty></Panel>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th className="num">Total</th>
                <th>Payment</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pay = Array.isArray(r.payments) ? r.payments[0] : null;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="cell-strong">{r.order_number}</div>
                      <div className="cell-sub">{r.guest_email || ""}</div>
                    </td>
                    <td><Pill value={r.status} /></td>
                    <td className="num">{formatMoney(r.total_cents, r.currency)}</td>
                    <td>{pay ? `${pay.status}${pay.provider_payment_id ? ` · ${pay.provider_payment_id}` : ""}` : "—"}</td>
                    <td className="cell-sub">{formatDateTime(r.created_at)}</td>
                    <td className="actions">
                      <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
