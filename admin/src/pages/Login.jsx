import { useState } from "react";
import { supabase } from "../lib/supabase.js";

/* Sign in, or reset a forgotten password with the code Supabase emails (the
   same recovery code the storefront's sign-in uses, so one email template
   serves both). Verifying the code signs the person in; the new password is
   saved straight after, before the app swaps this screen for the dashboard. */
export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | forgot | code
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function go(next) {
    setMode(next);
    setError("");
    setNote("");
  }

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  }

  async function sendCode(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (err) { setError(err.message); return; }
    setMode("code");
    setNote(`We have emailed a code to ${email.trim()}. It expires in one hour.`);
  }

  async function savePassword(e) {
    e.preventDefault();
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The two passwords do not match."); return; }
    setBusy(true);
    setError("");
    const { error: vErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (vErr) {
      setBusy(false);
      setError(/expired|invalid/i.test(vErr.message) ? "That code is not right, or has expired. Check it, or send a new one." : vErr.message);
      return;
    }
    const { error: uErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (uErr) setError(uErr.message);
  }

  return (
    <div className="login">
      {mode === "signin" ? (
        <form className="login-card" onSubmit={signIn}>
          <span className="brand-kicker">Gem Experience</span>
          <h1>Admin sign in</h1>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error ? <p className="err">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <button type="button" className="linkish login-alt" onClick={() => go("forgot")}>Forgot password?</button>
        </form>
      ) : mode === "forgot" ? (
        <form className="login-card" onSubmit={sendCode}>
          <span className="brand-kicker">Gem Experience</span>
          <h1>Reset your password</h1>
          <p className="panel-note">Enter your staff email. We will send you a code to choose a new password.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          {error ? <p className="err">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
          <button type="button" className="linkish login-alt" onClick={() => go("signin")}>Back to sign in</button>
        </form>
      ) : (
        <form className="login-card" onSubmit={savePassword}>
          <span className="brand-kicker">Gem Experience</span>
          <h1>Choose a new password</h1>
          {note ? <p className="panel-note">{note}</p> : null}
          <label>
            Code from the email
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Confirm new password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          {error ? <p className="err">{error}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          <button type="button" className="linkish login-alt" onClick={sendCode} disabled={busy}>Send a new code</button>
          <button type="button" className="linkish login-alt" onClick={() => go("signin")}>Back to sign in</button>
        </form>
      )}
    </div>
  );
}
