import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, forms: 0, quotes: 0, orders: 0, visitors: 0 });

  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [products, forms, quotes, orders, visitors] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("form_type", "quotation").in("status", ["new", "in_progress"]),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("analytics_sessions").select("id", { count: "exact", head: true }).gte("last_seen", since),
      ]);
      setStats({
        products: products.count || 0,
        forms: forms.count || 0,
        quotes: quotes.count || 0,
        orders: orders.count || 0,
        visitors: visitors.count || 0,
      });
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Dashboard</h1>
        <p>Catalog, quotations, forms, orders, and live visitors.</p>
      </header>
      <div className="stat-grid">
        <Link className="stat" to="/catalog"><span>Products</span><strong>{stats.products}</strong></Link>
        <Link className="stat" to="/quotations"><span>Active quotes</span><strong>{stats.quotes}</strong></Link>
        <Link className="stat" to="/forms"><span>New forms</span><strong>{stats.forms}</strong></Link>
        <Link className="stat" to="/orders"><span>Orders</span><strong>{stats.orders}</strong></Link>
        <Link className="stat" to="/traffic"><span>Visitors now</span><strong>{stats.visitors}</strong></Link>
      </div>
    </div>
  );
}
