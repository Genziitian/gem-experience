import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const { data, error: err } = await supabase
      .from("orders")
      .select("id, order_number, status, total_cents, currency, guest_email, created_at, payments(status, provider_payment_id)")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
    await supabase.from("audit_logs").insert({
      action: "order.status",
      entity_type: "orders",
      entity_id: id,
      meta: { status },
    });
    load();
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Orders & payments</h1>
        <p>Track order status and Razorpay payment ids when wired.</p>
      </header>
      {error ? <p className="err">{error}</p> : null}
      {!rows.length && !error ? <p className="muted">No orders yet.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pay = Array.isArray(r.payments) ? r.payments[0] : null;
              return (
                <tr key={r.id}>
                  <td>
                    <strong>{r.order_number}</strong>
                    <div className="muted">{r.guest_email || ""}</div>
                  </td>
                  <td><span className="pill">{r.status}</span></td>
                  <td>{r.currency} {(r.total_cents / 100).toFixed(2)}</td>
                  <td>{pay ? `${pay.status}${pay.provider_payment_id ? ` · ${pay.provider_payment_id}` : ""}` : "—"}</td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td className="actions">
                    <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                      <option value="pending_payment">pending_payment</option>
                      <option value="paid">paid</option>
                      <option value="enquiry">enquiry</option>
                      <option value="fulfilled">fulfilled</option>
                      <option value="cancelled">cancelled</option>
                      <option value="failed">failed</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
