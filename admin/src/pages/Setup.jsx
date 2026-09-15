import { configStatus } from "../lib/supabase.js";

export default function Setup() {
  const { reason } = configStatus();

  return (
    <div className="login">
      <div className="login-card">
        <span className="brand-kicker">Setup</span>
        <h1>Connect Supabase</h1>
        {reason ? <p className="err">{reason}</p> : null}
        <ol className="steps">
          <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a></li>
          <li>In SQL Editor, run every file in <code>migrations/</code> in order (by filename timestamp)</li>
          <li>Run <code>migrations/seed.sql</code></li>
          <li>Create an Auth user (email/password)</li>
          <li>In Table Editor → <code>profiles</code>, set that user’s <code>role</code> to <code>super_admin</code></li>
          <li>Copy Project URL + anon key into <code>admin/.env</code> (from <code>.env.example</code>)</li>
          <li>Restart <code>npm run dev</code> in <code>admin/</code></li>
        </ol>
      </div>
    </div>
  );
}
