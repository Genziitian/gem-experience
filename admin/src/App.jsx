import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { isConfigured, supabase } from "./lib/supabase.js";
import { record } from "./lib/activity.js";
import Shell from "./components/Shell.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Catalog from "./pages/Catalog.jsx";
import Orders from "./pages/Orders.jsx";
import Forms from "./pages/Forms.jsx";
import Quotations from "./pages/Quotations.jsx";
import Traffic from "./pages/Traffic.jsx";
import Seo from "./pages/Seo.jsx";
import Security from "./pages/Security.jsx";
import Setup from "./pages/Setup.jsx";
import Navigation from "./pages/Navigation.jsx";
import Offices from "./pages/Offices.jsx";
import Contact from "./pages/Contact.jsx";
import Media from "./pages/Media.jsx";
import Audit from "./pages/Audit.jsx";
import Activity from "./pages/Activity.jsx";
import People from "./pages/People.jsx";
import Gifts from "./pages/Gifts.jsx";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isConfigured()) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    /* SIGNED_IN also fires on a tab regaining focus and on a token refresh, so
       recording every one of them would log a dozen sign-ins for a single
       session. Only a genuine change of user counts. */
    let lastUser = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const id = s?.user?.id ?? null;
      if (event === "SIGNED_IN" && id && id !== lastUser) record("login");
      if (event === "SIGNED_OUT" && lastUser) record("logout");
      lastUser = id;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  if (!isConfigured()) return <Setup />;
  if (session === undefined) {
    return <div className="boot">Loading…</div>;
  }
  if (!session) return <Login />;

  const staff = profile && ["super_admin", "ops", "catalog"].includes(profile.role);
  if (profile && !staff) {
    return (
      <div className="boot">
        <p>This account is not staff. Set <code>role = super_admin</code> in Supabase → profiles.</p>
        <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <Shell profile={profile} email={session.user.email}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/users" element={<Navigate to="/people" replace />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/gifts" element={<Gifts />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/traffic" element={<Traffic />} />
        <Route path="/seo" element={<Seo />} />
        <Route path="/navigation" element={<Navigation />} />
        <Route path="/offices" element={<Offices />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/media" element={<Media />} />
        <Route path="/security" element={<Security />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/people" element={<People />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
